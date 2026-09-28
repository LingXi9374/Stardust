import type { MediaEntry, MediaManifest } from '~~/shared/types/media'

/**
 * 读取构建期生成的媒体清单。
 *
 * 清单由 modules/media 在构建时产出：key 是相对 assets/media 的路径（不含扩展名），
 * 值里带着尺寸与各格式产物的地址。
 */
export function useMediaManifest(): MediaManifest {
  const config = useRuntimeConfig()
  return (config.public.mediaManifest ?? {}) as MediaManifest
}

/** 按 key 取一条媒体记录；不存在返回 undefined。 */
export function useMedia(key: string): MediaEntry | undefined {
  return useMediaManifest()[key]
}

/** 判断一个 src 是图床/远程链接还是仓库本地素材。 */
export function isRemoteMedia(src: string): boolean {
  return /^(https?:)?\/\//i.test(src)
}
