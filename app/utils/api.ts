/** 构造 /api/posts 的请求地址，参数由服务端负责筛选。 */
export function postsEndpoint(filter: { collection?: string; tag?: string } = {}): string {
  const params = new URLSearchParams()

  if (filter.collection) params.set('collection', filter.collection)
  if (filter.tag) params.set('tag', filter.tag)

  const query = params.toString()
  return query ? `/api/posts?${query}` : '/api/posts'
}

/** 合集列表。合集由 content/posts 下的子文件夹决定，见 server/utils/collections.ts。 */
export function collectionsEndpoint(): string {
  return '/api/collections'
}

/** 单个合集。不存在时服务端返回 404。 */
export function collectionEndpoint(slug: string): string {
  return `/api/collections/${encodeURIComponent(slug)}`
}

/** 站内搜索。查询词在服务端切分与匹配，见 server/utils/search.ts。 */
export function searchEndpoint(query: string, limit?: number): string {
  const params = new URLSearchParams({ q: query })
  if (limit !== undefined) params.set('limit', String(limit))
  return `/api/search?${params.toString()}`
}
