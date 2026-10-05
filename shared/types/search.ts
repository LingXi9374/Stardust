/** 一条搜索命中。正文片段是纯文本，高亮由客户端按查询词自行切分。 */
export interface SearchHit {
  slug: string
  title: string
  description: string
  /** 所属合集的 slug；空字符串表示未归档 */
  collection: string
  collectionName: string
  date: string
  tags: string[]
  /** 首个命中位置附近的正文片段 */
  snippet: string
  /** 命中出现在哪些字段，用于向读者说明「为什么这篇会出现」 */
  matched: SearchField[]
}

export type SearchField = 'title' | 'description' | 'tag' | 'body'

export interface SearchResponse {
  query: string
  hits: SearchHit[]
  /** 命中总数，可能大于 hits.length（服务端会截断） */
  total: number
}
