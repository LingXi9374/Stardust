import type { CollectionMeta } from '~~/shared/types/content'

/**
 * 合集查询。
 *
 * 合集不再是 app.config.ts 里的静态数组，而是服务端扫描 content/posts
 * 子文件夹的结果，所以这里走一次接口。用固定的 key 调 useAsyncData，
 * 同一页面里多处调用会共用同一次请求（Nuxt 按 key 去重）。
 */
const COLLECTIONS_KEY = 'stardust-collections'

export function useCollections() {
  const { data, refresh } = useAsyncData<CollectionMeta[]>(
    COLLECTIONS_KEY,
    () => $fetch<CollectionMeta[]>(collectionsEndpoint()),
    { default: () => [] },
  )

  const collections = computed(() => data.value ?? [])

  const bySlug = computed(
    () => new Map(collections.value.map((collection) => [collection.slug, collection])),
  )

  function find(slug: string): CollectionMeta | undefined {
    return bySlug.value.get(slug)
  }

  /** 还没取到合集时先显示 slug 本身，避免标题位置闪成空白。 */
  function nameOf(slug: string): string {
    return find(slug)?.name ?? slug
  }

  return { collections, find, nameOf, refresh }
}
