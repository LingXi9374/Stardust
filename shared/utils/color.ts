/**
 * 颜色计算工具：HSL 转换与 WCAG 对比度。
 *
 * 放在 shared/ 下是因为三处都要用：
 * - server/utils/markdown/theme.ts 派生代码高亮双主题
 * - shared/utils/diagram-theme.ts 定义图表分类色板并挑标签色
 * - scripts/ 下的校验脚本
 *
 * 颜色一律写成 #rrggbb，不支持缩写与带 alpha 的形式。
 */

export interface Hsl {
  h: number
  s: number
  l: number
}

export function hexToHsl(hex: string): Hsl | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null

  const value = parseInt(match[1]!, 16)
  const r = ((value >> 16) & 255) / 255
  const g = ((value >> 8) & 255) / 255
  const b = (value & 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) return { h: 0, s: 0, l }

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let h: number
  if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / delta + 2) / 6
  else h = ((r - g) / delta + 4) / 6

  return { h, s, l }
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hue2rgb = (p: number, q: number, t: number): number => {
    let value = t
    if (value < 0) value += 1
    if (value > 1) value -= 1
    if (value < 1 / 6) return p + (q - p) * 6 * value
    if (value < 1 / 2) return q
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6
    return p
  }

  let r: number
  let g: number
  let b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (channel: number): string =>
    Math.round(Math.min(1, Math.max(0, channel)) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function colorLuminance(hex: string): number {
  const value = parseInt(hex.replace('#', ''), 16)
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const v = channel / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

/** WCAG 2.x 对比度，返回 1–21 */
export function contrastRatio(a: string, b: string): number {
  const la = colorLuminance(a)
  const lb = colorLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** 在一组候选里挑出与该底色对比度最高的那个 */
export function bestForeground(background: string, candidates: readonly string[]): string {
  return candidates.reduce(
    (best, candidate) =>
      contrastRatio(candidate, background) > contrastRatio(best, background) ? candidate : best,
    candidates[0]!,
  )
}
