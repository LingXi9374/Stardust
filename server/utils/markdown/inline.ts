import type { MarkdownIt as MarkdownItInstance, Token } from 'markdown-it'

/**
 * 行内扩展：
 * - `:spoiler[被隐藏的内容]` —— 剧透，内容仍按 Markdown 解析
 * - `::github{repo="owner/name"}` —— GitHub 仓库卡片
 */

/* ────────────────────────────────────────────────────────────────────
   剧透
   ──────────────────────────────────────────────────────────────────── */

const SPOILER_START = ':spoiler['

function registerSpoiler(md: MarkdownItInstance): void {
  md.inline.ruler.before('emphasis', 'stardust_spoiler', (state, silent) => {
    const start = state.pos
    if (!state.src.startsWith(SPOILER_START, start)) return false

    // 找到配对的 ]，允许内容里再出现 []（例如链接）
    let depth = 1
    let cursor = start + SPOILER_START.length
    while (cursor < state.posMax && depth > 0) {
      const char = state.src[cursor]
      if (char === '[') depth += 1
      else if (char === ']') depth -= 1
      cursor += 1
    }

    if (depth !== 0) return false
    if (silent) return true

    const content = state.src.slice(start + SPOILER_START.length, cursor - 1)

    const open = state.push('spoiler_open', 'span', 1)
    open.attrSet('class', 'spoiler')
    // 用 button 语义更贴切，但 span + tabindex 少一层浏览器默认样式
    open.attrSet('role', 'button')
    open.attrSet('tabindex', '0')
    open.attrSet('title', '点击或聚焦查看')

    const inner = state.push('spoiler_content_open', 'span', 1)
    inner.attrSet('class', 'spoiler-inner')

    state.md.inline.parse(content, state.md, state.env, state.tokens)

    state.push('spoiler_content_close', 'span', -1)
    state.push('spoiler_close', 'span', -1)

    state.pos = cursor
    return true
  })

  md.renderer.rules.spoiler_open = () => '<span class="spoiler" role="button" tabindex="0">'
  md.renderer.rules.spoiler_close = () => '</span>'
  md.renderer.rules.spoiler_content_open = () => '<span class="spoiler-inner">'
  md.renderer.rules.spoiler_content_close = () => '</span>'
}

/* ────────────────────────────────────────────────────────────────────
   GitHub 仓库卡片
   ──────────────────────────────────────────────────────────────────── */

export interface GithubRepoInfo {
  fullName: string
  description: string
  stars: number
  forks: number
  language: string
  license: string
  url: string
  /** 取不到数据时为 false，卡片退化成纯链接 */
  ok: boolean
}

export interface RenderEnv {
  headings: Array<{ id: string; text: string; level: 2 | 3 }>
  githubRepos?: Map<string, GithubRepoInfo>
}

const CARD_PATTERN = /^::github\{([^}]*)\}$/
const REPO_PATTERN = /repo\s*=\s*["']([^"']+)["']/

/** 从 Markdown 源码里扫出所有 ::github{repo="…"}，供渲染前预取 */
export function collectGithubRepos(source: string): string[] {
  const found = new Set<string>()
  for (const line of source.split('\n')) {
    const card = CARD_PATTERN.exec(line.trim())
    if (!card) continue
    const repo = REPO_PATTERN.exec(card[1] ?? '')
    if (repo?.[1]) found.add(repo[1])
  }
  return [...found]
}

function formatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(value)
}

const STAR_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/></svg>'

const FORK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<circle cx="6" cy="5" r="2.4"/><circle cx="18" cy="5" r="2.4"/><circle cx="12" cy="19" r="2.4"/>' +
  '<path d="M6 7.4v2.1a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.4M12 12.5v4.1"/></svg>'

const REPO_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v20H7.5A2.5 2.5 0 0 1 5 19.5Z"/><path d="M5 17.5h14"/></svg>'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

function renderGithubCard(repo: string, info: GithubRepoInfo | undefined): string {
  const name = info?.fullName ?? repo
  const description = info?.description ?? (info && !info.ok ? '仓库信息暂时取不到，点击前往 GitHub 查看。' : '')
  const url = info?.url ?? `https://github.com/${repo}`

  const stats: string[] = []
  if (info?.ok) {
    stats.push(`<span class="gh-stat">${STAR_ICON}${formatCount(info.stars)}</span>`)
    stats.push(`<span class="gh-stat">${FORK_ICON}${formatCount(info.forks)}</span>`)
    if (info.language) stats.push(`<span class="gh-lang">${escapeHtml(info.language)}</span>`)
    if (info.license) stats.push(`<span class="gh-license">${escapeHtml(info.license)}</span>`)
  }

  return (
    `<a class="gh-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">` +
    `<span class="gh-icon">${REPO_ICON}</span>` +
    `<span class="gh-main">` +
    `<span class="gh-name">${escapeHtml(name)}</span>` +
    (description ? `<span class="gh-desc">${escapeHtml(description)}</span>` : '') +
    `</span>` +
    (stats.length ? `<span class="gh-meta">${stats.join('')}</span>` : '') +
    `</a>`
  )
}

/**
 * 卡片独占一个段落，所以放在 core 阶段做整段替换：
 * 这样不会在段落里留下一层多余的 <p>。
 */
function registerGithubCard(md: MarkdownItInstance): void {
  md.core.ruler.push('stardust-github-card', (state) => {
    const tokens = state.tokens
    const repos = (state.env as unknown as RenderEnv).githubRepos

    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i]?.type !== 'paragraph_open') continue

      const inline = tokens[i + 1]
      const close = tokens[i + 2]
      if (inline?.type !== 'inline' || close?.type !== 'paragraph_close') continue

      const match = CARD_PATTERN.exec(inline.content.trim())
      if (!match) continue

      const repoMatch = REPO_PATTERN.exec(match[1] ?? '')
      if (!repoMatch?.[1]) continue

      const repo = repoMatch[1]
      const card = new state.Token('html_block', '', 0)
      card.content = renderGithubCard(repo, repos?.get(repo))
      card.map = inline.map

      tokens.splice(i, 3, card)
    }
  })
}

/* ──────────────────────────────────────────────────────────────────── */

export function registerInlineExtensions(md: MarkdownItInstance): void {
  registerSpoiler(md)
  registerGithubCard(md)
}
