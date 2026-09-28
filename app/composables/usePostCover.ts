import { media as mediaConfig } from '~~/blog.config'

/**
 * 文章封面解析。
 *
 * - 文章在 frontmatter 里写了 `cover:` 就用它（本地素材 key 或图床链接）
 * - 没写则回落到随机图 API，URL 上带一个每（服务端）渲染一次的种子，
 *   所以手动刷新页面就会换一张
 *
 * 种子用 useState 是为了让服务端渲染的值随 payload 传到客户端，
 * 避免 hydration 前后 src 不一致。
 *
 * ⚠ 每篇文章的 URL 必须彼此不同。只用时间种子的话，同一页里所有无封面文章
 * 会命中同一个 URL，浏览器复用那份 302 与图片缓存，整页就变成同一张图。
 * 因此把 slug 一并拼进查询参数。
 */
export function usePostCover() {
  const { randomCover } = mediaConfig

  const seed = useState<number>('media:cover-seed', () => Date.now())

  /** 有自定义封面就用自定义的，否则给一张随机图。 */
  function coverOf(post: { cover?: string; slug?: string }): string {
    const explicit = post.cover?.trim()
    if (explicit) return explicit
    if (!randomCover.enabled) return ''

    const url = new URL(randomCover.endpoint)
    url.searchParams.set('r', `${seed.value}-${post.slug ?? 'post'}`)
    return url.toString()
  }

  return { coverOf }
}
