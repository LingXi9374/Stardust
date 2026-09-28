/**
 * 下载模板自带的示例素材到 assets/media/。
 *
 * 图源是公开的随机图 API（https://t.alcy.cc），每次请求返回一张不同的插画。
 * 这些图仅用于演示排版与压缩管线；正式使用时请替换成你自己的图片，
 * 并注意原图作者的授权条款。
 *
 *   bun scripts/fetch-demo-media.ts          只补齐缺失的文件
 *   bun scripts/fetch-demo-media.ts --force  全部重新抓取
 *
 * 三处刻意的处理：
 * - **去重**：该 API 会重复返回同一张图，按内容哈希拦住
 * - **限制源图长边**：原图动辄 8000px、2MB，入仓太沉；压到 2200px 足够管线使用
 * - **横竖混排**：随机端点大量返回 16:9，全横图会让瀑布流退化成等宽网格
 */
import { createHash } from 'node:crypto'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const MEDIA = join(ROOT, 'assets', 'media')
const FORCE = process.argv.includes('--force')
const API = 'https://t.alcy.cc'

interface Job {
  /** 输出相对路径 */
  out: string
  /** 逐个尝试的端点，按偏好排序 */
  endpoints: string[]
  minWidth: number
  minHeight: number
  /** 裁成正方形时的边长 */
  square?: number
  /** 存盘前把长边压到这个值以内 */
  maxEdge: number
}

const LANDSCAPE = ['ys', 'ycy', 'moe', 'xhl', 'bd', 'fj', 'lai']
const PORTRAIT = ['mp']
const AVATAR = ['tx']

/** 横竖交替，瀑布流才有高低错落 */
function album(prefix: string, count: number, portraitEvery: number): Job[] {
  return Array.from({ length: count }, (_, i) => ({
    out: `${prefix}/${String(i + 1).padStart(2, '0')}.webp`,
    endpoints: i % portraitEvery === 0 ? PORTRAIT : LANDSCAPE,
    minWidth: 700,
    minHeight: 700,
    maxEdge: 2200,
  }))
}

const JOBS: Job[] = [
  // 头像不入此脚本：assets/media/avatar.webp 是人工挑好的固定素材，
  // 想换就自己替换那个文件（≥512x512）。
  // 友链头像
  ...Array.from({ length: 4 }, (_, i) => ({
    out: `friends/${String(i + 1).padStart(2, '0')}.webp`,
    endpoints: AVATAR,
    minWidth: 320,
    minHeight: 320,
    square: 400,
    maxEdge: 400,
  })),
  // 本地封面示例（演示「文章自定义封面」这条路径）
  { out: 'covers/hydrangea.webp', endpoints: LANDSCAPE, minWidth: 1280, minHeight: 720, maxEdge: 1920 },
  { out: 'covers/nightfall.webp', endpoints: LANDSCAPE, minWidth: 1280, minHeight: 720, maxEdge: 1920 },
  // 相册一：8 张
  ...album('albums/anime-moments', 8, 2),
  // 相册二：5 张
  ...album('albums/quiet-places', 5, 3),
]

const seen = new Set<string>()

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function fetchOne(endpoint: string) {
  const res = await fetch(`${API}/${endpoint}`)
  const contentType = res.headers.get('content-type') ?? ''

  // /acg 之类的端点会返回 video/mp4，必须按 content-type 过滤
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!contentType.startsWith('image/')) throw new Error(`content-type=${contentType}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  const hash = createHash('sha256').update(buffer).digest('hex')

  if (seen.has(hash)) throw new Error('重复图，换一张')

  const meta = await sharp(buffer).metadata()
  return { buffer, hash, width: meta.width ?? 0, height: meta.height ?? 0 }
}

/** 裁正方形 / 限制长边后以高质量 webp 存盘（q86，不是 nearLossless——后者能让单张涨到 3MB） */
async function prepare(job: Job, source: Buffer): Promise<Buffer> {
  let pipeline = sharp(source)

  if (job.square) {
    pipeline = pipeline.resize(job.square, job.square, { fit: 'cover' })
  } else {
    const meta = await pipeline.metadata()
    const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0)
    if (longEdge > job.maxEdge) {
      pipeline = pipeline.resize({ width: job.maxEdge, height: job.maxEdge, fit: 'inside' })
    }
  }

  return await pipeline.webp({ quality: 86 }).toBuffer()
}

let fetched = 0
let skipped = 0
let duplicates = 0
const failures: string[] = []

for (const job of JOBS) {
  const target = join(MEDIA, job.out)

  if (!FORCE && (await exists(target))) {
    skipped += 1
    continue
  }

  let saved = false
  const attempts = job.endpoints.length * 5

  for (let attempt = 0; attempt < attempts && !saved; attempt += 1) {
    const endpoint = job.endpoints[attempt % job.endpoints.length]!
    try {
      const image = await fetchOne(endpoint)
      if (image.width < job.minWidth || image.height < job.minHeight) continue

      const output = await prepare(job, image.buffer)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, output)

      seen.add(image.hash)
      const meta = await sharp(output).metadata()
      console.log(
        `  ${job.out.padEnd(34)} /${endpoint.padEnd(5)} ` +
          `${String(image.width).padStart(5)}x${String(image.height).padEnd(5)} -> ` +
          `${meta.width}x${meta.height}  ${(output.length / 1024).toFixed(0)}KB`,
      )
      saved = true
      fetched += 1
    } catch (error) {
      if ((error as Error).message.includes('重复图')) duplicates += 1
    }
  }

  if (!saved) failures.push(job.out)
}

console.log(`\n抓取 ${fetched} 张，跳过 ${skipped} 张（已存在），跳过重复 ${duplicates} 次`)
if (failures.length > 0) console.log(`失败 ${failures.length} 张：${failures.join(', ')}`)
