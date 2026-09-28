import { arch, platform, release } from 'node:os'
import { siteMeta } from '~~/blog.config'
import type { SiteInfo } from '~~/shared/types/site'

/**
 * GET /api/site-info
 *
 * Statistics 页的构建信息与站点统计。
 *
 * 文章明细没有放在这里——页面本来就要拉 /api/posts 渲染日历，
 * 再返回一份是重复的；这里只给聚合结果。
 */
export default defineEventHandler(async (): Promise<SiteInfo> => {
  const { public: publicConfig } = useRuntimeConfig()
  const build = publicConfig.buildInfo

  const [posts, collections] = await Promise.all([listPosts(), listCollections()])

  const tags = new Set<string>()
  let words = 0
  let lastActive = ''

  for (const post of posts) {
    words += post.words
    for (const tag of post.tags) tags.add(tag)
    // ISO 日期字符串直接比大小即可，比转成 Date 再比更快也更稳
    if (post.date > lastActive) lastActive = post.date
  }

  return {
    build: {
      platform: build?.platform || '未知',
      blogVersion: build?.blogVersion || siteMeta.version,
      builtAt: build?.builtAt || '',
      license: siteMeta.license.name,
      licenseUrl: siteMeta.license.url,
      // Node 版本取服务端运行时——构建产物跑在哪个 Node 上，这里就报哪个
      node: process.version,
      bun: build?.bun || '',
      nuxt: build?.nuxt || '',
      vue: build?.vue || '',
      tailwind: build?.tailwind || '',
      os: `${platform()} / ${arch()} ${release()}`,
    },
    stats: {
      posts: posts.length,
      collections: collections.length,
      tags: tags.size,
      words,
      /** 建站日期，页面据此算运行时长 */
      since: siteMeta.since,
      /** 最近一篇文章的发布日期，空串表示还没有文章 */
      lastActive,
    },
  }
})
