/**
 * AVIF 与 WebP 的 quality 标尺换算。
 *
 * 两种编码器的 quality 参数含义并不相同，不能直接把同一个数字丢给它们。
 * 实测（scripts/benchmark-quality.ts，对真实素材做 PSNR 对比）：
 *
 *   webp q=72  ->  99KB
 *   avif q=72  -> 139KB   ← 同一数字，AVIF 反而大了 40%
 *
 * 也就是说，如果 `format: 'both'` 时不加处理，浏览器会优先选中 <source> 里
 * 排在前面的 AVIF，拿到一个比 WebP 还大的文件——这个功能就变成了负优化。
 *
 * 下面的表是**等 PSNR 点**：要让 AVIF 达到与 WebP 相同画质，它自己的 quality
 * 该取多少。数值由实测得出，中间做线性插值。
 * 重新标定：`bun scripts/benchmark-quality.ts`。
 */

/** [webpQuality, 等效的 avifQuality]，按 webpQuality 升序。 */
const EQUIVALENCE: ReadonlyArray<readonly [webp: number, avif: number]> = [
  [35, 32],
  [45, 40],
  [55, 47],
  [65, 53],
  [75, 58],
  [85, 66],
  [92, 75],
]

const MIN_QUALITY = 1
const MAX_QUALITY = 100

function clamp(value: number): number {
  return Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, Math.round(value)))
}

/**
 * 把 WebP 标尺上的质量换算成等画质的 AVIF 质量。
 * 表外做线性外推，并夹在 1–100。
 */
export function avifQualityFor(webpQuality: number): number {
  const q = Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, webpQuality))
  const first = EQUIVALENCE[0]!
  const last = EQUIVALENCE[EQUIVALENCE.length - 1]!

  if (q <= first[0]) {
    // 用首段的斜率向左外推
    const next = EQUIVALENCE[1] ?? first
    const slope = (next[1] - first[1]) / (next[0] - first[0])
    return clamp(first[1] + (q - first[0]) * slope)
  }

  if (q >= last[0]) {
    const prev = EQUIVALENCE[EQUIVALENCE.length - 2] ?? last
    const slope = (last[1] - prev[1]) / (last[0] - prev[0])
    return clamp(last[1] + (q - last[0]) * slope)
  }

  for (let i = 0; i < EQUIVALENCE.length - 1; i += 1) {
    const [x0, y0] = EQUIVALENCE[i]!
    const [x1, y1] = EQUIVALENCE[i + 1]!
    if (q >= x0 && q <= x1) {
      const t = (q - x0) / (x1 - x0)
      return clamp(y0 + t * (y1 - y0))
    }
  }

  return clamp(q)
}

/** WebP 一侧的换算：标尺本身就是它，只做范围收敛。 */
export function webpQualityFor(quality: number): number {
  return clamp(quality)
}
