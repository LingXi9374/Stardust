import MarkdownIt from 'markdown-it'
import type { Env, MarkdownIt as MarkdownItInstance, RendererRule, Token } from 'markdown-it'
import KatexPlugin from '@vscode/markdown-it-katex'
import { createHighlighter, type Highlighter } from 'shiki'
import type { TocHeading } from '~~/shared/types/content'
import { diagrams as diagramConfig } from '~~/blog.config'
import { registerBlockExtensions, resetCodeGroupSeq } from './blocks'
import { collectGithubRepos, registerInlineExtensions, type RenderEnv } from './inline'
import { prefetchGithubRepos, renderMermaidBlock, renderPlantumlBlock } from './diagram'
import { renderCodeBlock } from './code'
import { BASE_THEME, DARK_THEME, LIGHT_THEME, buildThemes } from './theme'

type KatexPluginFn = (md: MarkdownItInstance, options?: Record<string, unknown>) => MarkdownItInstance

/**
 * @vscode/markdown-it-katex 是 CommonJS 包，导出形状是 `exports.default = fn`。
 * 在 ESM 语境下会被多包一层 default，所以两种形状都要接住。
 */
const katexPlugin: KatexPluginFn =
  typeof KatexPlugin === 'function'
    ? (KatexPlugin as unknown as KatexPluginFn)
    : ((KatexPlugin as unknown as { default: KatexPluginFn }).default)

/**
 * Markdown 渲染管线。
 *
 * - 语法高亮：Shiki，亮暗双主题（AGENTS.md 4.6 要求用 Shiki）
 * - 代码块：自建行级 HTML，支持行号 / 行标记 / 折叠 / 终端与编辑器窗口 / 标签页
 * - 扩展语法：提醒框、KaTeX、Mermaid、PlantUML、剧透、图片网格、GitHub 卡片
 * - 同时产出 h2 / h3 目录，供文章页左侧栏使用
 *
 * 高亮器按需惰性创建并进程内复用。
 */

const LANGS = [
  'ansi',
  'bash',
  'c',
  'cpp',
  'css',
  'diff',
  'docker',
  'go',
  'graphql',
  'html',
  'http',
  'ini',
  'java',
  'javascript',
  'json',
  'kotlin',
  'less',
  'lua',
  'markdown',
  'nginx',
  'php',
  'powershell',
  'python',
  'ruby',
  'rust',
  'sass',
  'scss',
  'sql',
  'swift',
  'toml',
  'tsx',
  'typescript',
  'vue',
  'xml',
  'yaml',
] as const

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

/** 这些语言不参与高亮，走各自的渲染器 */
const SPECIAL_FENCES = new Set(['mermaid', 'plantuml'])

/** Shiki 没打包 powershell 语法，别名指过来时退回纯文本 */
const HIGHLIGHT_LANGS = new Set<string>([...LANGS])

let highlighterPromise: Promise<Highlighter> | null = null
let rendererPromise: Promise<MarkdownItInstance> | null = null

/**
 * 建高亮器：先加载蓝本主题，再由它派生亮暗两套并注册进去。
 * 两套配色的色相一一对应，切换主题时语法高亮不会「换一套」。
 */
async function createThemedHighlighter(): Promise<Highlighter> {
  const highlighter = await createHighlighter({
    themes: [BASE_THEME],
    langs: [...LANGS],
  })

  const { light, dark } = buildThemes(highlighter.getTheme(BASE_THEME))

  // loadTheme 是异步的，漏掉 await 会让后面的 codeToTokens 找不到主题
  await highlighter.loadTheme(light)
  await highlighter.loadTheme(dark)

  return highlighter
}

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createThemedHighlighter()
  return highlighterPromise
}

function resolveLang(lang: string): string | null {
  const normalized = lang.trim().toLowerCase()
  if (!normalized) return null
  const resolved = LANG_ALIASES[normalized] ?? normalized
  return HIGHLIGHT_LANGS.has(resolved) ? resolved : null
}

/** 生成锚点 id：保留 CJK 与字母数字，其余折叠为连字符 */
function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'section'
}

function createRenderer(highlighter: Highlighter): MarkdownItInstance {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    // 代码高亮自己接管，这里不再设置 highlight 选项
  })

  /** 渲染单个 fence：图表走各自的渲染器，其余进代码块管线 */
  const renderFence = (token: Token): string => {
    const info = token.info.trim()
    const lang = (info.split(/\s+/)[0] ?? '').toLowerCase()

    if (lang === 'mermaid' && diagramConfig.mermaid) {
      return renderMermaidBlock(token.content)
    }

    if (lang === 'plantuml') {
      return renderPlantumlBlock(token.content)
    }

    // 语言不认识时 renderCodeBlock 内部会回退成纯文本，
    // 但角标仍然显示作者写的那个名字
    return renderCodeBlock(highlighter, token.content, info).html
  }

  // ── 数学公式 ──
  // throwOnError: false —— 公式写错时原样显示，而不是让整页渲染失败
  md.use(katexPlugin, { throwOnError: false })

  // ── 代码围栏 ──
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    return token ? renderFence(token) : ''
  }

  // ── 块级与行内扩展 ──
  registerBlockExtensions(md, { renderFence })
  registerInlineExtensions(md)

  // ── 目录收集 ──
  md.core.ruler.push('stardust-headings', (state) => {
    const env = state.env as unknown as RenderEnv
    env.headings = []
    const seen = new Map<string, number>()

    for (let index = 0; index < state.tokens.length; index += 1) {
      const token = state.tokens[index]
      if (token?.type !== 'heading_open') continue

      const level = Number(token.tag.slice(1))
      if (level !== 2 && level !== 3) continue

      const inline = state.tokens[index + 1]
      if (inline?.type !== 'inline') continue

      const text = inline.content.trim()
      if (!text) continue

      const base = slugify(text)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)

      const id = count === 0 ? base : `${base}-${count}`
      token.attrSet('id', id)
      env.headings.push({ id, text, level })
    }
  })

  // ── 站外链接新开标签页 ──
  const defaultLinkOpen: RendererRule =
    md.renderer.rules.link_open ??
    ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))

  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const href = String(tokens[index]?.attrGet('href') ?? '')
    if (/^https?:\/\//i.test(href)) {
      tokens[index]?.attrSet('target', '_blank')
      tokens[index]?.attrSet('rel', 'noopener noreferrer')
    }
    return defaultLinkOpen(tokens, index, options, env, self)
  }

  // 图片：走媒体清单，本地素材自动升级成多格式 <picture>；
  // 远程图补上 referrerpolicy，防盗链图床才不会回 403
  const defaultImage: RendererRule =
    md.renderer.rules.image ??
    ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))

  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index]
    if (!token) return ''

    const src = String(token.attrGet('src') ?? '')
    const alt = token.content || String(token.attrGet('alt') ?? '')

    // 不是 http(s) 也不是 / 开头，就当成 assets/media 里的素材 key
    if (!/^(https?:)?\/\//i.test(src) && !src.startsWith('/')) {
      const entry = mediaManifest()[src]
      if (entry) {
        const sources = entry.variants
          .map((variant) => `<source srcset="${variant.src}" type="image/${variant.format}">`)
          .join('')

        return (
          `<picture>${sources}<img data-photo src="${entry.fallback}" alt="${escapeAttr(alt)}" ` +
          `width="${entry.width}" height="${entry.height}" loading="eager" decoding="async" ` +
          `referrerpolicy="no-referrer"></picture>`
        )
      }
    }

    if (!token.attrGet('referrerpolicy')) {
      token.attrSet('referrerpolicy', 'no-referrer')
    }
    if (!token.attrGet('loading')) {
      token.attrSet('loading', 'lazy')
    }
    // 正文图片参与文章照片查看器（封面由页面单独标记）
    token.attrSet('data-photo', '')

    return defaultImage(tokens, index, options, env, self)
  }

  return md
}

function escapeAttr(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      default:
        return '&quot;'
    }
  })
}

/** 媒体清单在构建期由 modules/media 写进 runtimeConfig.public */
function mediaManifest(): Record<
  string,
  {
    width: number
    height: number
    fallback: string
    variants: Array<{ format: string; src: string }>
  }
> {
  const config = useRuntimeConfig()
  return (config.public.mediaManifest ?? {}) as never
}

async function getRenderer(): Promise<MarkdownItInstance> {
  rendererPromise ??= getHighlighter().then(createRenderer)
  return rendererPromise
}

export async function renderMarkdown(
  source: string,
): Promise<{ html: string; headings: TocHeading[] }> {
  const md = await getRenderer()

  // markdown-it 的渲染是同步的，GitHub 卡片却要联网，所以先取数据再渲染
  const repos = await prefetchGithubRepos(collectGithubRepos(source))

  const env: RenderEnv = { headings: [], githubRepos: repos }
  // 标签页的 radio name 每次渲染都从头编号，保证输出稳定
  resetCodeGroupSeq()

  const html = md.render(source, env as Env & RenderEnv)
  return { html, headings: env.headings }
}
