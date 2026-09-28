import { bestForeground } from './color'

/**
 * 图表配色。
 *
 * 这里只有**一套语义色板**，Mermaid 的几十个主题变量全部由它派生。
 *
 * 之所以不再逐个手写变量：Mermaid 每个图表类型读的变量都不一样，漏一个就
 * 悄悄退回它自己的默认值——而默认值多半是为浅色底设计的（白线、白字、灰底），
 * 于是出现「浅色模式下分支线看不见」「深色模式下属性行白底白字」这类问题。
 * 现在把颜色收敛成下面这几个角色，缺什么都从这里取。
 *
 * 色板本身仍全部来自锁定配色（#87c5d1 / #e9feff / #cee9ee）及其派生令牌。
 *
 * 校验：`bun scripts/verify-diagram-theme.ts`
 */

export interface DiagramPalette {
  /** 图表底板（与 .dg 的背景一致，否则图会「浮」在色块上） */
  surface: string
  /** 交替底色：分区、斑马纹 */
  surfaceAlt: string
  /** 强调底：实体表头、分区标题、标签块 */
  surfaceStrong: string
  /** 连线 */
  line: string
  /** 更弱的线（网格） */
  lineSoft: string
  /** 底板上的正文 */
  text: string
  /** 底板上的次级文字 */
  textMuted: string
  /** 强调底上的文字 */
  textOnStrong: string
  /** 强调色：任务条、活动节点 */
  accent: string
  /** 强调色的浅版 */
  accentSoft: string
  /** 分类色板：思维导图 / 时间线 / 饼图，从浅到深一整条 */
  scale: readonly string[]
  /**
   * Git 分支色。与 scale 不同，这一组必须是**同一个明度带**里的颜色。
   *
   * 它同时被用作分支线和分支标签的底色，而标签文字只能二选一（深墨或浅墨），
   * 于是中间调是盲区——实测 #43818f 配浅墨只有 4.02:1、配深墨更低，
   * 两头都不达标。所以整条色带压在「浅墨一定读得清」的暗区间里。
   */
  gitRamp: readonly string[]
}

/** 深色墨水，用在浅底上 */
const INK_DARK = '#0b2b33'
/** 浅色墨水，用在深底上 */
const INK_LIGHT = '#eaf7fa'

export const DIAGRAM_PALETTES: Record<'light' | 'dark', DiagramPalette> = {
  light: {
    surface: '#ddf1f5',
    surfaceAlt: '#e9feff',
    surfaceStrong: '#cee9ee',
    line: '#87c5d1',
    lineSoft: '#bbe0e8',
    text: '#17414d',
    textMuted: '#2c6473',
    textOnStrong: '#17414d',
    accent: '#5aa6b5',
    accentSoft: '#b2d9e1',
    scale: [
      '#eaf9fc',
      '#dcf1f5',
      '#cee9ee',
      '#c0e1e8',
      '#b2d9e1',
      '#a4d1db',
      '#96c9d4',
      '#88c1cd',
      '#7ab9c6',
      '#6cb1bf',
      '#5ea9b8',
      '#50a1b1',
    ],
    gitRamp: ['#17414d', '#1a4956', '#1d505f', '#205768', '#235e71', '#26657a', '#296c83', '#2c738c'],
  },
  dark: {
    surface: '#1a3d46',
    surfaceAlt: '#15343c',
    surfaceStrong: '#23535e',
    line: '#87c5d1',
    lineSoft: '#27505a',
    text: '#eaf7fa',
    textMuted: '#cbe6ec',
    textOnStrong: '#eaf7fa',
    accent: '#a5d7e0',
    accentSoft: '#2b5a66',
    scale: [
      '#2b5f6c',
      '#275863',
      '#23515b',
      '#1f4a53',
      '#1b434b',
      '#173c43',
      '#234c56',
      '#264f5a',
      '#2a555f',
      '#2e5b66',
      '#32616d',
      '#366775',
    ],
    gitRamp: ['#a5d7e0', '#9cd2dd', '#93cdda', '#8ac8d7', '#81c3d4', '#78bed1', '#6fb9ce', '#66b4cb'],
  },
}

/** 一条分类色带铺成 cScaleN / cScaleInvN / cScaleLabelN */
function scaleVariables(scale: readonly string[], ink: readonly string[]): Record<string, string> {
  const variables: Record<string, string> = {}

  scale.forEach((color, index) => {
    variables[`cScale${index}`] = color
    variables[`cScaleInv${index}`] = bestForeground(color, ink)
    variables[`cScaleLabel${index}`] = bestForeground(color, ink)
  })

  return variables
}

/** Git 图的分支色与分支标签色 */
function gitVariables(ramp: readonly string[], ink: readonly string[]): Record<string, string> {
  const variables: Record<string, string> = {}

  ramp.forEach((color, index) => {
    variables[`git${index}`] = color
    variables[`gitInv${index}`] = bestForeground(color, ink)
    variables[`gitBranchLabel${index}`] = bestForeground(color, ink)
  })

  return variables
}

/**
 * 把语义色板展开成 Mermaid 的主题变量。
 *
 * 按图表类型分组，每组都同时给「底」与「字」——文字颜色是对比度出问题最多的地方。
 */
export function mermaidThemeVariables(mode: 'light' | 'dark'): Record<string, string> {
  const p = DIAGRAM_PALETTES[mode]
  const ink = mode === 'light' ? [INK_DARK, INK_LIGHT] : [INK_LIGHT, INK_DARK]

  return {
    /* ── 基础 ── */
    darkMode: String(mode === 'dark'),
    background: p.surface,
    primaryColor: p.surfaceStrong,
    primaryTextColor: p.textOnStrong,
    primaryBorderColor: p.line,
    secondaryColor: p.surfaceAlt,
    secondaryTextColor: p.text,
    secondaryBorderColor: p.lineSoft,
    tertiaryColor: p.accentSoft,
    tertiaryTextColor: p.text,
    tertiaryBorderColor: p.line,
    mainBkg: p.surfaceStrong,
    nodeBorder: p.line,
    nodeTextColor: p.textOnStrong,
    lineColor: p.textMuted,
    textColor: p.text,
    titleColor: p.text,
    edgeLabelBackground: p.surfaceAlt,
    clusterBkg: p.surfaceAlt,
    clusterBorder: p.line,
    fontFamily: 'inherit',

    /* ── 时序图 ── */
    actorBkg: p.surfaceStrong,
    actorBorder: p.line,
    actorTextColor: p.textOnStrong,
    actorLineColor: p.line,
    signalColor: p.textMuted,
    signalTextColor: p.text,
    labelBoxBkgColor: p.surfaceStrong,
    labelBoxBorderColor: p.line,
    labelTextColor: p.textOnStrong,
    loopTextColor: p.text,
    noteBkgColor: p.surfaceAlt,
    noteBorderColor: p.line,
    noteTextColor: p.text,
    activationBkgColor: p.accentSoft,
    activationBorderColor: p.line,
    sequenceNumberColor: p.text,

    /* ── ER 图 ──
       属性行底色必须显式给：默认是 #ffffff / #f2f2f2，深色模式下就成了白底白字。
       关系线与关系标签也一并收进色板，否则会退回 Mermaid 的灰底。 */
    attributeBackgroundColorOdd: p.surfaceAlt,
    attributeBackgroundColorEven: p.surface,
    erEdgeLabelBackground: p.surfaceAlt,
    relationColor: p.textMuted,
    relationLabelColor: p.text,
    relationLabelBackground: p.surfaceAlt,

    /* ── 甘特图 ──
       这一组漏得最多：分区底色、分区文字、任务条文字、网格线全都有各自的变量，
       不设就退回默认的白字 / 白线。 */
    sectionBkgColor: p.surfaceStrong,
    altSectionBkgColor: p.surfaceAlt,
    sectionBkgColor2: p.surfaceStrong,
    taskBkgColor: p.line,
    taskBorderColor: p.accent,
    taskTextColor: bestForeground(p.line, ink),
    taskTextLightColor: bestForeground(p.line, ink),
    taskTextDarkColor: bestForeground(p.line, ink),
    // 条外的字：左侧分区名、轴标签都在这里
    taskTextOutsideColor: p.text,
    taskTextClickableColor: p.accent,
    activeTaskBkgColor: p.accent,
    activeTaskBorderColor: p.textMuted,
    doneTaskBkgColor: p.surfaceStrong,
    doneTaskBorderColor: p.line,
    critBkgColor: p.accentSoft,
    critBorderColor: p.accent,
    gridColor: p.lineSoft,
    todayLineColor: p.accent,

    /* ── Git 图 ──
       commitLineColor 与 branchLabelColor 原先漏了，分支线才会是白色。 */
    ...gitVariables(p.gitRamp, ink),
    commitLineColor: p.textMuted,
    commitLabelColor: p.text,
    commitLabelBackground: p.surfaceAlt,
    commitLabelFontSize: '11px',
    branchLabelColor: p.text,
    tagLabelColor: p.text,
    tagLabelBackground: p.surfaceStrong,
    tagLabelBorder: p.line,
    tagLabelFontSize: '11px',

    /* ── 饼图 ── */
    pieTitleTextColor: p.text,
    pieTitleTextSize: '16px',
    pieSectionTextColor: mode === 'light' ? INK_DARK : INK_LIGHT,
    pieLegendTextColor: p.text,
    pieStrokeColor: p.surface,
    pieOuterStrokeColor: p.line,
    pieOpacity: '1',

    /* ── 分类色板 ── */
    ...scaleVariables(p.scale, ink),

    /* ── 状态图 / 类图 ── */
    stateBkg: p.surfaceStrong,
    stateBorder: p.line,
    stateLabelColor: p.textOnStrong,
    transitionColor: p.textMuted,
    transitionLabelColor: p.text,
    specialStateColor: p.accent,
  }
}
