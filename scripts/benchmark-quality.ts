/**
 * 标定 AVIF 与 WebP 的质量换算表。
 *
 * 两种编码器的 quality 不是同一把尺子。直接给同一个数字，AVIF 在中高质量段
 * 反而会比 WebP 更大——`format: 'both'` 时浏览器优先选 AVIF，就成了负优化。
 *
 * 这个脚本对 assets/media 里的真实素材做 PSNR 对比，找出「等画质点」，
 * 结果写进 modules/media/quality.ts 的 EQUIVALENCE 表。
 *
 *   bun scripts/benchmark-quality.ts
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const MEDIA = join(process.cwd(), 'assets', 'media')
const WIDTH = 1200

/** PSNR：与原图逐像素比较，越高越接近。经验上 0.5dB 的差别人眼就能察觉。 */
function psnr(reference: Buffer, candidate: Buffer): number {
  let mse = 0
  for (let i = 0; i < reference.length; i += 1) {
    const delta = (reference[i] ?? 0) - (candidate[i] ?? 0)
    mse += delta * delta
  }
  mse /= reference.length
  if (mse === 0) return 99
  return 10 * Math.log10((255 * 255) / mse)
}

async function pickSamples(): Promise<string[]> {
  const candidates: string[] = []
  for (const dir of ['albums/anime-moments', 'covers', '.']) {
    try {
      const entries = await readdir(join(MEDIA, dir))
      for (const name of entries) {
        if (name.endsWith('.webp')) candidates.push(join(dir, name))
      }
    } catch {
      // 目录不存在就跳过
    }
  }
  return candidates.slice(0, 6)
}

async function encode(source: string, format: 'avif' | 'webp', quality: number): Promise<{ data: Buffer; db: number }> {
  const pipeline = sharp(source).resize(WIDTH, null, { withoutEnlargement: true })
  const data = await (format === 'avif'
    ? pipeline.avif({ quality, effort: 4 }).toBuffer()
    : pipeline.webp({ quality }).toBuffer())
  return { data, db: 0 }
}

const samples = await pickSamples()
if (samples.length === 0) {
  console.error('assets/media 下没有素材，先跑 bun scripts/fetch-demo-media.ts')
  process.exit(1)
}

console.log(`样本 ${samples.length} 张，统一缩到 ${WIDTH}px 宽后比较\n`)

// 逐质量、逐格式累计「每 KB 的画质」，多张图取平均更稳
const QUALITIES = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 92]
const table = new Map<string, { db: number; bytes: number }>()

for (const quality of QUALITIES) {
  for (const format of ['webp', 'avif'] as const) {
    let dbSum = 0
    let byteSum = 0

    for (const sample of samples) {
      const path = join(MEDIA, sample)
      const meta = await sharp(path).metadata()
      const scale = Math.min(1, WIDTH / (meta.width ?? WIDTH))
      const width = Math.round((meta.width ?? WIDTH) * scale)
      const height = Math.round((meta.height ?? WIDTH) * scale)

      const reference = await sharp(path)
        .resize(width, height, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer()

      const pipeline = sharp(path).resize(width, height, { fit: 'fill' })
      const encoded = await (format === 'avif'
        ? pipeline.avif({ quality, effort: 4 }).toBuffer()
        : pipeline.webp({ quality }).toBuffer())

      const decoded = await sharp(encoded).removeAlpha().raw().toBuffer()
      dbSum += psnr(reference, decoded)
      byteSum += encoded.length
    }

    table.set(`${format}:${quality}`, { db: dbSum / samples.length, bytes: byteSum / samples.length })
  }

  const w = table.get(`webp:${quality}`)!
  const a = table.get(`avif:${quality}`)!
  console.log(
    `q=${String(quality).padStart(3)}  webp ${w.db.toFixed(2)}dB ${(w.bytes / 1024).toFixed(0).padStart(4)}KB` +
      `   avif ${a.db.toFixed(2)}dB ${(a.bytes / 1024).toFixed(0).padStart(4)}KB`,
  )
}

// 对每个 webp 质量，找 PSNR 最接近的 avif 质量
console.log('\n=== 等 PSNR 换算表（可直接粘进 modules/media/quality.ts）===')
const pairs: Array<[number, number]> = []
for (const wq of [35, 45, 55, 65, 75, 85, 92]) {
  const target = table.get(`webp:${wq}`)
  if (!target) continue

  let best = 0
  let bestDelta = Number.POSITIVE_INFINITY
  for (const aq of QUALITIES) {
    const delta = Math.abs((table.get(`avif:${aq}`)?.db ?? 0) - target.db)
    if (delta < bestDelta) {
      bestDelta = delta
      best = aq
    }
  }

  const avif = table.get(`avif:${best}`)!
  pairs.push([wq, best])
  console.log(
    `  [${wq}, ${best}],  // webp q=${wq} (${target.db.toFixed(2)}dB, ${(target.bytes / 1024).toFixed(0)}KB)` +
      ` -> avif q=${best} (${avif.db.toFixed(2)}dB, ${(avif.bytes / 1024).toFixed(0)}KB)` +
      `  省 ${((1 - avif.bytes / target.bytes) * 100).toFixed(0)}%`,
  )
}
