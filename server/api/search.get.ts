import type { SearchResponse } from '~~/shared/types/search'

/**
 * GET /api/search?q=<查询>&limit=<条数>
 *
 * 在全部文章的标题与正文里检索。查询按空白切词，每个词都要出现才算命中，
 * 具体规则见 server/utils/search.ts。
 *
 * 查询过短（单个西文字母）时返回空结果而不是让客户端自己去判断，
 * 免得把「为什么没结果」的逻辑分散到两处。
 */
export default defineEventHandler(async (event): Promise<SearchResponse> => {
  const query = getQuery(event)
  const raw = typeof query.q === 'string' ? query.q : ''
  const limit = Number.parseInt(String(query.limit ?? ''), 10)

  const { hits, total } = await searchPosts(raw, {
    limit: Number.isFinite(limit) ? limit : undefined,
  })

  return { query: raw, hits, total }
})
