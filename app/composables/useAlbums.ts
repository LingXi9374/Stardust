import type { AlbumMeta } from '~~/shared/types/content'

export interface AlbumWithImages extends AlbumMeta {
  /** 素材 key 列表，按文件名自然排序 */
  images: string[]
  /** 实际用于封面的 key（可能来自 album.cover，也可能是第一张） */
  coverKey: string
  count: number
}

/**
 * 相册查询。
 *
 * 图片不写在配置里：清单里所有位于 `album.dir/` 之下的素材都会被收录，
 * 所以维护者只要往 assets/media/<dir>/ 里丢图片，相册就长出来了。
 */
export function useAlbums() {
  const { albums } = useAppConfig()
  const manifest = useMediaManifest()

  const resolved = computed<AlbumWithImages[]>(() =>
    (albums as readonly AlbumMeta[]).map((album) => {
      const images = Object.keys(manifest)
        .filter((key) => key.startsWith(`${album.dir}/`))
        // 自然序：01、02 … 10，而不是 01、10、02
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))

      return {
        slug: album.slug,
        title: album.title,
        description: album.description,
        dir: album.dir,
        images,
        coverKey: album.cover?.trim() || images[0] || '',
        count: images.length,
      }
    }),
  )

  function findBySlug(slug: string): AlbumWithImages | undefined {
    return resolved.value.find((album) => album.slug === slug)
  }

  return { albums: resolved, findBySlug }
}
