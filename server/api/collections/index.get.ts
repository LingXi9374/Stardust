import type { CollectionMeta } from '~~/shared/types/content'

/**
 * GET /api/collections
 *
 * 合集由 content/posts 下的子文件夹决定，信息取自各文件夹里的
 * `_collection.md`（或 `_collection.txt`）。见 server/utils/collections.ts。
 */
export default defineEventHandler(async (): Promise<CollectionMeta[]> => {
  return listCollections()
})
