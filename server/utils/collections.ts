import { readFile, readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join, resolve } from 'node:path'
import type { CollectionMeta } from '~~/shared/types/content'
import { asNumber, asString, parseFrontmatter } from './frontmatter'

/**
 * 合集 = content/posts 下的一个子文件夹。
 *
 *   content/posts/
 *     reading-first/
 *       _collection.md        ← 合集的标题与描述写在这里
 *       some-post.md
 *       another-post.md
 *
 * 不需要在 app.config.ts 里登记——建个文件夹就是建了个合集，
 * 删掉文件夹合集就没了，不会出现「配置里有、内容里没有」的空合集。
 *
 * `_collection.md` 没有时也能工作：标题回退成文件夹名，描述留空。
 * 文件里没写 frontmatter 时，正文第一行会被当作描述（方便直接丢一个纯文本文件进去）。
 */

/** 合集元信息文件。下划线开头，因此不会被当成文章。 */
const META_FILES = ['_collection.md', '_collection.txt'] as const

export function contentRoot(): string {
  const { contentDir } = useRuntimeConfig()
  return resolve(process.cwd(), contentDir || 'content/posts')
}

/** 读一个文件夹的元信息；读不到就退回文件夹名。 */
async function readCollectionMeta(dir: string, slug: string): Promise<CollectionMeta> {
  for (const name of META_FILES) {
    let raw: string
    try {
      raw = await readFile(join(dir, name), 'utf8')
    } catch {
      continue
    }

    const { data, body } = parseFrontmatter(raw)
    const firstLine = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0)

    return {
      slug,
      name: asString(data.title) || slug,
      description: asString(data.description) || firstLine || '',
      order: asNumber(data.order) ?? Number.MAX_SAFE_INTEGER,
    }
  }

  return { slug, name: slug, description: '', order: Number.MAX_SAFE_INTEGER }
}

/** 列出全部合集。带 order 的排前面，其余按文件夹名。 */
export async function listCollections(): Promise<CollectionMeta[]> {
  const root = contentRoot()

  // 显式标注 Dirent[]：readdir 的重载集合里最后一个返回 Buffer，不写就会被推断成它
  let entries: Dirent[]
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }

  const collections = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readCollectionMeta(join(root, entry.name), entry.name)),
  )

  return collections.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.slug.localeCompare(b.slug)
  })
}

export async function getCollection(slug: string): Promise<CollectionMeta | null> {
  // 白名单式校验，杜绝 ../ 目录穿越
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug)) return null

  const collections = await listCollections()
  return collections.find((collection) => collection.slug === slug) ?? null
}

/** slug → 合集名，给文章摘要补 collectionName 用，避免每篇都去翻文件夹。 */
export async function collectionNames(): Promise<Map<string, string>> {
  const collections = await listCollections()
  return new Map(collections.map((collection) => [collection.slug, collection.name]))
}
