/**
 * Doro tools — call Bendo `app/api` (tasks, categories, notifications)
 * plus `doro_status` health check.
 *
 * Env (preferred for secrets):
 *   BENDO_API_BASE_URL  default http://localhost:3000
 *   BENDO_API_TOKEN     Clerk session JWT (required for authenticated routes)
 *
 * cordis.yml config on this plugin:
 *   baseUrl, token (token only if not using env)
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  activeBendoToken,
  bendoFetch,
  renderJson,
  resolveBendoApiConfig,
} from './bendo-api.ts'

export const name = 'doro-tools'
export const inject = ['tools']

export interface Config {
  /** Bendo app origin. Overridden by BENDO_API_BASE_URL when set. */
  baseUrl?: string
  /** Clerk session JWT. Prefer BENDO_API_TOKEN env over this field. */
  token?: string
}

export const Config: z<Config> = z.object({
  baseUrl: z.string().default('http://localhost:3000'),
  token: z.string().default(''),
})

const priorityEnum = ['low', 'moderate', 'extreme'] as const
const statusEnum = ['pending', 'completed'] as const

const jsonOutput = {
  schema: { type: 'json' as const },
  render: renderJson,
}

export function apply(ctx: Context, config: Config) {
  const api = resolveBendoApiConfig(config)

  ctx.tools.register(defineTool({
    name: 'doro_status',
    description:
      'Check that Doro tools are loaded and the Bendo API is reachable '
      + '(GET /api/tasks). Reports healthy / auth / unreachable.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          toolsLoaded: { type: 'boolean', required: true },
          baseUrl: { type: 'string', required: true },
          status: { type: 'integer', required: true },
          auth: {
            type: 'string',
            required: true,
            enum: ['ok', 'unauthorized', 'missing_token', 'unknown'],
          },
          message: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.ok
          ? `Doro healthy — Bendo API at ${value.baseUrl} (${value.message}).`
          : `Doro unhealthy — ${value.message} (${value.baseUrl}, HTTP ${value.status}).`,
      }],
    },
    async execute(_args, exec) {
      const token = activeBendoToken(api)
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`

      try {
        const response = await fetch(`${api.baseUrl}/api/tasks`, {
          method: 'GET',
          headers,
          signal: exec.signal,
        })

        if (response.ok) {
          return {
            ok: true,
            toolsLoaded: true,
            baseUrl: api.baseUrl,
            status: response.status,
            auth: 'ok' as const,
            message: 'API reachable and authenticated',
          }
        }

        if (response.status === 401) {
          return {
            ok: false,
            toolsLoaded: true,
            baseUrl: api.baseUrl,
            status: 401,
            auth: (token ? 'unauthorized' : 'missing_token') as 'unauthorized' | 'missing_token',
            message: token
              ? 'API reachable but token was rejected'
              : 'API reachable but BENDO_API_TOKEN / clerkToken is not set',
          }
        }

        return {
          ok: false,
          toolsLoaded: true,
          baseUrl: api.baseUrl,
          status: response.status,
          auth: 'unknown' as const,
          message: `API responded with HTTP ${response.status}`,
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        return {
          ok: false,
          toolsLoaded: true,
          baseUrl: api.baseUrl,
          status: 0,
          auth: 'unknown' as const,
          message: `Cannot reach Bendo API: ${detail}`,
        }
      }
    },
  }))

  // list all tasks
  ctx.tools.register(defineTool({
    name: 'list_tasks',
    description: 'List all tasks for the signed-in Bendo user.',
    parameters: {},
    output: jsonOutput,
    async execute(_args, exec) {
      return bendoFetch(api, '/api/tasks', { signal: exec.signal })
    },
  }))

  // get a task by UUID
  ctx.tools.register(defineTool({
    name: 'get_task',
    description: 'Get one Bendo task by UUID. Never invent task IDs.',
    parameters: {
      taskId: {
        type: 'string',
        required: true,
        description: 'Task UUID from list_tasks or a prior create/update.',
      },
    },
    output: jsonOutput,
    async execute(args, exec) {
      return bendoFetch(api, `/api/tasks/${args.taskId}`, { signal: exec.signal })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'create_task',
    description:
      'Create a Bendo task. date must be YYYY-MM-DD (today or future). '
      + 'Resolve relative phrases like "ngày mai" to YYYY-MM-DD before calling; do not ask for dd/mm/yyyy. '
      + 'priority is low | moderate | extreme. Optional categoryId must be a real category UUID.',
    parameters: {
      title: { type: 'string', required: true, description: 'Task title (required, non-empty).' },
      date: {
        type: 'string',
        required: true,
        description:
          'Scheduled calendar date as YYYY-MM-DD only. '
          + 'Convert relative dates using the current time context before calling.',
      },
      priority: {
        type: 'string',
        required: true,
        enum: [...priorityEnum],
        description: 'Task priority.',
      },
      description: { type: 'string', description: 'Optional task description.' },
      categoryId: {
        type: 'string',
        description: 'Optional category UUID. Omit if none.',
      },
    },
    output: jsonOutput,
    async execute(args, exec) {
      return bendoFetch(api, '/api/tasks', {
        method: 'POST',
        signal: exec.signal,
        body: {
          title: args.title,
          date: args.date,
          priority: args.priority,
          ...(args.description !== undefined ? { description: args.description } : {}),
          ...(args.categoryId !== undefined ? { categoryId: args.categoryId } : {}),
        },
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'update_task',
    description:
      'Partially update a Bendo task. Include at least one field besides taskId. '
      + 'status is pending | completed. Use real taskId only.',
    parameters: {
      taskId: { type: 'string', required: true, description: 'Task UUID to update.' },
      title: { type: 'string', description: 'New title.' },
      date: { type: 'string', description: 'New scheduled date YYYY-MM-DD.' },
      priority: {
        type: 'string',
        enum: [...priorityEnum],
        description: 'New priority.',
      },
      description: { type: 'string', description: 'New description.' },
      status: {
        type: 'string',
        enum: [...statusEnum],
        description: 'pending or completed.',
      },
      categoryId: {
        type: 'string',
        description: 'Category UUID, or empty string to clear the category.',
      },
    },
    output: jsonOutput,
    async execute(args, exec) {
      const body: {
        [key: string]: string | null
      } = {}
      if (args.title !== undefined) body.title = args.title
      if (args.date !== undefined) body.date = args.date
      if (args.priority !== undefined) body.priority = args.priority
      if (args.description !== undefined) body.description = args.description
      if (args.status !== undefined) body.status = args.status
      if (args.categoryId !== undefined) {
        body.categoryId = args.categoryId === '' ? null : args.categoryId
      }
      if (Object.keys(body).length === 0) {
        throw new Error('update_task requires at least one field to change besides taskId.')
      }
      return bendoFetch(api, `/api/tasks/${args.taskId}`, {
        method: 'PATCH',
        signal: exec.signal,
        body,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'delete_task',
    description: 'Soft-delete a Bendo task by UUID.',
    parameters: {
      taskId: { type: 'string', required: true, description: 'Task UUID to delete.' },
    },
    output: jsonOutput,
    async execute(args, exec) {
      return bendoFetch(api, `/api/tasks/${args.taskId}`, {
        method: 'DELETE',
        signal: exec.signal,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'list_categories',
    description: 'List all task categories for the signed-in Bendo user.',
    parameters: {},
    output: jsonOutput,
    async execute(_args, exec) {
      return bendoFetch(api, '/api/categories', { signal: exec.signal })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'create_category',
    description: 'Create a Bendo category. Name must be unique for the user (case-insensitive).',
    parameters: {
      name: { type: 'string', required: true, description: 'Category name.' },
    },
    output: jsonOutput,
    async execute(args, exec) {
      return bendoFetch(api, '/api/categories', {
        method: 'POST',
        signal: exec.signal,
        body: { name: args.name },
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'update_category',
    description: 'Rename a Bendo category by UUID.',
    parameters: {
      categoryId: { type: 'string', required: true, description: 'Category UUID.' },
      name: { type: 'string', required: true, description: 'New category name.' },
    },
    output: jsonOutput,
    async execute(args, exec) {
      return bendoFetch(api, `/api/categories/${args.categoryId}`, {
        method: 'PATCH',
        signal: exec.signal,
        body: { name: args.name },
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'delete_category',
    description: 'Delete a Bendo category by UUID.',
    parameters: {
      categoryId: { type: 'string', required: true, description: 'Category UUID to delete.' },
    },
    output: jsonOutput,
    async execute(args, exec) {
      return bendoFetch(api, `/api/categories/${args.categoryId}`, {
        method: 'DELETE',
        signal: exec.signal,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'list_notifications',
    description: 'List notifications for the signed-in Bendo user.',
    parameters: {},
    output: jsonOutput,
    async execute(_args, exec) {
      return bendoFetch(api, '/api/notifications', { signal: exec.signal })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'create_notification',
    description: 'Create a Bendo notification. Optional taskId links it to a task.',
    parameters: {
      title: { type: 'string', required: true, description: 'Notification title.' },
      body: { type: 'string', description: 'Optional notification body.' },
      taskId: { type: 'string', description: 'Optional related task UUID.' },
    },
    output: jsonOutput,
    async execute(args, exec) {
      return bendoFetch(api, '/api/notifications', {
        method: 'POST',
        signal: exec.signal,
        body: {
          title: args.title,
          ...(args.body !== undefined ? { body: args.body } : {}),
          ...(args.taskId !== undefined ? { taskId: args.taskId } : {}),
        },
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'mark_notification_read',
    description: 'Mark a Bendo notification as read by UUID.',
    parameters: {
      notificationId: {
        type: 'string',
        required: true,
        description: 'Notification UUID.',
      },
    },
    output: jsonOutput,
    async execute(args, exec) {
      return bendoFetch(api, `/api/notifications/${args.notificationId}`, {
        method: 'PATCH',
        signal: exec.signal,
      })
    },
  }))
}
