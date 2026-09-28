/** Statistics 页展示的构建信息。全部在构建期求值或取自服务端运行时。 */
export interface BuildInfo {
  /** 构建平台：本地构建 / GitHub Actions / Vercel … */
  platform: string
  /** Blog 版本号，取自 package.json 的 version */
  blogVersion: string
  /** 构建时刻，ISO 字符串；无法获取时为空串 */
  builtAt: string
  /** 文章默认许可协议简称 */
  license: string
  /** 许可协议原文地址 */
  licenseUrl: string
  /** 服务端 Node 版本，形如 v24.18.0 */
  node: string
  /** Bun 版本，形如 1.4.2；未知时为空串 */
  bun: string
  /** Nuxt 版本，取自 package.json */
  nuxt: string
  /** Vue 版本 */
  vue: string
  /** Tailwind CSS 版本 */
  tailwind: string
  /** 系统信息，形如 win32 / x64 10.0.26100 */
  os: string
}

/** 站点统计的聚合结果。文章明细由 /api/posts 提供。 */
export interface SiteStats {
  posts: number
  collections: number
  tags: number
  /** 总字数：CJK 按字、拉丁按词 */
  words: number
  /** 建站日期 YYYY-MM-DD */
  since: string
  /** 最近一篇文章的发布日期；没有文章时为空串 */
  lastActive: string
}

export interface SiteInfo {
  build: BuildInfo
  stats: SiteStats
}
