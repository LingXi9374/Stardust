import type { Env, MarkdownIt as MarkdownItInstance, Token } from 'markdown-it'
import { markdown as markdownConfig } from '~~/blog.config'
import { ADMONITION_ALIASES, ADMONITION_ICONS, ADMONITION_LABELS, FALLBACK_ADMONITION_ICON } from './icons'

/**
 * 块级扩展。
 *
 * - `> [!NOTE] 标题`               GitHub / Obsidian / VitePress 风格提醒框
 * - `:::tip[标题]` / `:::warning`  Docusaurus 风格提醒框
 * - `:::details[摘要]`             可折叠区块
 * - `::: code-group labels=[a, b]` 标签页代码块
 * - `[grid]…[/grid]`               图片网格
 *
 * `:::` 容器规则是自己写的而不是用 markdown-it-container：
 * 后者的社区类型包还停留在旧的 markdown-it 命名空间风格，与 markdown-it 15
 * 自带的扁平类型声明冲突；规则本身只有几十行，自己写反而更可控（尤其是嵌套
 * 容器要按冒号个数配对这一点）。
 */

const FENCE_OPEN = /^(:{3,})\s*(.*)$/
const GRID_OPEN = /^\[grid\]\s*$/
const GRID_CLOSE = /^\[\/grid\]\s*$/
const NAME_PATTERN = /^[A-Za-z][\w-]*/

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char)
}

interface AdmonitionParts {
  type: string
  label: string
}

function resolveType(raw: string): AdmonitionParts | null {
  const base = ADMONITION_ALIASES[raw.toLowerCase()]
  if (!base) return null
  return { type: base, label: ADMONITION_LABELS[base] ?? raw }
}

function renderAdmonitionOpen(parts: AdmonitionParts, title: string): string {
  const icon = ADMONITION_ICONS[parts.type] ?? FALLBACK_ADMONITION_ICON
  const colorful = markdownConfig.admonitionsColorful ? ' adm--colorful' : ''
  const heading = title.trim() || parts.label

  return (
    `<div class="adm adm--${parts.type}${colorful}" data-type="${parts.type}">` +
    `<p class="adm-head"><span class="adm-icon">${icon}</span>` +
    `<span class="adm-title">${escapeHtml(heading)}</span></p>` +
    `<div class="adm-body">`
  )
}

const ADMONITION_CLOSE = '</div></div>'

/* ────────────────────────────────────────────────────────────────────
   `> [!NOTE] 标题`
   ──────────────────────────────────────────────────────────────────── */

/**
 * 从 inline token 的 children 头部剥掉 `[!NOTE] 标题\n`。
 * children 已按文本 / softbreak 切好，所以要按字符数逐个吃掉。
 */
function stripLeadingPrefix(inline: Token, length: number): void {
  const children = inline.children
  if (!children) return

  let remaining = length
  let index = 0

  while (index < children.length && remaining > 0) {
    const child = children[index]!

    if (child.type === 'text') {
      const take = Math.min(remaining, child.content.length)
      child.content = child.content.slice(take)
      remaining -= take
      if (child.content.length === 0) {
        children.splice(index, 1)
        continue
      }
      break
    }

    if (child.type === 'softbreak') {
      children.splice(index, 1)
      remaining = 0
      break
    }

    index += 1
  }
}

function registerAdmonitionQuote(md: MarkdownItInstance): void {
  md.core.ruler.push('stardust-admonition', (state) => {
    const tokens = state.tokens

    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i]?.type !== 'blockquote_open') continue

      // 结构固定为 blockquote_open → paragraph_open → inline
      const inline = tokens[i + 2]
      if (inline?.type !== 'inline') continue

      const match = /^\[!([A-Za-z][\w-]*)\][+-]?[ \t]*/.exec(inline.content)
      if (!match) continue

      const parts = resolveType(match[1]!)
      if (!parts) continue

      const newline = inline.content.indexOf('\n')
      const firstLineEnd = newline === -1 ? inline.content.length : newline
      const title = inline.content.slice(match[0].length, firstLineEnd)
      const prefixLength = newline === -1 ? inline.content.length : newline + 1

      stripLeadingPrefix(inline, prefixLength)

      const open = new state.Token('html_block', '', 0)
      open.content = renderAdmonitionOpen(parts, title)
      const close = new state.Token('html_block', '', 0)
      close.content = ADMONITION_CLOSE

      tokens[i] = open

      let depth = 1
      for (let j = i + 1; j < tokens.length; j += 1) {
        const token = tokens[j]!
        if (token.type === 'blockquote_open') depth += 1
        if (token.type === 'blockquote_close') {
          depth -= 1
          if (depth === 0) {
            tokens[j] = close
            break
          }
        }
      }
    }
  })
}

/* ────────────────────────────────────────────────────────────────────
   `:::` 容器
   ──────────────────────────────────────────────────────────────────── */

interface ContainerInfo {
  name: string
  title: string
  labels: string[]
}

function parseContainerInfo(raw: string): ContainerInfo {
  const text = raw.trim()
  const nameMatch = NAME_PATTERN.exec(text)
  const name = nameMatch ? nameMatch[0] : ''
  let rest = text.slice(name.length).trim()

  let title = ''
  const titleMatch = /^\[(.*)\]$/.exec(rest)
  if (titleMatch) {
    title = titleMatch[1]!.trim()
    rest = ''
  }

  const labels: string[] = []
  const labelsMatch = /labels=\[(.*?)\]/.exec(rest)
  if (labelsMatch) {
    labels.push(
      ...labelsMatch[1]!
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
  }

  return { name, title, labels }
}

/** 标签里写 :package: 这类短代码更省事 */
const EMOJI: Record<string, string> = {
  package: '📦',
  rocket: '🚀',
  sparkles: '✨',
  zap: '⚡',
  fire: '🔥',
  bulb: '💡',
  warning: '⚠️',
  lock: '🔒',
  globe: '🌐',
  gear: '⚙️',
  yarn: '🧶',
  dart: '🎯',
}

function expandEmoji(label: string): string {
  return label.replace(/:([a-z0-9_+-]+):/gi, (whole, name: string) => EMOJI[name.toLowerCase()] ?? whole)
}

/** 找与 idx 配对的容器收尾 token 的下标 */
function findContainerEnd(tokens: Token[], idx: number): number {
  let depth = 1
  for (let i = idx + 1; i < tokens.length; i += 1) {
    const token = tokens[i]!
    if (token.type === 'md_container_open') depth += 1
    if (token.type === 'md_container_close') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return tokens.length
}

/**
 * code-group 的 radio name 必须唯一（同名 radio 会跨组联动）。
 * 每次渲染前重置，保证同一份内容每次产出相同 HTML。
 */
let codeGroupSeq = 0

export function resetCodeGroupSeq(): void {
  codeGroupSeq = 0
}

/**
 * code-group 必须在 core 阶段整体替换成一个 html_block。
 *
 * 如果只在容器的开标签渲染里吐整组 HTML，markdown-it 之后仍会照常渲染
 * 内层那些 fence 与段落——结果是同样三块代码先以标签页形式出现一次，
 * 紧接着又在下面平铺一遍。
 */
function registerCodeGroup(md: MarkdownItInstance, renderFence: (token: Token) => string): void {
  md.core.ruler.push('stardust-code-group', (state) => {
    const tokens = state.tokens

    for (let i = 0; i < tokens.length; i += 1) {
      const open = tokens[i]
      if (open?.type !== 'md_container_open') continue
      if (parseContainerInfo(open.info ?? '').name !== 'code-group') continue

      const end = findContainerEnd(tokens, i)
      if (end >= tokens.length) continue

      const labels = parseContainerInfo(open.info ?? '').labels
      const html = buildCodeGroup(tokens.slice(i + 1, end), labels, state, renderFence)

      const block = new state.Token('html_block', '', 0)
      block.content = html
      block.map = open.map

      tokens.splice(i, end - i + 1, block)
      // 替换后同一位置已经是新块，从它之后继续扫
    }
  })

  // 兜底：core 规则没跑（理论上不会），至少不要把内层内容漏出来
  md.renderer.rules.md_container_open = (tokens, idx) => {
    const token = tokens[idx]!
    const { name, title } = parseContainerInfo(token.info ?? '')

    if (name === 'code-group') return ''

    if (name === 'details') {
      return `<details class="md-details"><summary>${escapeHtml(title || '点击展开')}</summary><div class="md-details-body">`
    }

    if (markdownConfig.admonitions) {
      const parts = resolveType(name)
      if (parts) return renderAdmonitionOpen(parts, title)
    }

    // 认不出的容器名：退化成普通区块，至少不丢内容
    return '<div class="md-box">'
  }

  md.renderer.rules.md_container_close = (tokens, idx) => {
    const { name } = parseContainerInfo(tokens[idx]?.info ?? '')

    if (name === 'code-group') return ''
    if (name === 'details') return '</div></details>'
    return ADMONITION_CLOSE
  }
}

function buildCodeGroup(
  inner: Token[],
  labels: string[],
  state: { md: MarkdownItInstance; env: Env },
  renderFence: (token: Token) => string,
): string {
  type Block = { kind: 'code'; html: string } | { kind: 'prose'; tokens: Token[] }
  const blocks: Block[] = []

  for (let i = 0; i < inner.length; i += 1) {
    const token = inner[i]!

    if (token.type === 'fence') {
      blocks.push({ kind: 'code', html: renderFence(token) })
      continue
    }

    // 段落包装与空行不单独成面板
    if (token.type === 'paragraph_open' || token.type === 'paragraph_close') continue
    if (token.type === 'inline' && token.content.trim() === '') continue

    const last = blocks[blocks.length - 1]
    if (last && last.kind === 'prose') last.tokens.push(token)
    else blocks.push({ kind: 'prose', tokens: [token] })
  }

  if (blocks.length === 0) return ''

  const groupName = `cg-${(codeGroupSeq += 1)}`

  // 窗口标题栏里那个空位子；有 title 的块会把它换成文件名
  const nameSlot = (html: string): string =>
    /<span class="cb-name cb-name--empty"><\/span>/.exec(html)?.[0] ?? ''

  /**
   * 标签栏放哪。
   *
   * 代码窗口的标题栏左侧本来就是个空位子（没写 title 时）。
   * 只要组内每个面板都是代码块、且都没写 title，就把标签栏塞进那个空位，
   * 省掉一整行多余的控件行；有 title 的组没地方放，标签栏就留在上方。
   */
  const mergeIntoBar =
    blocks.every((block) => block.kind === 'code' && nameSlot(block.html) !== '')

  const radios: string[] = []
  const labelsHtml: string[] = []
  const panels: string[] = []

  // 第一趟：先把标签全部定下来——面板里要嵌完整的一份标签栏，
  // 边生成标签边渲染面板的话，第一个面板只会拿到第一个标签
  blocks.forEach((block, i) => {
    const id = `${groupName}-${i}`

    let fallback = `内容 ${i + 1}`
    if (block.kind === 'code') {
      const lang = /data-lang="([^"]*)"/.exec(block.html)?.[1] ?? ''
      const title = /<span class="cb-name"[^>]*>([^<]*)</.exec(block.html)?.[1] ?? ''
      fallback = title || lang || `代码 ${i + 1}`
    }

    const label = expandEmoji(labels[i]?.trim() || fallback)

    radios.push(`<input class="cg-radio" type="radio" name="${groupName}" id="${id}"${i === 0 ? ' checked' : ''}>`)
    labelsHtml.push(`<label class="cg-tab" for="${id}">${escapeHtml(label)}</label>`)
  })

  const tabRow = `<div class="cg-tabs" role="tablist">${labelsHtml.join('')}</div>`

  // 第二趟：渲染面板
  blocks.forEach((block) => {
    let body =
      block.kind === 'code'
        ? block.html
        : state.md.renderer.render(block.tokens, state.md.options, state.env)

    if (mergeIntoBar && block.kind === 'code') {
      // 每个面板的标题栏里各放一份标签（只有当前面板可见，所以不会重复显示）
      body = body.replace(nameSlot(body), tabRow)
    }

    panels.push(`<div class="cg-panel">${body}</div>`)
  })

  return (
    `<div class="cg" data-count="${blocks.length}" data-tabs="${mergeIntoBar ? 'bar' : 'top'}">` +
    radios.join('') +
    (mergeIntoBar ? '' : tabRow) +
    `<div class="cg-panels">${panels.join('')}</div>` +
    `</div>`
  )
}

function registerContainers(md: MarkdownItInstance): void {
  md.block.ruler.before('fence', 'stardust_container', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine]! + state.tShift[startLine]!
    const max = state.eMarks[startLine]!
    const firstLine = state.src.slice(start, max)

    const match = FENCE_OPEN.exec(firstLine)
    if (!match) return false

    const marker = match[1]!
    const info = match[2]!.trim()
    if (!info) return false

    // 收尾必须是同样长度的冒号，嵌套容器才能正确配对
    const closePattern = new RegExp(`^:{${marker.length}}\\s*$`)
    let nextLine = startLine + 1
    let closed = false

    for (; nextLine < endLine; nextLine += 1) {
      const lineStart = state.bMarks[nextLine]! + state.tShift[nextLine]!
      const lineMax = state.eMarks[nextLine]!
      if (closePattern.test(state.src.slice(lineStart, lineMax).trimEnd())) {
        closed = true
        break
      }
    }

    if (!closed) return false
    if (silent) return true

    const open = state.push('md_container_open', 'div', 1)
    open.info = info
    open.markup = marker
    open.map = [startLine, nextLine]

    state.md.block.tokenize(state, startLine + 1, nextLine)

    const close = state.push('md_container_close', 'div', -1)
    // 收尾 token 也要带上名字，否则渲染时认不出这是哪个容器
    close.info = info
    close.markup = marker
    close.map = [nextLine, nextLine + 1]

    state.line = nextLine + 1
    return true
  })

  md.renderer.rules.md_container_open = (tokens, idx) => {
    const token = tokens[idx]!
    const { name, title } = parseContainerInfo(token.info ?? '')

    if (name === 'code-group') return ''

    if (name === 'details') {
      return `<details class="md-details"><summary>${escapeHtml(title || '点击展开')}</summary><div class="md-details-body">`
    }

    if (markdownConfig.admonitions) {
      const parts = resolveType(name)
      if (parts) return renderAdmonitionOpen(parts, title)
    }

    // 认不出的容器名：退化成普通区块，至少不丢内容
    return '<div class="md-box">'
  }

  md.renderer.rules.md_container_close = (tokens, idx) => {
    const { name } = parseContainerInfo(tokens[idx]?.info ?? '')

    if (name === 'code-group') return ''
    if (name === 'details') return '</div></details>'
    return ADMONITION_CLOSE
  }
}

/* ────────────────────────────────────────────────────────────────────
   `[grid]…[/grid]`
   ──────────────────────────────────────────────────────────────────── */

function registerGrid(md: MarkdownItInstance): void {
  md.block.ruler.before('fence', 'stardust_grid', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine]! + state.tShift[startLine]!
    const max = state.eMarks[startLine]!
    if (!GRID_OPEN.test(state.src.slice(start, max))) return false
    if (silent) return true

    let nextLine = startLine + 1
    let closed = false

    for (; nextLine < endLine; nextLine += 1) {
      const lineStart = state.bMarks[nextLine]! + state.tShift[nextLine]!
      const lineMax = state.eMarks[nextLine]!
      if (GRID_CLOSE.test(state.src.slice(lineStart, lineMax))) {
        closed = true
        break
      }
    }

    if (!closed) return false

    const open = state.push('grid_open', 'div', 1)
    open.attrSet('class', 'img-grid')
    open.map = [startLine, nextLine]

    state.md.block.tokenize(state, startLine + 1, nextLine)

    const close = state.push('grid_close', 'div', -1)
    close.map = [nextLine, nextLine + 1]

    state.line = nextLine + 1
    return true
  })

  md.renderer.rules.grid_open = () => '<div class="img-grid">'
  md.renderer.rules.grid_close = () => '</div>'
}

/* ──────────────────────────────────────────────────────────────────── */

export interface BlockExtensionOptions {
  /** 渲染单个 fence token；由调用方注入，因为它需要 Shiki 高亮器与图表配置 */
  renderFence: (token: Token) => string
}

export function registerBlockExtensions(md: MarkdownItInstance, options: BlockExtensionOptions): void {
  if (markdownConfig.admonitions) {
    registerAdmonitionQuote(md)
  }
  registerContainers(md)
  // core 规则要先于渲染跑；注册顺序不影响，ruler 会按阶段调用
  registerCodeGroup(md, options.renderFence)
  registerGrid(md)
}
