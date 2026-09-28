/**
 * 极简 YAML frontmatter 解析。
 *
 * 刻意不引入 gray-matter / js-yaml：模板只需要「键: 值」与「[a, b]」两种形式，
 * 少一个依赖就少一处升级负担。解析不了的行会被跳过，不会让整篇文章挂掉。
 */

export type FrontmatterValue = string | string[] | boolean
export type Frontmatter = Record<string, FrontmatterValue>

export const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/

function unquote(value: string): string {
  return value.replace(/^['"]|['"]$/g, '')
}

function parseScalar(value: string): FrontmatterValue {
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => unquote(item.trim()))
      .filter((item) => item.length > 0)
  }

  if (value === 'true') return true
  if (value === 'false') return false

  return unquote(value)
}

export function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = FRONTMATTER_PATTERN.exec(raw)
  if (!match) return { data: {}, body: raw }

  const data: Frontmatter = {}

  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = line.indexOf(':')
    if (separator <= 0) continue

    const key = line.slice(0, separator).trim()
    if (!key) continue

    data[key] = parseScalar(line.slice(separator + 1).trim())
  }

  return { data, body: raw.slice(match[0].length) }
}

export function asString(value: FrontmatterValue | undefined): string {
  return typeof value === 'string' ? value : ''
}

export function asArray(value: FrontmatterValue | undefined): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

export function asNumber(value: FrontmatterValue | undefined): number | undefined {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
