/**
 * 代码围栏的 meta 解析。
 *
 * 支持 expressive-code 风格的写法：
 *
 *   ```js title="app.js" showLineNumbers {1,4,7-8} ins={3-4} del={2} wrap collapse={1-5}
 *   ```bash frame="code" startLineNumber=5
 *   ```js {"第 1 步":5-6} del={"移除这段":8-10}
 *
 * 全部字段都是可选的，缺省时由 blog.config.ts 里的策略决定。
 */

export type MarkKind = 'mark' | 'ins' | 'del'

export interface MetaRange {
  from: number
  to: number
  /** 带标签的标记，例如 {"说明":5-6} */
  label?: string
}

export interface FenceMeta {
  lang: string
  title: string
  /** auto 表示按语言推断；none 表示不要窗口框架 */
  frame: 'auto' | 'code' | 'terminal' | 'none'
  /** undefined 表示交给全局策略决定 */
  showLineNumbers?: boolean
  startLineNumber: number
  /** undefined 表示交给全局策略决定 */
  wrap?: boolean
  /** 默认折叠的行号（已展开成具体行号集合） */
  collapse: Set<number>
  /** 是否整块默认折叠 */
  collapseAll: boolean
  marks: Record<MarkKind, MetaRange[]>
}

/** 拆一行 meta：按空白切分，但引号内的空白不算分隔符 */
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: string | null = null

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]!

    if (quote) {
      current += char
      if (char === quote && input[i - 1] !== '\\') quote = null
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }

    // {} 内部可能带空格，整体视为一个 token
    if (char === '{') {
      let depth = 0
      let block = ''
      while (i < input.length) {
        const c = input[i]!
        if (c === '{') depth += 1
        if (c === '}') depth -= 1
        block += c
        i += 1
        if (depth === 0) break
      }
      i -= 1
      current += block
      continue
    }

    if (/\s/.test(char)) {
      if (current) tokens.push(current)
      current = ''
      continue
    }

    current += char
  }

  if (current) tokens.push(current)
  return tokens
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/** 按顶层逗号切分，引号内的逗号不算分隔符 */
function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let current = ''
  let quote: string | null = null

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]!

    if (quote) {
      current += char
      if (char === quote && input[i - 1] !== '\\') quote = null
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }

    if (char === ',') {
      parts.push(current)
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) parts.push(current)
  return parts
}

/** 解析 `{1, 4, 7-8}` / `{"说明":5-6}` 的内容 */
function parseRanges(body: string): MetaRange[] {
  const ranges: MetaRange[] = []

  for (const rawPart of splitTopLevel(body)) {
    const part = rawPart.trim()
    if (!part) continue

    // 带标签： "文本":5-6
    const labeled = /^(["'])((?:\\.|(?!\1).)*)\1\s*:\s*(.+)$/.exec(part)
    const label = labeled ? labeled[2] : undefined
    const rangeText = labeled ? labeled[3]! : part

    const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(rangeText.trim())
    if (!match) continue

    const from = Number(match[1])
    const to = match[2] ? Number(match[2]) : from
    ranges.push({ from: Math.min(from, to), to: Math.max(from, to), label })
  }

  return ranges
}

function expand(ranges: MetaRange[]): Set<number> {
  const lines = new Set<number>()
  for (const range of ranges) {
    for (let i = range.from; i <= range.to; i += 1) lines.add(i)
  }
  return lines
}

export function parseFenceMeta(info: string): FenceMeta {
  const tokens = tokenize(info.trim())
  const lang = (tokens.shift() ?? '').toLowerCase()

  const meta: FenceMeta = {
    lang,
    title: '',
    frame: 'auto',
    startLineNumber: 1,
    collapse: new Set(),
    collapseAll: false,
    marks: { mark: [], ins: [], del: [] },
  }

  const collapseRanges: MetaRange[] = []

  for (const token of tokens) {
    // 裸 {1,4} = 中性标记
    if (token.startsWith('{')) {
      meta.marks.mark.push(...parseRanges(token.slice(1, -1)))
      continue
    }

    const eq = token.indexOf('=')
    const key = (eq === -1 ? token : token.slice(0, eq)).trim()
    const rawValue = eq === -1 ? '' : token.slice(eq + 1)

    switch (key) {
      case 'title':
      case 'filename':
        meta.title = unquote(rawValue)
        break

      case 'frame': {
        const value = unquote(rawValue)
        if (value === 'code' || value === 'terminal' || value === 'none' || value === 'auto') {
          meta.frame = value
        }
        break
      }

      case 'showLineNumbers':
        meta.showLineNumbers = unquote(rawValue) !== 'false'
        break

      case 'startLineNumber': {
        const n = Number(unquote(rawValue))
        if (Number.isFinite(n) && n > 0) meta.startLineNumber = Math.floor(n)
        break
      }

      case 'wrap':
        meta.wrap = unquote(rawValue) !== 'false'
        break

      case 'collapse':
        if (rawValue.startsWith('{')) {
          collapseRanges.push(...parseRanges(rawValue.slice(1, -1)))
        } else {
          // 裸 collapse（含 collapse=true）表示整块默认折叠
          meta.collapseAll = unquote(rawValue) !== 'false'
        }
        break

      case 'mark':
      case 'ins':
      case 'del':
        if (rawValue.startsWith('{')) {
          meta.marks[key].push(...parseRanges(rawValue.slice(1, -1)))
        }
        break

      default:
        // 未知键静默忽略，避免第三方语法把整块搞崩
        break
    }
  }

  meta.collapse = expand(collapseRanges)
  return meta
}
