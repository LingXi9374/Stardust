/**
 * 校验图表配色里每一对「文字 / 底色」的对比度。
 *
 * 图表最容易出问题的地方不是线条而是文字：Mermaid 各图表类型读的主题变量不同，
 * 漏一个就退回它自己的默认值（白线、白字、灰底），于是出现「浅色模式下分支线
 * 看不见」「深色模式下属性行白底白字」这类问题。
 *
 * 这个脚本把语义色板和展开后的主题变量都过一遍，逐对算 WCAG 对比度。
 *
 *   bun scripts/verify-diagram-theme.ts
 */
import { contrastRatio } from '../shared/utils/color'
import { DIAGRAM_PALETTES, mermaidThemeVariables } from '../shared/utils/diagram-theme'

const TARGET = 4.5

interface Pair {
  label: string
  fg: string
  bg: string
}

let failures = 0

function report(title: string, pairs: Pair[]): void {
  const bad = pairs.filter((pair) => contrastRatio(pair.fg, pair.bg) < TARGET)
  const worst = pairs.reduce(
    (min, pair) => (contrastRatio(pair.fg, pair.bg) < contrastRatio(min.fg, min.bg) ? pair : min),
    pairs[0]!,
  )

  console.log(`\n=== ${title} ===`)
  console.log(
    `  ${pairs.length} 对   最低 ${contrastRatio(worst.fg, worst.bg).toFixed(2)}:1` +
      `  (${worst.label}：${worst.fg} on ${worst.bg})`,
  )

  for (const pair of bad.sort((a, b) => contrastRatio(a.fg, a.bg) - contrastRatio(b.fg, b.bg))) {
    console.log(
      `  ✗ ${pair.label.padEnd(28)} ${pair.fg} on ${pair.bg}  ${contrastRatio(pair.fg, pair.bg).toFixed(2)}:1`,
    )
  }
  if (bad.length === 0) console.log('  ✓ 全部达标')

  failures += bad.length
}

for (const mode of ['light', 'dark'] as const) {
  const p = DIAGRAM_PALETTES[mode]
  const v = mermaidThemeVariables(mode)
  const name = mode === 'light' ? '浅色' : '深色'

  const semantic: Pair[] = [
    { label: '正文 / 底板', fg: p.text, bg: p.surface },
    { label: '次级文字 / 底板', fg: p.textMuted, bg: p.surface },
    { label: '强调底上的字', fg: p.textOnStrong, bg: p.surfaceStrong },
    { label: '正文 / 交替底', fg: p.text, bg: p.surfaceAlt },
  ]

  const derived: Pair[] = [
    { label: 'ER 属性行（奇）', fg: v.textColor!, bg: v.attributeBackgroundColorOdd! },
    { label: 'ER 属性行（偶）', fg: v.textColor!, bg: v.attributeBackgroundColorEven! },
    { label: 'ER 关系标签', fg: v.relationLabelColor!, bg: v.relationLabelBackground! },
    { label: '甘特图任务条', fg: v.taskTextColor!, bg: v.taskBkgColor! },
    { label: '甘特图分区名', fg: v.taskTextOutsideColor!, bg: v.sectionBkgColor! },
    { label: '时序图参与者', fg: v.actorTextColor!, bg: v.actorBkg! },
    { label: '时序图消息', fg: v.signalTextColor!, bg: p.surface },
    { label: '状态图节点', fg: v.stateLabelColor!, bg: v.stateBkg! },
    { label: '流程图节点', fg: v.nodeTextColor!, bg: v.mainBkg! },
    { label: '饼图切片文字（浅档）', fg: v.pieSectionTextColor!, bg: p.scale[0]! },
    { label: '饼图切片文字（深档）', fg: v.pieSectionTextColor!, bg: p.scale[p.scale.length - 1]! },
    { label: '饼图标题', fg: v.pieTitleTextColor!, bg: p.surface },
  ]

  p.scale.forEach((color, index) => {
    derived.push({ label: `cScale${index} 标签`, fg: v[`cScaleLabel${index}`]!, bg: color })
  })
  p.gitRamp.forEach((color, index) => {
    derived.push({ label: `git${index} 分支标签`, fg: v[`gitBranchLabel${index}`]!, bg: color })
  })

  report(`${name}：语义色板`, semantic)
  report(`${name}：展开后的主题变量`, derived)
}

console.log('\n=== 变量数量 ===')
for (const mode of ['light', 'dark'] as const) {
  console.log(`  ${mode === 'light' ? '浅色' : '深色'} ${Object.keys(mermaidThemeVariables(mode)).length} 个`)
}

console.log(`\n结论：${failures === 0 ? '两套图表配色全部达标 ✓' : `${failures} 对未达标 ✗`}`)
process.exit(failures === 0 ? 0 : 1)
