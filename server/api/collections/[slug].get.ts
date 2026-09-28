import type { CollectionMeta } from '~~/shared/types/content'

/**
 * GET /api/collections/:slug
 *
 * 合集不存在时直接 404，让页面用状态码而不是「空列表」来表达这件事。
 */
export default defineEventHandler(async (event): Promise<CollectionMeta> => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const collection = await getCollection(slug)

  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: `合集不存在：${slug}` })
  }

  return collection
})
