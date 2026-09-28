import type { BundledLanguage, Highlighter, ThemedToken } from 'shiki'
import { codeBlocks as codeConfig } from '~~/blog.config'
import { DARK_THEME, LIGHT_THEME } from './theme'
import { parseFenceMeta, type FenceMeta, type MarkKind } from './meta'

/**
 * 代码块渲染。
 *
 * 不用 Shiki 的 codeToHtml，而是拿 codeToTokens 自己拼 HTML——因为需要：
 * - 每行一个元素，才能加行号、行标记、折叠分组
 * - 行号栏与代码列各自独立，折叠块插进中间也不会错位
 * - 终端 / 编辑器窗口框架
 *
 * 双主题沿用 Shiki 的 --shiki-light / --shiki-dark 变量约定，
 * 亮暗切换由 CSS 负责，不需要重新高亮。
 */

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

/**
 * ThemedToken.htmlStyle 是 { color, '--shiki-dark' } 形状。
 *
 * 这里把亮色也改写成自定义属性（color → --shiki-light），两套配色全部交给 CSS
 * 按模式选用。若保留 Shiki 原本的「亮色直接写 color」，暗色模式下就不得不靠
 * !important 去压内联样式——那正是之前暗色代码块看不见字的原因。
 */
function styleAttr(token: ThemedToken): string {
  const style = token.htmlStyle
  if (!style) return ''

  const parts: string[] = []
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined) continue
    parts.push(key === 'color' ? `--shiki-light:${value}` : `${key}:${value}`)
  }

  return parts.length > 0 ? ` style="${escapeHtml(parts.join(';'))}"` : ''
}

function renderTokens(line: ThemedToken[] | undefined): string {
  if (!line || line.length === 0) return ''
  return line.map((token) => `<span${styleAttr(token)}>${escapeHtml(token.content)}</span>`).join('')
}

/** 常见语言别名 → Shiki 的语法 id */
const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'tsx',
  md: 'markdown',
  node: 'javascript',
  ps: 'powershell',
  ps1: 'powershell',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  yml: 'yaml',
  zsh: 'bash',
}

function resolveAlias(lang: string): string {
  return LANG_ALIASES[lang] ?? lang
}

const COPY_ICON =  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="9" y="9" width="11" height="11" rx="2.5"/>' +
  '<path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>'

const CHECK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 12.5 9.5 18 20 6.5"/></svg>'

interface LineInfo {
  /** 显示用的行号 */
  display: number
  tokens: ThemedToken[]
  mark: MarkKind | null
  labels: string[]
}

/** 把标记区间摊平成「行 → 标记类型」。ins/del 优先于中性 mark。 */
function resolveMarks(meta: FenceMeta, lineCount: number): Map<number, { kind: MarkKind; labels: string[] }> {
  const result = new Map<number, { kind: MarkKind; labels: string[] }>()
  const priority: MarkKind[] = ['mark', 'del', 'ins']

  for (const kind of priority) {
    for (const range of meta.marks[kind]) {
      for (let line = range.from; line <= range.to; line += 1) {
        if (line < 1 || line > lineCount) continue
        const existing = result.get(line)
        const label = range.label ? [range.label] : []
        result.set(line, {
          kind,
          labels: existing ? [...existing.labels, ...label] : label,
        })
      }
    }
  }

  return result
}

function renderLine(info: LineInfo, showNumbers: boolean): string {
  const numberCell = showNumbers
    ? `<span class="cl-n" aria-hidden="true">${info.display}</span>`
    : '<span class="cl-n cl-n--off" aria-hidden="true"></span>'

  const labels = info.labels.length
    ? `<span class="cl-tags">${info.labels.map((t) => `<span class="cl-tag">${escapeHtml(t)}</span>`).join('')}</span>`
    : ''

  const attrs = [
    'class="cl"',
    `data-line="${info.display}"`,
    info.mark ? `data-mark="${info.mark}"` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return `<div ${attrs}>${numberCell}<span class="cl-c">${renderTokens(info.tokens)}${labels}</span></div>`
}

/** 把行按折叠区间切成「可见段」与「折叠段」 */
type Segment = { folded: boolean; lines: LineInfo[] }

function segment(lines: LineInfo[], collapsed: Set<number>, collapseAll: boolean): Segment[] {
  if (collapseAll) return lines.length > 0 ? [{ folded: true, lines }] : []

  const segments: Segment[] = []
  for (const line of lines) {
    const folded = collapsed.has(line.display)
    const last = segments[segments.length - 1]
    if (last && last.folded === folded) last.lines.push(line)
    else segments.push({ folded, lines: [line] })
  }
  return segments
}

export interface RenderedCode {
  html: string
  lang: string
  title: string
  frame: 'terminal' | 'code' | 'none'
  lineCount: number
}

function resolveFrame(meta: FenceMeta): 'terminal' | 'code' | 'none' {
  if (meta.frame !== 'auto') return meta.frame
  return codeConfig.terminalLanguages.includes(meta.lang) ? 'terminal' : 'code'
}

function resolveLineNumbers(meta: FenceMeta, lineCount: number, hasMarks: boolean): boolean {
  if (meta.showLineNumbers !== undefined) return meta.showLineNumbers
  if (codeConfig.lineNumbers === 'always') return true
  if (codeConfig.lineNumbers === 'never') return false
  // auto：行数够多、或存在行标记（此时行号是理解标记的锚点）就显示
  return lineCount >= codeConfig.lineNumbersThreshold || hasMarks
}

/** 语言名在角标里的显示：ps → PowerShell 之类的映射没必要，直接用原文 */
function displayLang(meta: FenceMeta): string {
  return meta.lang || 'text'
}

/**
 * 渲染一个代码围栏。
 * 语言不认识时回退成纯文本，而不是抛错让整页 500。
 */
export function renderCodeBlock(highlighter: Highlighter, code: string, info: string): RenderedCode {
  const meta = parseFenceMeta(info)
  const lang = meta.lang || 'text'

  const themes = { light: LIGHT_THEME, dark: DARK_THEME }

  let tokenLines: ThemedToken[][]
  let effectiveLang = lang

  try {
    // 别名先归一：js → javascript、ps → powershell…
    // Shiki 的 lang 是字面量联合类型，这里按运行时字符串传入；
    // 语言不在打包列表里时下面会回退成 text
    const resolved = resolveAlias(lang) as BundledLanguage
    tokenLines = highlighter.codeToTokens(code, { lang: resolved, themes }).tokens
  } catch {
    effectiveLang = 'text'
    tokenLines = highlighter.codeToTokens(code, { lang: 'text', themes }).tokens
  }

  // 末尾空行去掉，避免块尾多出一行空白
  while (tokenLines.length > 1) {
    const last = tokenLines[tokenLines.length - 1]
    if (last && last.length === 0) tokenLines.pop()
    else break
  }

  const lineCount = tokenLines.length
  const markMap = resolveMarks(meta, lineCount)
  const showNumbers = resolveLineNumbers(meta, lineCount, markMap.size > 0)

  const lines: LineInfo[] = tokenLines.map((tokens, index) => {
    const display = meta.startLineNumber + index
    const marked = markMap.get(display)
    return {
      display,
      tokens,
      mark: marked?.kind ?? null,
      labels: marked?.labels ?? [],
    }
  })

  const collapseAll = meta.collapseAll
  const body = segment(lines, meta.collapse, collapseAll)
    .map((seg) => {
      if (!seg.folded) return seg.lines.map((line) => renderLine(line, showNumbers)).join('')
      const inner = seg.lines.map((line) => renderLine(line, showNumbers)).join('')
      return (
        `<details class="cb-fold"><summary class="cb-fold-sum">` +
        `<span class="cb-fold-text">展开 ${seg.lines.length} 行</span>` +
        `<span class="cb-fold-hint" aria-hidden="true">↕</span>` +
        `</summary><div class="cb-fold-body">${inner}</div></details>`
      )
    })
    .join('')

  const frame = resolveFrame(meta)
  const wrap = meta.wrap ?? codeConfig.wrap

  const name = meta.title
    ? `<span class="cb-name" title="${escapeHtml(meta.title)}">${escapeHtml(meta.title)}</span>`
    : '<span class="cb-name cb-name--empty"></span>'

  const bar =
    frame === 'none'
      ? ''
      : `<div class="cb-bar">` +
        (frame === 'terminal'
          ? '<span class="cb-dots" aria-hidden="true"><i></i><i></i><i></i></span>'
          : '') +
        name +
        `<span class="cb-lang">${escapeHtml(displayLang(meta))}</span>` +
        (codeConfig.copyButton
          ? `<button class="cb-copy" type="button" data-cb-copy aria-label="复制代码">` +
            `${COPY_ICON}<span class="cb-copy-done" aria-hidden="true">${CHECK_ICON}</span></button>`
          : '') +
        `</div>`

  const html =
    `<div class="cb" data-frame="${frame}" data-lang="${escapeHtml(effectiveLang)}"` +
    ` data-wrap="${wrap ? 'true' : 'false'}" data-numbers="${showNumbers ? 'true' : 'false'}"` +
    ` data-terminal-dots="${codeConfig.terminalDots}"` +
    ` style="--cb-start:${meta.startLineNumber}">` +
    bar +
    `<div class="cb-body" tabindex="0" role="region" aria-label="${escapeHtml(meta.title || effectiveLang)} 代码">` +
    `<div class="cb-lines">${body}</div></div>` +
    `</div>`

  return {
    html,
    lang: effectiveLang,
    title: meta.title,
    frame,
    lineCount,
  }
}
