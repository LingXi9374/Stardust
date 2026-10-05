/**
 * 生成 giscus 的自定义主题。
 *
 * 为什么是「改色」而不是「从零写」：自定义主题 URL 会**整体替换**官方主题，
 * 没有继承。官方 light.css / dark.css 在 main 上定义了 82 个变量，只覆盖其中
 * 一部分的话，剩下的会回落成 Primer 的默认值——蓝灰色系，和本站色板打架。
 * 所以这里以官方文件为底，只替换颜色值，变量一个不少。
 *
 * 重新生成：
 *   bun scripts/build-giscus-theme.ts
 *
 * 产物：
 *   assets/giscus/preferred_color_scheme.css           亮色（可读的源）
 *   assets/giscus/preferred_color_scheme_dark.css      暗色（可读的源）
 *   server/utils/giscus-theme.generated.ts             内联版，路由实际使用的
 *
 * 为什么要生成两份：giscus 注入的主题 <link> 带 crossorigin="anonymous"，
 * 是跨域请求，必须带 CORS 头才能应用。而
 *   - public/ 下的静态文件会被更早的处理器短路，server/middleware 轮不到（实测过）
 *   - 用 Nitro 路由读文件的话，Vite 的 ?raw 在服务端产物里不被支持（也实测过）
 * 所以最终由 Nitro 路由返回，样式内容在生成时内联进 .ts，产物自带、不读磁盘。
 * .css 保留下来是为了可读与可 diff，两份都由本脚本产出，不会各说各话。
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { contrastRatio } from '../shared/utils/color'
import { CODE_BACKGROUND } from '../server/utils/markdown/theme'

const SOURCE = {
  light: 'https://giscus.app/themes/light.css',
  dark: 'https://giscus.app/themes/dark.css',
} as const

const OUT_DIR = 'assets/giscus'
const INLINE_FILE = 'server/utils/giscus-theme.generated.ts'
const OUT_FILE = {
  light: 'preferred_color_scheme.css',
  dark: 'preferred_color_scheme_dark.css',
} as const

/** 锁定色板（AGENTS.md：前景 #87c5d1 / 背景 #e9feff / 侧栏 #cee9ee） */
const LIGHT = {
  canvas: '#e9feff',
  card: '#ddf1f5',
  sidebar: '#cee9ee',
  line: '#bbe0e8',
  lineSoft: '#cee9ee',
  inkStrong: '#17414d',
  ink: '#2c6473',
  inkSoft: '#356b79',
  accent: '#87c5d1',
  accentDeep: '#5aa6b5',
  onAccent: '#0b2b33',
} as const

const DARK = {
  canvas: '#0f2a30',
  card: '#1a3d46',
  sidebar: '#15343c',
  line: '#27505a',
  lineSoft: '#214a55',
  inkStrong: '#eaf7fa',
  ink: '#cbe6ec',
  inkSoft: '#a7cdd6',
  accent: '#87c5d1',
  accentDeep: '#a5d7e0',
  onAccent: '#0b2b33',
} as const

/** 带透明度的色值，Primer 用 rgba 表达 muted / subtle 一类的层 */
function alpha(hex: string, a: number): string {
  const value = parseInt(hex.replace('#', ''), 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function semantic(p: typeof LIGHT, mode: 'light' | 'dark'): Record<string, string> {
  // Primer 的 scale 变量两边不一样：亮色用 gray-1 / blue-1，暗色用 gray-7 / blue-8
  const scales =
    mode === 'light'
      ? {
          '--color-scale-gray-1': p.card,
          '--color-scale-blue-1': alpha(p.accent, 0.35),
        }
      : {
          '--color-scale-gray-7': p.card,
          '--color-scale-blue-8': alpha(p.accent, 0.3),
        }

  return {
    // 底色
    '--color-canvas-default': p.canvas,
    '--color-canvas-overlay': p.canvas,
    '--color-canvas-inset': p.card,
    '--color-canvas-subtle': p.card,

    // 文字
    '--color-fg-default': p.inkStrong,
    '--color-fg-muted': p.ink,
    '--color-fg-subtle': p.inkSoft,

    // 描边
    '--color-border-default': p.line,
    '--color-border-muted': p.lineSoft,
    '--color-neutral-muted': alpha(p.inkSoft, 0.14),

    // 强调色。
    // 注意 accent 一族（#87c5d1 / #5aa6b5）是**前景面**色，当文字用不达标——
    // 实测 #5aa6b5 落在 #e9feff 上只有 2.66:1。本站是单色板，链接也就不该靠
    // 色相区分，改成「深墨 + 下划线」的编辑式做法（下划线规则见文件末尾追加段）。
    // accent 仍然用在按钮、选中态这些非文字的位置上。
    '--color-accent-fg': p.inkStrong,
    '--color-accent-emphasis': p.accent,
    '--color-accent-muted': alpha(p.accent, 0.4),
    '--color-accent-subtle': alpha(p.accent, 0.15),

    // 状态色。本站不引入色板外的语义色，统一收敛到强调色
    '--color-success-fg': p.accentDeep,
    '--color-attention-fg': p.inkSoft,
    '--color-attention-muted': alpha(p.accent, 0.4),
    '--color-attention-subtle': alpha(p.accent, 0.15),
    '--color-danger-fg': p.inkSoft,
    '--color-danger-muted': alpha(p.inkSoft, 0.4),
    '--color-danger-subtle': alpha(p.inkSoft, 0.15),

    // 按钮
    '--color-btn-text': p.inkStrong,
    '--color-btn-bg': p.card,
    '--color-btn-border': p.line,
    '--color-btn-shadow': '0 0 0 0 transparent',
    '--color-btn-inset-shadow': 'inset 0 0 0 0 transparent',
    '--color-btn-hover-bg': p.sidebar,
    '--color-btn-hover-border': p.accent,
    '--color-btn-active-bg': p.sidebar,
    '--color-btn-active-border': p.accent,
    '--color-btn-selected-bg': p.sidebar,

    '--color-btn-primary-text': p.onAccent,
    '--color-btn-primary-bg': p.accent,
    '--color-btn-primary-border': p.accent,
    '--color-btn-primary-shadow': '0 0 0 0 transparent',
    '--color-btn-primary-inset-shadow': 'inset 0 0 0 0 transparent',
    '--color-btn-primary-hover-bg': p.accentDeep,
    '--color-btn-primary-hover-border': p.accentDeep,
    '--color-btn-primary-selected-bg': p.accentDeep,
    '--color-btn-primary-selected-shadow': '0 0 0 0 transparent',
    '--color-btn-primary-disabled-text': alpha(p.onAccent, 0.5),
    '--color-btn-primary-disabled-bg': alpha(p.accent, 0.5),
    '--color-btn-primary-disabled-border': 'transparent',

    // 其它控件
    '--color-action-list-item-default-hover-bg': alpha(p.accent, 0.15),
    '--color-segmented-control-bg': alpha(p.inkSoft, 0.1),
    '--color-segmented-control-button-bg': p.canvas,
    '--color-segmented-control-button-selected-border': p.accent,

    '--color-primer-shadow-inset': 'inset 0 0 0 0 transparent',
    '--color-social-reaction-bg-hover': alpha(p.accent, 0.15),
    '--color-social-reaction-bg-reacted-hover': alpha(p.accent, 0.3),
    ...scales,
  }
}

/** 评论里的代码块。用与正文同一套派生规则，见 server/utils/markdown/theme.ts */
const SYNTAX = {
  light: {
    comment: '#646D76',
    constant: '#005CC5',
    entity: '#6F42C1',
    keyword: '#CD2A39',
    string: '#032F62',
    variable: '#B34D07',
    tag: '#1F7C35',
  },
  dark: {
    comment: '#B8BCC0',
    constant: '#94BEEE',
    entity: '#AB98CF',
    keyword: '#D89198',
    string: '#BFD7F3',
    variable: '#EBBC9C',
    tag: '#8FD3A8',
  },
} as const

function syntax(p: (typeof SYNTAX)['light']): Record<string, string> {
  return {
    '--color-prettylights-syntax-comment': p.comment,
    '--color-prettylights-syntax-constant': p.constant,
    '--color-prettylights-syntax-entity': p.entity,
    '--color-prettylights-syntax-storage-modifier-import': p.variable,
    '--color-prettylights-syntax-entity-tag': p.tag,
    '--color-prettylights-syntax-keyword': p.keyword,
    '--color-prettylights-syntax-string': p.string,
    '--color-prettylights-syntax-variable': p.variable,
    '--color-prettylights-syntax-string-regexp': p.constant,
    '--color-prettylights-syntax-markup-list': p.variable,
    '--color-prettylights-syntax-markup-heading': p.constant,
    '--color-prettylights-syntax-markup-italic': p.comment,
    '--color-prettylights-syntax-markup-bold': p.comment,
    '--color-prettylights-syntax-markup-deleted-text': p.keyword,
    '--color-prettylights-syntax-markup-inserted-text': p.tag,
    '--color-prettylights-syntax-markup-changed-text': p.variable,
    '--color-prettylights-syntax-markup-ignored-text': p.comment,
    '--color-prettylights-syntax-meta-diff-range': p.entity,
    '--color-prettylights-syntax-brackethighlighter-angle': p.comment,
    '--color-prettylights-syntax-sublimelinter-gutter-mark': p.comment,
    '--color-prettylights-syntax-constant-other-reference-link': p.string,
  }
}

/**
 * 把官方 CSS 里 `--var: value` 的值换成我们给的色，未列出的原样保留。
 *
 * 终止符用前瞻而不是写死分号：块内最后一条声明是以 `}` 收尾、没有分号的，
 * 写死 `;` 会整条漏掉（`--color-social-reaction-*` 就在第二个 main 块的末尾）。
 */
function recolor(source: string, overrides: Record<string, string>): string {
  const missing = new Set(Object.keys(overrides))

  const out = source.replace(
    /(--[a-z0-9-]+)(\s*:\s*)([^;}]+)/gi,
    (whole, name: string, sep: string, _value: string) => {
      const next = overrides[name]
      if (next === undefined) return whole
      missing.delete(name)
      return `${name}${sep}${next}`
    },
  )

  if (missing.size > 0) {
    throw new Error(`官方主题里没有这些变量，映射写错了：${[...missing].join(', ')}`)
  }

  return out
}

function countVars(css: string): number {
  return new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1])).size
}

/** 成对校验：正文/次要文字在各自底色上必须达标 */
function verify(label: string, palette: typeof LIGHT, syntaxColors: (typeof SYNTAX)['light'], codeBg: string) {
  const pairs: Array<[string, string, string]> = [
    ['主要文字 / 画布', palette.inkStrong, palette.canvas],
    ['次要文字 / 画布', palette.ink, palette.canvas],
    ['弱化文字 / 画布', palette.inkSoft, palette.canvas],
    ['链接 / 画布', palette.inkStrong, palette.canvas],
    ['主按钮文字 / 按钮底', palette.onAccent, palette.accent],
    ['代码注释 / 代码底', syntaxColors.comment, codeBg],
    ['代码字符串 / 代码底', syntaxColors.string, codeBg],
    ['代码关键字 / 代码底', syntaxColors.keyword, codeBg],
  ]

  console.log(`\n=== ${label} 对比度 ===`)
  let worst = Number.POSITIVE_INFINITY

  for (const [name, fg, bg] of pairs) {
    const ratio = contrastRatio(fg, bg)
    worst = Math.min(worst, ratio)
    console.log(`  ${ratio >= 4.5 ? '✓' : '✗'} ${name.padEnd(20)} ${fg} on ${bg}  ${ratio.toFixed(2)}:1`)
  }

  return worst
}

/**
 * 官方文件之外的一点补充。
 *
 * 链接的下划线不是装饰：本站是单色板，链接色与正文色同族，只靠颜色分不出来。
 * 下划线是 in-room 的编辑式做法，也让色觉障碍读者不必依赖色相。
 */
function suffix(p: typeof LIGHT): string {
  return `
/*! ── Stardust 追加段（由 scripts/build-giscus-theme.ts 生成）── */
main a{text-decoration:underline;text-underline-offset:.15em;text-decoration-thickness:1px}
main a:hover{text-decoration-thickness:2px}
/* 键盘焦点用强调色描边，和站点其它控件保持一致 */
main :focus-visible{outline:2px solid ${p.accent};outline-offset:2px}
`
}

const results: number[] = []
const outputs: Record<'light' | 'dark', string> = { light: '', dark: '' }

for (const mode of ['light', 'dark'] as const) {
  const source = await fetch(SOURCE[mode]).then((res) => res.text())
  const palette = mode === 'light' ? LIGHT : DARK

  const overrides = {
    ...semantic(palette, mode),
    ...syntax(SYNTAX[mode]),
  }

  const output = recolor(source, overrides) + suffix(palette)
  outputs[mode] = output

  const before = countVars(source)
  const after = countVars(output)
  if (before !== after) {
    throw new Error(`${mode}: 变量数从 ${before} 变成了 ${after}，说明替换过程弄丢了定义`)
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(`${OUT_DIR}/${OUT_FILE[mode]}`, output, 'utf8')

  console.log(`\n=== ${mode} ===`)
  console.log(`  源 ${SOURCE[mode]}`)
  console.log(`  产物 ${OUT_DIR}/${OUT_FILE[mode]}  ${output.length} 字节`)
  console.log(`  变量 ${after} 个（与官方一致）`)
  console.log(`  覆盖 ${Object.keys(overrides).length} 个`)

  results.push(
    verify(
      mode,
      palette,
      SYNTAX[mode],
      mode === 'light' ? CODE_BACKGROUND.light : CODE_BACKGROUND.dark,
    ),
  )
}

const worst = Math.min(...results)

/* ── 内联版：路由实际返回的就是它 ── */
function embed(css: string): string {
  // 模板字面量里只需转义反引号与 ${，CSS 里出现这两样的概率极低，但不能不防
  return css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

const inline = `/**
 * 自动生成，请勿手改。
 *
 *   bun scripts/build-giscus-theme.ts
 *
 * 内容与 assets/giscus/${OUT_FILE.light} /
 * ${OUT_FILE.dark} 一致，由同一支脚本一次产出。
 *
 * 之所以要内联一份：giscus 注入的主题 <link> 带 crossorigin="anonymous"，
 * 必须由我们自己返回 CORS 头；而 public/ 静态文件轮不到 middleware，
 * Vite 的 ?raw 在服务端产物里也不被支持。内联进模块是唯一不依赖
 * 构建配置、又保证产物自带内容的做法。
 */

export const GISCUS_THEME_LIGHT = \`${embed(outputs.light)}\`

export const GISCUS_THEME_DARK = \`${embed(outputs.dark)}\`
`

await writeFile(INLINE_FILE, inline, 'utf8')
console.log(`\n=== 内联版 ===\n  ${INLINE_FILE}  ${inline.length} 字节`)

console.log(`\n结论：最低对比度 ${worst.toFixed(2)}:1 ${worst >= 4.5 ? '✓ 全部达标' : '✗ 有不达标项'}`)
process.exit(worst >= 4.5 ? 0 : 1)
