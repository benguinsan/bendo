import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'

const here = dirname(fileURLToPath(import.meta.url))

export const name = 'doro-persona'
export const inject = ['systemPrompt']

const sections: ReadonlyArray<{
  name: string
  order: number
  file: string
}> = [
  { name: 'doro:personality', order: 10, file: 'personality.md' },
  { name: 'doro:operations', order: 20, file: 'operations.md' },
  { name: 'doro:safety', order: 30, file: 'safety.md' },
]

export function apply(ctx: Context) {
  for (const section of sections) {
    const text = readFileSync(join(here, section.file), 'utf8').trim()
    if (!text) continue
    ctx.systemPrompt.section({
      name: section.name,
      order: section.order,
      text,
    })
  }
}
