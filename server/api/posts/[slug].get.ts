import type { PostDetail } from '~~/shared/types/content'

/** GET /api/posts/:slug —— 文章详情（含已渲染 HTML 与目录）。 */
export default defineEventHandler(async (event): Promise<PostDetail> => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const post = await getPost(slug)

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  return post
})
