/** 图片格式，与 blog.config.ts 的 MediaFormat 对齐。 */
export type MediaFormat = 'avif' | 'webp'

export interface MediaVariant {
  format: MediaFormat
  /** 站点根路径，例如 /media/albums/anime/01.avif */
  src: string
}

export interface MediaEntry {
  /** 相对 assets/media 的路径，不含扩展名。例如 "avatar"、"albums/anime/01" */
  key: string
  width: number
  height: number
  /** 各格式产物的字节数，便于维护者核对压缩效果 */
  bytes: Partial<Record<MediaFormat, number>>
  variants: MediaVariant[]
  /** <picture> 的最终回退图 */
  fallback: string
}

export type MediaManifest = Record<string, MediaEntry>
