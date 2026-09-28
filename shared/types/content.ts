/** 文章正文中的一个可锚定标题（仅 h2 / h3 进入目录）。 */
export interface TocHeading {
  id: string
  text: string
  level: 2 | 3
}

/**
 * 合集元信息。
 * 合集由 content/posts 下的子文件夹决定，这里的信息来自该文件夹里的
 * `_collection.md`（或 `_collection.txt`），不再在 app.config.ts 中声明。
 */
export interface CollectionMeta {
  /** 文件夹名 */
  slug: string
  /** 展示名，取自元信息的 title，缺省时回退为 slug */
  name: string
  description: string
  /** 排序权重，取自元信息的 order；没写就排在最后 */
  order: number
}

/** 社交 / 平台跳转入口。icon 为图标键名，由组件映射到具体图标。 */
export interface SocialLink {
  label: string
  href: string
  icon: string
}

/** 相册。图片本身不在此列出——assets/media 里对应目录下有什么，相册就展示什么。 */
export interface AlbumMeta {
  slug: string
  title: string
  description: string
  /** 相对 assets/media 的目录名，例如 albums/anime-moments */
  dir: string
  /** 封面素材 key；留空则用目录里排序第一张 */
  cover?: string
}

/** 列表场景使用的文章摘要。 */
export interface PostSummary {
  slug: string
  title: string
  description: string
  /** ISO 日期，形如 2026-01-12 */
  date: string
  /**
   * 最后更新日期，同为 ISO 格式。frontmatter 没写就是空字符串，
   * 展示层会退回用 `date`。文章页的过时提示按这个字段判断。
   */
  updated: string
  /** 所属合集的 slug（即 content/posts 下的文件夹名）；空字符串表示未归档 */
  collection: string
  /** 所属合集的展示名，随摘要一起下发，详情页不必再查一次合集列表 */
  collectionName: string
  tags: string[]
  pinned: boolean
  /** 封面：本地素材 key 或图床链接；空字符串表示未定义，将回落到随机图 */
  cover: string
  /** 预估阅读分钟数，基准 265 WPM（拉丁）/ 300 字/分钟（CJK） */
  readingMinutes: number
  /** 总字数：CJK 按字、拉丁按词。Statistics 页使用 */
  words: number
}

/** 相邻文章引用，用于详情页底部导航。 */
export interface PostNeighbour {
  slug: string
  title: string
}

/** 文章详情：摘要字段 + 已渲染正文 + 目录。 */
export interface PostDetail extends PostSummary {
  html: string
  headings: TocHeading[]
  prev: PostNeighbour | null
  next: PostNeighbour | null
}
