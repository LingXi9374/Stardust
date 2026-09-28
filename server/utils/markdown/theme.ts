import type { ThemeRegistration } from 'shiki'
// 刻意用相对路径而不是 ~~/ 别名：这个文件会被 scripts/verify-code-contrast.ts
// 直接 import，而独立运行的 bun 脚本解析不了 Nuxt 的别名。
import { colorLuminance, contrastRatio, hexToHsl, hslToHex } from '../../../shared/utils/color'

/**
 * 代码高亮的双主题。
 *
 * 两套配色都以 Shiki 自带的 github-light 为起点**程序化派生**，而不是各自
 * 找一个现成主题——这样同一个 token 在亮暗两侧永远是同一个色相，切换主题时
 * 不会变成「换了一套语法高亮」。
 *
 * 派生分两步：
 *
 * ① 明度调整（两种模式各做一次）
 *    代码块底色取自锁定色板（亮 #ddf1f5 / 暗 #1a3d46），不是主题自带的纯白与
 *    深灰。实测 github-light 的橙红 #E36209 落在 #ddf1f5 上只有 2.99:1，
 *    远低于正文所需的 4.5:1。所以每个 token 颜色会沿明度轴推进到刚好达标：
 *    亮色模式往下推（变深），暗色模式往上推（变浅），色相与饱和度保持不动。
 *    本来已达标的颜色不会被改动，颜色的相对身份因此得以保留。
 *
 * ② 亮 → 暗的镜像
 *    暗色由**调整后的亮色**镜像而来：
 *      L' = 1 − L
 *      L'' = 0.45 + L' × 0.5      压进可读区间
 *      S'' = S × 0.72             降饱和（AGENTS.md 4.6）
 *    直接镜像是不够的：浅灰（L≈0.45）镜像后仍是浅灰，而深蓝（L≈0.20）镜像后
 *    过亮，两者在暗底上会糊成一片。压缩区间保证所有 token 落在可读带内。
 *
 * 重新校验：`bun scripts/verify-code-contrast.ts`
 */

/** 派生起点。它不是最终使用的主题，只是配色蓝本。 */
export const BASE_THEME = 'github-light'
export const LIGHT_THEME = 'stardust-light'
export const DARK_THEME = 'stardust-dark'

/** 代码块底色：取自锁定色板的 --color-card */
export const CODE_BACKGROUND = {
  light: '#ddf1f5',
  dark: '#1a3d46',
} as const

/** 正文对比度目标（WCAG 2.2 AA） */
export const CONTRAST_TARGET = 4.5

/* ── 颜色工具 ─────────────────────────────────────────────────────── */

export const luminance = colorLuminance
export const contrast = contrastRatio

/**
 * 沿明度轴把颜色推到刚好满足对比度目标，色相与饱和度不变。
 *
 * 二分查找「刚好达标」的那条边界，而不是一路推到极限——
 * 找错方向的写法会把所有 token 都压成纯黑，颜色身份就没了。
 * 本来已达标（或无法达标）的颜色按边界值返回，不会低于原值太多。
 */
export function ensureContrast(
  hex: string,
  background: string,
  direction: 'darker' | 'lighter',
  target = CONTRAST_TARGET,
): string {
  const hsl = hexToHsl(hex)
  if (!hsl) return hex
  if (contrast(hex, background) >= target) return hex

  const at = (l: number): string => hslToHex({ h: hsl.h, s: hsl.s, l })

  // 不变量：fail 端不达标，pass 端达标
  let fail = hsl.l
  let pass = direction === 'darker' ? 0 : 1

  if (contrast(at(pass), background) < target) {
    // 这个色相饱和度下无论怎么推都够不着目标（极少见），取对比度最好的那一端
    return at(pass)
  }

  for (let i = 0; i < 22; i += 1) {
    const mid = (fail + pass) / 2
    if (contrast(at(mid), background) >= target) pass = mid
    else fail = mid
  }

  return at(pass)
}

/** 亮 → 暗的镜像变换（不做对比度修正，修正由 ensureContrast 负责） */
function mirrorToDark(hex: string): string {
  const hsl = hexToHsl(hex)
  if (!hsl) return hex

  return hslToHex({
    h: hsl.h,
    s: Math.min(1, hsl.s * 0.72),
    l: Math.min(0.95, Math.max(0.45, 0.45 + (1 - hsl.l) * 0.5)),
  })
}

/* ── 主题派生 ─────────────────────────────────────────────────────── */

interface TokenSetting {
  foreground?: string
  background?: string
  fontStyle?: string
}

interface ThemeEntry {
  scope?: string | string[]
  settings?: TokenSetting
}

function mapTheme(
  raw: ThemeRegistration,
  name: string,
  displayName: string,
  type: 'light' | 'dark',
  background: string,
  transform: (hex: string) => string,
): ThemeRegistration {
  const entries = (raw.settings ?? raw.tokenColors ?? []) as ThemeEntry[]

  const settings = entries.map((entry) => {
    const source = entry.settings ?? {}
    const derived: TokenSetting = {}

    if (typeof source.foreground === 'string') {
      derived.foreground = transform(source.foreground)
    }
    if (typeof source.fontStyle === 'string') {
      derived.fontStyle = source.fontStyle
    }

    // background 一律丢弃：代码块底色由站点色板决定，
    // 留着主题自带的底色会让某几行突然出现一道别的颜色的高亮条
    return {
      ...(entry.scope === undefined ? {} : { scope: entry.scope }),
      settings: derived,
    }
  })

  const defaultForeground = transform(
    (raw.colors?.['editor.foreground'] as string | undefined) ?? '#24292e',
  )

  return {
    name,
    displayName,
    type,
    colors: {
      'editor.background': background,
      'editor.foreground': defaultForeground,
    },
    settings,
  }
}

export interface DerivedThemes {
  light: ThemeRegistration
  dark: ThemeRegistration
  /** 亮色阶段被调整过的颜色，便于核对 */
  adjusted: Array<{ from: string; to: string }>
}

/**
 * 由原始主题产出亮暗两套。
 * 暗色由调整后的亮色镜像而来，两者色相一一对应。
 */
export function buildThemes(raw: ThemeRegistration): DerivedThemes {
  const adjusted: Array<{ from: string; to: string }> = []

  const lightTransform = (hex: string): string => {
    const next = ensureContrast(hex, CODE_BACKGROUND.light, 'darker')
    if (next !== hex) adjusted.push({ from: hex, to: next })
    return next
  }

  const darkTransform = (hex: string): string => {
    // 先镜像出亮色的对偶，再按暗底修正对比度
    return ensureContrast(mirrorToDark(hex), CODE_BACKGROUND.dark, 'lighter')
  }

  return {
    // 注意顺序：暗色必须基于「已调整」的亮色，两边才真正互为派生
    light: mapTheme(raw, LIGHT_THEME, 'Stardust Light（由 github-light 派生）', 'light', CODE_BACKGROUND.light, lightTransform),
    dark: mapTheme(raw, DARK_THEME, 'Stardust Dark（由 Stardust Light 派生）', 'dark', CODE_BACKGROUND.dark, darkTransform),
    adjusted,
  }
}

/** 单独取一个颜色的暗色对偶，供文档与调试使用 */
export function darkCounterpart(hex: string): string {
  return ensureContrast(mirrorToDark(hex), CODE_BACKGROUND.dark, 'lighter')
}
