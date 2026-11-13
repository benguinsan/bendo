import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import test from 'node:test'

import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { agentEvents } from '@deepseek-ai/dsh-agent'
import { apply } from './chat-bridge.ts'

test('Save switches a live model without changing an assembled step or resetting history', async (t) => {
  const agentCtx = new Context()
  await agentCtx.plugin(SystemPrompt)
  t.after(() => agentCtx.fiber.dispose())
  const credentials = new Map()
  const history = []
  let created = 0
  let providerSettings = {}
  let handler
  const agent = {
    session: { seq: 0 },
    whenIdle: async () => {},
    followup: (message) => history.push(message),
  }
  const services = {
    credentials: { set: async (ref, value) => credentials.set(ref, value) },
    settings: {
      get: () => ({ providers: providerSettings }),
      mutate: async (_namespace, ops) => {
        for (const op of ops) providerSettings[op.path[1]] = op.value
      },
    },
    agentDefaultModel: { saveSelection: async () => {} },
    agents: {
      create: async ({ setup }) => {
        created++
        setup(agentCtx)
        return { agent, dispose: async () => {} }
      },
    },
    sessions: { flush: async () => {} },
  }
  apply({
    ...services,
    get: (name) => services[name],
    effect: (setup) => setup(),
    webServer: { register: (route) => { handler = route.handler } },
  }, { path: '/bendo-chat', secret: 'regression-only', timeoutMs: 1000, maxBodyBytes: 10000 })
  const server = createServer((req, res) => void handler(req, res))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const port = server.address().port
  async function post(body) {
    const response = await fetch(`http://127.0.0.1:${port}/bendo-chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-bendo-chat-secret': 'regression-only' },
      body: JSON.stringify(body),
    })
    const payload = await response.json()
    assert.equal(response.status, 200, JSON.stringify(payload))
    return payload
  }
  async function save(provider, endpoint, model, apiKey) {
    assert.deepEqual(await post({ action: 'applyModelConfig', provider, endpoint, model, apiKey }), { ok: true })
  }
  async function assemble() {
    return (await agentCtx.systemPrompt.assemble()).variables
  }
  async function route() {
    return agentEvents(agentCtx, agent).waterfall(
      'agent/request', { turn: 1, step: 0, signal: new AbortController().signal },
      async () => ({ provider: 'seed', model: 'seed' }),
    )
  }

  await save('vilao', 'https://api.vilao.ai/v1', 'old-model', 'fake-key-one')
  const first = await post({ message: 'first message' })
  assert.ok(first.sessionId)
  assert.equal((await assemble()).model, 'old-model')
  assert.deepEqual(await route(), { provider: 'vilao', model: 'old-model' })

  // Save after assembly must not split the prompt and request for that step.
  await save('vilao', 'https://api.vilao.ai/v1', 'new-model', 'fake-key-two')
  assert.equal(credentials.get('VILAO_API_KEY'), 'fake-key-two')
  assert.deepEqual(await route(), { provider: 'vilao', model: 'old-model' })
  const second = await post({ message: 'second message', sessionId: first.sessionId })
  assert.equal(second.sessionId, first.sessionId)
  assert.equal(created, 1)
  assert.equal(history.length, 2)
  assert.equal((await assemble()).model, 'new-model')
  assert.deepEqual(await route(), { provider: 'vilao', model: 'new-model' })

  await save('gpt', 'https://api.openai.com/v1', 'other-provider-model', 'fake-key-three')
  assert.deepEqual(await route(), { provider: 'vilao', model: 'new-model' })
  await post({ message: 'third message', sessionId: first.sessionId })
  assert.equal(created, 1)
  assert.equal(history.length, 3)
  assert.equal(credentials.get('OPENAI_API_KEY'), 'fake-key-three')
  assert.equal((await assemble()).provider, 'openai')
  assert.deepEqual(await route(), { provider: 'openai', model: 'other-provider-model' })
})
