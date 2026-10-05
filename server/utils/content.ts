import { readFile, readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join } from 'node:path'
import type { PostDetail, PostNeighbour, PostSummary } from '~~/shared/types/content'
import { countReadingMinutes, countWords } from '~~/shared/utils/reading-time'
import { collectionNames, contentRoot } from './collections'
import { asArray, asString, parseFrontmatter, type Frontmatter } from './frontmatter'
import { renderMarkdown } from './markdown/index'

/**
 * 文件系统内容层。
 *
 * 目录约定：**合集就是 content/posts 下的子文件夹**。
 *
 *   content/posts/
 *     reading-first/             ← 合集，slug 即文件夹名
 *       _collection.md           ← 合集标题与描述
 *       reading-first-typography.md
 *     loose-post.md              ← 也可以直接放在顶层，不归属任何合集
 *
 * 文章的 URL 仍然是 /posts/<文件名>，文件夹只负责归档，不进入路径——
 * 这样把文章在合集之间搬家不会改变它的链接。
 *
 * frontmatter 只认这几个字段，缺了就按下述默认值降级：
 *
 *   ---
 *   title: 标题
 *   description: 一句话摘要
 *   date: 2026-01-12
 *   tags: [nuxt, design]
 *   cover: covers/hydrangea
 *   pinned: true
 *   ---
 */

const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/** 下划线开头的是元信息文件（如 _collection.md），不是文章。 */
function isPostFile(name: string): boolean {
  return name.endsWith('.md') && !name.startsWith('_')
}

interface PostFile {
  slug: string
  collection: string
  path: string
}

/**
 * 扫出所有文章文件。
 *
 * 每次都真读文件系统而不是缓存：内容目录只有几十个文件，这点开销远小于
 * 「改了 Markdown 却要重启 dev server」的代价。
 */
async function scanPostFiles(): Promise<PostFile[]> {
  const root = contentRoot()

  // 显式标注 Dirent[]：readdir 的重载集合里最后一个返回 Buffer，不写就会被推断成它
  let entries: Dirent[]
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    // 内容目录缺失时返回空列表，而不是让整站 500
    return []
  }

  const files: PostFile[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dir = join(root, entry.name)
      for (const name of await readdir(dir)) {
        if (!isPostFile(name)) continue
        files.push({
          slug: name.replace(/\.md$/, ''),
          collection: entry.name,
          path: join(dir, name),
        })
      }
      continue
    }

    if (!isPostFile(entry.name)) continue
    files.push({
      slug: entry.name.replace(/\.md$/, ''),
      collection: '',
      path: join(root, entry.name),
    })
  }

  return files
}

function buildSummary(
  slug: string,
  collection: string,
  data: Frontmatter,
  body: string,
  names: Map<string, string>,
): PostSummary {
  return {
    slug,
    title: asString(data.title) || slug,
    description: asString(data.description),
    date: asString(data.date),
    // 没写 updated 就留空，由展示层决定退回用 date
    updated: asString(data.updated),
    // 所属合集由文件夹决定，frontmatter 里的 collection 字段不再参与
    collection,
    collectionName: collection ? (names.get(collection) ?? collection) : '',
    tags: asArray(data.tags),
    pinned: data.pinned === true,
    cover: asString(data.cover),
    readingMinutes: countReadingMinutes(body),
    words: countWords(body),
  }
}

function toNeighbour(post: PostSummary): PostNeighbour {
  return { slug: post.slug, title: post.title }
}

/** 置顶优先，其后按日期倒序。 */
function comparePosts(a: PostSummary, b: PostSummary): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return b.date.localeCompare(a.date)
}

export interface RawPost {
  slug: string
  /** 所属合集（content/posts 下的文件夹名）；空字符串表示未归档 */
  collection: string
  data: Frontmatter
  /** 未经渲染的 Markdown 正文 */
  body: string
}

/**
 * 读出全部文章及其解析后的 frontmatter 与原始正文。
 *
 * 单独导出是为了给搜索索引复用：那一层需要正文纯文本，但不该重新实现一遍
 * 目录扫描与 frontmatter 解析。listPosts() 也走这里。
 */
export async function readAllPosts(): Promise<RawPost[]> {
  const files = await scanPostFiles()

  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(file.path, 'utf8')
      const { data, body } = parseFrontmatter(raw)
      return { slug: file.slug, collection: file.collection, data, body }
    }),
  )
}

export async function listPosts(): Promise<PostSummary[]> {
  const [posts, names] = await Promise.all([readAllPosts(), collectionNames()])

  const summaries = posts.map((post) =>
    buildSummary(post.slug, post.collection, post.data, post.body, names),
  )

  return summaries.sort(comparePosts)
}

export async function getPost(slug: string): Promise<PostDetail | null> {
  // 白名单式校验，杜绝 ../ 目录穿越
  if (!SLUG_PATTERN.test(slug)) return null

  const files = await scanPostFiles()
  const file = files.find((candidate) => candidate.slug === slug)
  if (!file) return null

  const raw = await readFile(file.path, 'utf8')
  const { data, body } = parseFrontmatter(raw)
  const { html, headings } = await renderMarkdown(body)

  const summaries = await listPosts()
  const index = summaries.findIndex((post) => post.slug === slug)
  const previous = index > 0 ? summaries[index - 1] : undefined
  const following = index >= 0 ? summaries[index + 1] : undefined

  const names = await collectionNames()

  return {
    ...buildSummary(file.slug, file.collection, data, body, names),
    html,
    headings,
    prev: previous ? toNeighbour(previous) : null,
    next: following ? toNeighbour(following) : null,
  }
}
