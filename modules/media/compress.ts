import sharp from 'sharp'
import type { MediaFormat } from '../../shared/types/media'
import { avifQualityFor, webpQualityFor } from './quality'

/**
 * 图片压缩核心。
 *
 * 一次解码、按需缩放、按不同质量分别编码成 avif / webp。
 * 与 Nuxt 无关，可以单独调用（scripts/ 下的脚本就是这么用的）。
 */

export interface CompressOptions {
  format: MediaFormat | 'both'
  /** WebP 标尺上的质量 1–100 */
  quality: number
  /** 超过此宽度则等比缩小 */
  maxWidth: number
  avifEffort: number
  /** 覆盖换算值 */
  avifQuality?: number
  webpQuality?: number
}

export interface EncodedVariant {
  format: MediaFormat
  data: Buffer
  /** 实际使用的质量（avif 已按标定表换算过） */
  quality: number
}

export interface CompressResult {
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  resized: boolean
  variants: EncodedVariant[]
}

/** `both` 展开成两个格式；其余原样返回。 */
export function formatsOf(format: CompressOptions['format']): MediaFormat[] {
  return format === 'both' ? ['avif', 'webp'] : [format]
}

function qualityFor(format: MediaFormat, options: CompressOptions): number {
  if (format === 'avif') {
    return options.avifQuality ?? avifQualityFor(options.quality)
  }
  return options.webpQuality ?? webpQualityFor(options.quality)
}

/**
 * 压缩一张图。输入是原始字节，输出是各格式的编码结果。
 *
 * 注意 sharp 的实例只能出一次结果，所以每个格式都要 clone 一条独立管线。
 */
export async function compressImage(
  input: Buffer,
  options: CompressOptions,
): Promise<CompressResult> {
  // rotate() 无参 = 按 EXIF 方向自动摆正，否则手机拍的竖图会躺着
  const source = sharp(input, { failOn: 'none' }).rotate()
  const meta = await source.metadata()

  const originalWidth = meta.width ?? 0
  const originalHeight = meta.height ?? 0
  const resized = originalWidth > options.maxWidth

  const base = resized
    ? source.resize({ width: options.maxWidth, withoutEnlargement: true })
    : source

  const formats = formatsOf(options.format)

  const encoded = await Promise.all(
    formats.map(async (format) => {
      const quality = qualityFor(format, options)
      const pipeline = base.clone()

      const { data, info } =
        format === 'avif'
          ? await pipeline
              .avif({ quality, effort: options.avifEffort })
              .toBuffer({ resolveWithObject: true })
          : await pipeline.webp({ quality }).toBuffer({ resolveWithObject: true })

      return { format, quality, data, width: info.width, height: info.height }
    }),
  )

  const first = encoded[0]

  return {
    width: first?.width ?? originalWidth,
    height: first?.height ?? originalHeight,
    originalWidth,
    originalHeight,
    resized,
    variants: encoded.map(({ format, data, quality }) => ({ format, data, quality })),
  }
}
