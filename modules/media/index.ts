import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'
import { media as mediaConfig } from '../../blog.config'
import type { MediaEntry, MediaFormat, MediaManifest } from '../../shared/types/media'
import { compressImage } from './compress'

/**
 * 构建期图片管线。
 *
 *   assets/media/**            ← 源图（入库）
 *        ↓ 压缩
 *   public/media/**            ← avif / webp 产物（不入库）
 *        ↓ 清单
 *   runtimeConfig.public.mediaManifest → <BlogImage> 查表出 <picture>
 *
 * 结果按「源文件签名 + 压缩设置」缓存，改设置会整体重编，只改一张图只重编那张。
 */

const SRC_DIR = 'assets/media'
const OUT_DIR = 'public/media'
const PUBLIC_BASE = '/media'
const CACHE_FILE = '.media-cache.json'

const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.gif'])

interface CacheRecord {
  /** 源文件的 mtime+size 签名 */
  source: string
  /** 压缩设置的哈希 */
  settings: string
  /** 产物相对 OUT_DIR 的路径 */
  outputs: string[]
  width: number
  height: number
}

type Cache = Record<string, CacheRecord>

function toPosix(path: string): string {
  return path.split(sep).join('/')
}

async function walk(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full)))
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(full)
    }
  }
  return files
}

async function readCache(root: string): Promise<Cache> {
  try {
    return JSON.parse(await readFile(join(root, CACHE_FILE), 'utf8')) as Cache
  } catch {
    return {}
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export interface BuildMediaResult {
  manifest: MediaManifest
  processed: number
  cached: number
  failed: string[]
  /** 产物总字节数，用于汇报压缩效果 */
  totalBytes: number
}

/** 全量扫描并构建清单。可被模块和独立脚本复用。 */
export async function buildMedia(root: string): Promise<BuildMediaResult> {
  const srcRoot = resolve(root, SRC_DIR)
  const outRoot = resolve(root, OUT_DIR)

  const settings = JSON.stringify({
    format: mediaConfig.format,
    quality: mediaConfig.quality,
    maxWidth: mediaConfig.maxWidth,
    avifEffort: mediaConfig.avifEffort,
    avifQuality: mediaConfig.avifQuality ?? null,
    webpQuality: mediaConfig.webpQuality ?? null,
  })
  const settingsHash = createHash('sha1').update(settings).digest('hex').slice(0, 12)

  const cache = await readCache(root)
  const nextCache: Cache = {}
  const manifest: MediaManifest = {}
  const failed: string[] = []

  let processed = 0
  let cached = 0
  let totalBytes = 0

  for (const file of await walk(srcRoot)) {
    const key = toPosix(relative(srcRoot, file)).replace(/\.[^.]+$/, '')
    const info = await stat(file)
    const sourceSig = `${info.mtimeMs}:${info.size}`

    const previous = cache[key]
    const canReuse =
      previous !== undefined &&
      previous.source === sourceSig &&
      previous.settings === settingsHash &&
      previous.outputs.length > 0 &&
      (await Promise.all(previous.outputs.map((o) => exists(join(outRoot, o))))).every(Boolean)

    if (canReuse && previous) {
      nextCache[key] = previous
      cached += 1

      const bytes: Partial<Record<MediaFormat, number>> = {}
      const variants: MediaEntry['variants'] = []
      for (const rel of previous.outputs) {
        const format = extname(rel).replace('.', '') as MediaFormat
        bytes[format] = (await stat(join(outRoot, rel))).size
        variants.push({ format, src: `${PUBLIC_BASE}/${rel}` })
      }

      const fallback = variants.find((v) => v.format === 'webp') ?? variants[0]
      if (fallback) {
        manifest[key] = {
          key,
          width: previous.width,
          height: previous.height,
          bytes,
          variants,
          fallback: fallback.src,
        }
        totalBytes += Object.values(bytes).reduce((sum, n) => sum + (n ?? 0), 0)
      }
      continue
    }

    try {
      const result = await compressImage(await readFile(file), {
        format: mediaConfig.format,
        quality: mediaConfig.quality,
        maxWidth: mediaConfig.maxWidth,
        avifEffort: mediaConfig.avifEffort,
        avifQuality: mediaConfig.avifQuality,
        webpQuality: mediaConfig.webpQuality,
      })

      const outputs: string[] = []
      const bytes: Partial<Record<MediaFormat, number>> = {}
      const variants: MediaEntry['variants'] = []

      for (const variant of result.variants) {
        const rel = `${key}.${variant.format}`
        const target = join(outRoot, rel)
        await mkdir(join(target, '..'), { recursive: true })
        await writeFile(target, variant.data)

        outputs.push(rel)
        bytes[variant.format] = variant.data.length
        variants.push({ format: variant.format, src: `${PUBLIC_BASE}/${rel}` })
      }

      // 回退图优先用 webp：不支持 avif 的浏览器比不支持 webp 的多
      const fallbackVariant = variants.find((v) => v.format === 'webp') ?? variants[0]
      if (!fallbackVariant) throw new Error('没有产生任何格式')

      nextCache[key] = {
        source: sourceSig,
        settings: settingsHash,
        outputs,
        width: result.width,
        height: result.height,
      }
      manifest[key] = {
        key,
        width: result.width,
        height: result.height,
        bytes,
        variants,
        fallback: fallbackVariant.src,
      }

      totalBytes += Object.values(bytes).reduce((sum, n) => sum + (n ?? 0), 0)
      processed += 1
    } catch (error) {
      failed.push(`${key}: ${(error as Error).message}`)
    }
  }

  await writeFile(join(root, CACHE_FILE), JSON.stringify(nextCache, null, 2), 'utf8')

  return { manifest, processed, cached, failed, totalBytes }
}

export default defineNuxtModule({
  meta: {
    name: 'stardust-media',
    configKey: 'stardustMedia',
  },

  async setup(_options, nuxt) {
    const root = nuxt.options.rootDir

    // `nuxt prepare`（每次 bun install 都会跑）不需要图片产物，跳过以免拖慢安装
    if (nuxt.options._prepare) {
      nuxt.options.runtimeConfig.public.mediaManifest = {}
      return
    }

    const run = async (reason: string) => {
      const started = Date.now()
      const result = await buildMedia(root)

      nuxt.options.runtimeConfig.public.mediaManifest = result.manifest

      const kb = (result.totalBytes / 1024).toFixed(0)
      console.log(
        `[media] ${reason}：新压缩 ${result.processed} 张、复用 ${result.cached} 张，` +
          `产物合计 ${kb}KB，用时 ${Date.now() - started}ms`,
      )

      if (result.failed.length > 0) {
        console.warn(`[media] ${result.failed.length} 张处理失败（已跳过，不阻断构建）：`)
        for (const line of result.failed) console.warn(`  - ${line}`)
      }

      return result
    }

    await run('构建期处理')

    if (nuxt.options.dev) {
      const { watch } = await import('node:fs')
      const srcRoot = resolve(root, SRC_DIR)
      await mkdir(srcRoot, { recursive: true })

      let timer: NodeJS.Timeout | null = null
      let previous = JSON.stringify(nuxt.options.runtimeConfig.public.mediaManifest)

      watch(srcRoot, { recursive: true }, () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(async () => {
          try {
            const result = await run('素材变更')
            const next = JSON.stringify(result.manifest)
            if (next !== previous) {
              previous = next
              await nuxt.callHook('restart')
            }
          } catch (error) {
            console.warn(`[media] 重新处理失败：${(error as Error).message}`)
          }
        }, 300)
      })
    }
  },
})
