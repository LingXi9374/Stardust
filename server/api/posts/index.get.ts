import type { PostSummary } from '~~/shared/types/content'

/**
 * GET /api/posts
 *
 * 可选筛选参数：
 * - `collection=<slug>` 只看某个合集
 * - `tag=<tag>`         只看带有某个标签的文章
 *
 * 置顶优先、其后按日期倒序的排序由 listPosts() 保证。
 */
export default defineEventHandler(async (event): Promise<PostSummary[]> => {
  const query = getQuery(event)
  const collection = typeof query.collection === 'string' ? query.collection : ''
  const tag = typeof query.tag === 'string' ? query.tag : ''

  const posts = await listPosts()

  if (!collection && !tag) return posts

  return posts.filter((post) => {
    if (collection && post.collection !== collection) return false
    if (tag && !post.tags.includes(tag)) return false
    return true
  })
})
