/**
 * 校验代码高亮的双主题对比度。
 *
 * 两套主题都由 github-light 派生（见 server/utils/markdown/theme.ts）：
 * 亮色先把 token 沿明度轴推到在代码块底色上达标，暗色再由调整后的亮色镜像而来。
 * 这个脚本把一份覆盖多种 token 类型的代码分别按两套主题分词，逐 token 计算
 * 它与代码块底色的对比度，低于 WCAG AA（正文 4.5:1）的会被点名。
 *
 *   bun scripts/verify-code-contrast.ts
 */
import { createHighlighter } from 'shiki'
import {
  BASE_THEME,
  CODE_BACKGROUND,
  CONTRAST_TARGET,
  DARK_THEME,
  LIGHT_THEME,
  buildThemes,
  contrast,
  darkCounterpart,
} from '../server/utils/markdown/theme'

const SAMPLE = `// 覆盖尽量多的 token 类型
import { defineComponent } from 'vue'

/** 文档注释 */
export interface Post {
  slug: string
  title: string
  pinned?: boolean
  tags: string[]
}

const RELEASE = 'v1.2.3'
const RETRY = 3
const RATIO = 0.75
const FLAGS = /^[a-z]+$/g

export function pick(posts: Post[], limit = 10, deep = { nested: { level: 2 } }) {
  if (!posts.length) return null

  const sorted = posts
    .filter((post) => post.pinned === true)
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .slice(0, limit)

  try {
    for (const { slug, tags } of sorted) {
      console.log(\`\${slug}: \${tags.join(', ')}\`)
    }
  } catch (error) {
    throw new Error('failed: ' + error.message)
  }

  return { sorted, RELEASE, RETRY, RATIO, FLAGS, deep }
}

export default defineComponent({ name: 'PostList' })
`

const highlighter = await createHighlighter({ themes: [BASE_THEME], langs: ['typescript'] })
const { light, dark, adjusted } = buildThemes(highlighter.getTheme(BASE_THEME))
await highlighter.loadTheme(light)
await highlighter.loadTheme(dark)

interface Row {
  token: string
  color: string
  ratio: number
}

function scan(theme: string, background: string): Row[] {
  const { tokens } = highlighter.codeToTokens(SAMPLE, { lang: 'typescript', theme })
  const rows: Row[] = []
  const seen = new Set<string>()

  for (const line of tokens) {
    for (const token of line) {
      if (!token.color) continue
      if (token.content.trim() === '') continue
      const key = `${token.color}|${token.content.trim().slice(0, 12)}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({
        token: token.content.trim().slice(0, 22),
        color: token.color,
        ratio: contrast(token.color, background),
      })
    }
  }

  return rows
}

let failures = 0

for (const [label, theme, background] of [
  ['亮色 Stardust Light', LIGHT_THEME, CODE_BACKGROUND.light],
  ['暗色 Stardust Dark', DARK_THEME, CODE_BACKGROUND.dark],
] as const) {
  const rows = scan(theme, background)
  const failing = rows.filter((row) => row.ratio < CONTRAST_TARGET)
  const worst = rows.reduce((min, row) => (row.ratio < min.ratio ? row : min), rows[0]!)

  console.log(`\n=== ${label} ===`)
  console.log(`  底色 ${background}   样本 ${rows.length} 个不同 token`)
  console.log(`  最低对比度 ${worst.ratio.toFixed(2)}:1  (${worst.color} “${worst.token}”)`)
  console.log(`  低于 ${CONTRAST_TARGET}:1 的：${failing.length} 个`)
  for (const row of failing.sort((a, b) => a.ratio - b.ratio).slice(0, 8)) {
    console.log(`    ${row.ratio.toFixed(2)}:1  ${row.color}  “${row.token}”`)
  }
  failures += failing.length
}

console.log('\n=== 亮 → 暗 的色相对偶（前 12 个不同 token 颜色）===')
const lightColors = [...new Set(scan(LIGHT_THEME, CODE_BACKGROUND.light).map((row) => row.color))]
for (const color of lightColors.slice(0, 12)) {
  const before = contrast(color, CODE_BACKGROUND.light)
  const after = darkCounterpart(color)
  console.log(
    `  ${color}  ${before.toFixed(2)}:1  →  ${after}  ${contrast(after, CODE_BACKGROUND.dark).toFixed(2)}:1`,
  )
}

console.log(`\n=== 亮色阶段被调整过的颜色：${adjusted.length} 个 ===`)
for (const item of adjusted.slice(0, 8)) {
  console.log(`  ${item.from} → ${item.to}`)
}

console.log(`\n结论：${failures === 0 ? '两套主题全部达标 ✓' : `${failures} 个 token 未达标 ✗`}`)
process.exit(failures === 0 ? 0 : 1)
