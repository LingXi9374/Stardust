import plantumlEncoder from 'plantuml-encoder'
import { diagrams as diagramConfig } from '~~/blog.config'
import type { GithubRepoInfo } from './inline'

/**
 * 图表与远程元数据。
 *
 * Mermaid：渲染阶段只输出占位与图表源码，浏览器端按需加载 mermaid 再画成 SVG。
 *   Mermaid 需要真实的 DOM 测量，在 Node 里跑要额外塞一套 DOM 与 canvas 垫片，
 *   不如把它放在浏览器里、并且只在页面真的出现图表时才下载——首屏不受影响。
 *
 * PlantUML：渲染阶段直接编码成服务端 SVG 地址，交给 <img> 加载，不需要任何客户端代码。
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

/** JSON 放进 <script> 里必须切断 </script> 序列 */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/')
}

/* ────────────────────────────────────────────────────────────────────
   Mermaid
   ──────────────────────────────────────────────────────────────────── */

export function renderMermaidBlock(source: string): string {
  const body =
    `<div class="dg-fallback">` +
    `<p class="dg-hint">图表由浏览器渲染，需要开启 JavaScript；下面是图表源码。</p>` +
    `<pre class="dg-source"><code>${escapeHtml(source)}</code></pre>` +
    `</div>`

  return (
    `<div class="dg dg--mermaid" data-diagram="mermaid">` +
    `<script type="application/json" class="dg-src">${safeJson({ code: source })}</script>` +
    body +
    `</div>`
  )
}

/* ────────────────────────────────────────────────────────────────────
   PlantUML
   ──────────────────────────────────────────────────────────────────── */

export function renderPlantumlBlock(source: string): string {
  if (!diagramConfig.plantuml.enabled) {
    return (
      `<div class="dg dg--plantuml dg--off">` +
      `<p class="dg-hint">PlantUML 渲染已在 blog.config.ts 中关闭。</p>` +
      `<pre class="dg-source"><code>${escapeHtml(source)}</code></pre>` +
      `</div>`
    )
  }

  let encoded = ''
  try {
    encoded = plantumlEncoder.encode(source)
  } catch {
    encoded = ''
  }

  if (!encoded) {
    return `<div class="dg dg--plantuml dg--off"><pre class="dg-source"><code>${escapeHtml(source)}</code></pre></div>`
  }

  const src = `${diagramConfig.plantuml.server.replace(/\/$/, '')}/svg/${encoded}`

  return (
    `<figure class="dg dg--plantuml">` +
    `<img src="${escapeHtml(src)}" alt="PlantUML 图表" loading="eager" decoding="async" ` +
    `referrerpolicy="no-referrer">` +
    `</figure>`
  )
}

/* ────────────────────────────────────────────────────────────────────
   GitHub 仓库信息
   ──────────────────────────────────────────────────────────────────── */

interface CacheEntry {
  value: GithubRepoInfo
  expires: number
}

const repoCache = new Map<string, CacheEntry>()
const CACHE_TTL = 30 * 60 * 1000

function fallbackInfo(repo: string): GithubRepoInfo {
  return {
    fullName: repo,
    description: '',
    stars: 0,
    forks: 0,
    language: '',
    license: '',
    url: `https://github.com/${repo}`,
    ok: false,
  }
}

async function fetchRepo(repo: string): Promise<GithubRepoInfo> {
  interface ApiRepo {
    full_name?: string
    description?: string | null
    stargazers_count?: number
    forks_count?: number
    language?: string | null
    html_url?: string
    license?: { spdx_id?: string | null } | null
  }

  const data = await $fetch<ApiRepo>(`https://api.github.com/repos/${repo}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'stardust-blog',
    },
    timeout: 6000,
  })

  return {
    fullName: data.full_name ?? repo,
    description: data.description ?? '',
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    language: data.language ?? '',
    license: data.license?.spdx_id && data.license.spdx_id !== 'NOASSERTION' ? data.license.spdx_id : '',
    url: data.html_url ?? `https://github.com/${repo}`,
    ok: true,
  }
}

/**
 * 渲染前把所有 `::github{repo="…"}` 一次性取回来。
 *
 * markdown-it 的渲染是同步的，而 GitHub API 是异步的，所以只能先取后渲染。
 * 结果进程内缓存 30 分钟；未认证的 API 每小时 60 次，超限时降级成静态卡片，
 * 不会让文章渲染失败。
 */
export async function prefetchGithubRepos(repos: string[]): Promise<Map<string, GithubRepoInfo>> {
  const result = new Map<string, GithubRepoInfo>()
  const now = Date.now()

  await Promise.all(
    repos.map(async (repo) => {
      const cached = repoCache.get(repo)
      if (cached && cached.expires > now) {
        result.set(repo, cached.value)
        return
      }

      try {
        const info = await fetchRepo(repo)
        repoCache.set(repo, { value: info, expires: now + CACHE_TTL })
        result.set(repo, info)
      } catch {
        // 网络不通或触发限流：记一个短 TTL 的降级结果，避免每次渲染都重试
        const info = fallbackInfo(repo)
        repoCache.set(repo, { value: info, expires: now + 60_000 })
        result.set(repo, info)
      }
    }),
  )

  return result
}
