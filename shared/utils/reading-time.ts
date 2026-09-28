/**
 * 预估阅读时间（AGENTS.md 4.8）。
 *
 * 速率基准：
 * - 拉丁文字 265 词/分钟
 * - 中日韩文字 300 字/分钟
 *
 * 代码块不计入阅读时长——它不按线性速度消费。
 */

const LATIN_WORDS_PER_MINUTE = 265
const CJK_CHARS_PER_MINUTE = 300

const CJK_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g

/** 粗略剥离 Markdown 语法，留下自然语言。 */
function toPlainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ')
    .replace(/^\s{0,3}>\s?/gm, ' ')
    .replace(/[*_~|]/g, ' ')
}

/**
 * 把正文拆成「CJK 字数」与「拉丁词数」两个基数。
 * 阅读时长与总字数都基于它，两处口径必须一致。
 */
function countUnits(source: string): { cjk: number; latin: number } {
  const plain = toPlainText(source)

  return {
    cjk: plain.match(CJK_PATTERN)?.length ?? 0,
    latin: plain.replace(CJK_PATTERN, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g)?.length ?? 0,
  }
}

/** 返回至少为 1 的整数分钟数。 */
export function countReadingMinutes(source: string): number {
  const { cjk, latin } = countUnits(source)
  const minutes = cjk / CJK_CHARS_PER_MINUTE + latin / LATIN_WORDS_PER_MINUTE
  return Math.max(1, Math.round(minutes))
}

/**
 * 总字数。
 *
 * 中日韩按「字」算、拉丁按「词」算，两者直接相加——这是中文写作场景里
 * 最常见的口径（「这篇三千字」说的就是这个数）。不追求语言学上的精确。
 */
export function countWords(source: string): number {
  const { cjk, latin } = countUnits(source)
  return cjk + latin
}
