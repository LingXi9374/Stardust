import type { SearchField, SearchHit } from '~~/shared/types/search'
import { collectionNames } from './collections'
import { readAllPosts } from './content'
import { asArray, asString } from './frontmatter'

/**
 * 站内搜索。
 *
 * 目录里只有几十到几百个 Markdown 文件，把标题与正文拍平成纯文本放在进程内
 * 就够用了——不引第三方检索引擎，也不需要预生成索引文件。查询是纯字符串
 * 匹配，对中文尤其合适：中文没有词边界，分词反而会漏掉「排版即界面」这类词组。
 *
 * 匹配规则：查询按空白切成若干词，**每个词都要出现**（AND）才算命中。
 * 否则「nuxt 配色」会把所有提到 nuxt 的文章都捞出来，等于没筛。
 */

interface SearchDocument {
  slug: string
  title: string
  description: string
  collection: string
  collectionName: string
  date: string
  tags: string[]
  /** 正文拍平后的纯文本 */
  text: string
  // 下面是预先小写化的副本，避免每次查询对每个文档重复做 toLowerCase
  titleLower: string
  descriptionLower: string
  tagsLower: string
  textLower: string
}

/** 命中不同字段的权重。标题命中远比正文命中更能说明「就是这篇」。 */
const WEIGHT: Record<SearchField, number> = {
  title: 12,
  description: 4,
  tag: 6,
  body: 1,
}

/** 正文命中最多计几次，避免长文靠堆关键词霸榜 */
const BODY_HIT_CAP = 5

/**
 * 把 Markdown 拍平成可检索的纯文本。
 *
 * 刻意**保留代码块正文**：这是个技术博客，搜 `defineNuxtConfig` 或者
 * `grid-template` 是很自然的需求，丢掉代码会让搜索少掉一半价值。
 * 只去掉围栏标记本身。
 */
function toPlainText(markdown: string): string {
  return (
    markdown
      // 围栏代码块的三引号行（内容保留）
      .replace(/^ {0,3}```.*$/gm, ' ')
      // HTML 标签与注释
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      // 图片整块丢弃：alt 文本没有检索价值，反而会污染正文
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      // 链接只留文字，丢掉地址
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // 行首的引用、标题、列表标记
      .replace(/^ {0,3}(?:[>#]+\s*|[-*+]\s+|\d+\.\s+)/gm, '')
      // 表格分隔行
      .replace(/^ {0,3}\|?[\s:|-]{4,}\|?\s*$/gm, ' ')
      // 行内代码反引号与强调符号
      .replace(/[*_`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let at = haystack.indexOf(needle)
  while (at !== -1 && count < BODY_HIT_CAP) {
    count += 1
    at = haystack.indexOf(needle, at + needle.length)
  }
  return count
}

async function buildIndex(): Promise<SearchDocument[]> {
  const [posts, names] = await Promise.all([readAllPosts(), collectionNames()])

  return posts.map((post) => {
    const title = asString(post.data.title) || post.slug
    const description = asString(post.data.description)
    const tags = asArray(post.data.tags)
    const text = toPlainText(post.body)
    const collectionName = post.collection ? (names.get(post.collection) ?? post.collection) : ''

    return {
      slug: post.slug,
      title,
      description,
      collection: post.collection,
      collectionName,
      date: asString(post.data.date),
      tags,
      text,
      titleLower: title.toLowerCase(),
      descriptionLower: description.toLowerCase(),
      tagsLower: tags.join(' ').toLowerCase(),
      textLower: text.toLowerCase(),
    }
  })
}

let indexPromise: Promise<SearchDocument[]> | null = null

function getIndex(): Promise<SearchDocument[]> {
  // 开发期每次都重建：改完 Markdown 立刻能搜到，代价只是几十个文件的读取。
  // 生产环境内容不会变，缓存住即可。
  if (import.meta.dev) return buildIndex()

  indexPromise ??= buildIndex()
  return indexPromise
}

/**
 * 在首个命中位置附近截一段正文。
 *
 * 命中词前的留白刻意比后面短：结果列表里每段只显示两行，
 * 前后各取等长的话命中词常常被挤到可视范围之外，读者看不到自己搜的词。
 */
const SNIPPET_LEAD = 24
const SNIPPET_TAIL = 96

function makeSnippet(text: string, terms: string[]): string {
  if (!text) return ''

  const lower = text.toLowerCase()
  let at = -1
  for (const term of terms) {
    const found = lower.indexOf(term)
    if (found >= 0 && (at < 0 || found < at)) at = found
  }

  if (at < 0) {
    const head = text.slice(0, SNIPPET_LEAD + SNIPPET_TAIL).trim()
    return text.length > SNIPPET_LEAD + SNIPPET_TAIL ? `${head}…` : head
  }

  let start = Math.max(0, at - SNIPPET_LEAD)

  // 往前退到最近的空格，别把西文单词从中间切开
  if (start > 0) {
    const space = text.lastIndexOf(' ', start)
    if (space > 0 && at - space < SNIPPET_LEAD * 2) start = space + 1
  }

  const end = Math.min(text.length, at + SNIPPET_TAIL)

  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

/** 把查询切成检索词。中文不切分，整体作为子串去匹配。 */
export function parseQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
}

/**
 * 查询是否短到不值得检索。
 *
 * 单个西文字母会命中几乎所有文章；单个汉字（如「配色」的「配」）却是有意义的，
 * 所以按「是否含中日韩字符」区分对待。
 */
export function isQueryTooShort(terms: string[]): boolean {
  const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/
  return terms.length === 0 || terms.every((term) => term.length < 2 && !CJK.test(term))
}

interface Scored {
  doc: SearchDocument
  score: number
  matched: Set<SearchField>
  terms: string[]
}

function scoreDocument(doc: SearchDocument, terms: string[]): Scored | null {
  let score = 0
  const matched = new Set<SearchField>()

  for (const term of terms) {
    let found = false

    if (doc.titleLower.includes(term)) {
      score += WEIGHT.title
      matched.add('title')
      found = true
    }
    if (doc.tagsLower.includes(term)) {
      score += WEIGHT.tag
      matched.add('tag')
      found = true
    }
    if (doc.descriptionLower.includes(term)) {
      score += WEIGHT.description
      matched.add('description')
      found = true
    }

    const bodyHits = countOccurrences(doc.textLower, term)
    if (bodyHits > 0) {
      score += bodyHits * WEIGHT.body
      matched.add('body')
      found = true
    }

    // AND：有一个词完全没出现，这篇就不算命中
    if (!found) return null
  }

  return { doc, score, matched, terms }
}

export interface SearchOptions {
  limit?: number
}

export async function searchPosts(
  query: string,
  options: SearchOptions = {},
): Promise<{ hits: SearchHit[]; total: number }> {
  const terms = parseQuery(query)
  if (isQueryTooShort(terms)) return { hits: [], total: 0 }

  const index = await getIndex()

  const scored: Scored[] = []
  for (const doc of index) {
    const result = scoreDocument(doc, terms)
    if (result) scored.push(result)
  }

  // 分数高的在前；同分时新的在前，让「刚写的」更容易被看到
  scored.sort((a, b) => b.score - a.score || b.doc.date.localeCompare(a.doc.date))

  const limit = Math.max(1, Math.min(options.limit ?? 8, 50))

  const hits: SearchHit[] = scored.slice(0, limit).map(({ doc, matched, terms: used }) => ({
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    collection: doc.collection,
    collectionName: doc.collectionName,
    date: doc.date,
    tags: doc.tags,
    snippet: makeSnippet(doc.text, used),
    matched: [...matched],
  }))

  return { hits, total: scored.length }
}
