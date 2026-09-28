<script setup lang="ts">
import type { PostSummary } from '~~/shared/types/content'

const { collections } = useCollections()

const { data: posts } = await useFetch<PostSummary[]>('/api/posts', {
  default: () => [],
})

/** 每个合集下已归档的文章数。 */
const collectionCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const post of posts.value) {
    if (!post.collection) continue
    counts.set(post.collection, (counts.get(post.collection) ?? 0) + 1)
  }
  return counts
})

/** 标签按出现次数倒序，次数相同按名称升序。 */
const tags = computed(() => {
  const counts = new Map<string, number>()
  for (const post of posts.value) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }))
})

useSeoMeta({
  title: 'Contents',
  description: '全部文章的索引，按合集与标签归档，置顶优先。',
})
</script>

<template>
  <div class="px-6 py-12 sm:px-10 lg:px-16 lg:py-14">
    <div class="mx-auto max-w-3xl">
      <!-- 合集 -->
      <section v-if="collections.length" class="mb-10">
        <h2 class="text-meta font-medium uppercase tracking-[0.18em] text-ink-soft">
          Collections
        </h2>

        <ul class="mt-3 grid gap-3 sm:grid-cols-2">
          <li v-for="collection in collections" :key="collection.slug">
            <NuxtLink
              :to="`/collections/${collection.slug}`"
              class="flex h-full flex-col rounded-2xl bg-card p-4 transition-colors hover:bg-card-hover"
            >
              <span class="flex items-baseline justify-between gap-3">
                <span class="font-medium text-ink-strong">{{ collection.name }}</span>
                <span class="text-meta tabular-nums text-ink-soft">
                  {{ collectionCounts.get(collection.slug) ?? 0 }}
                </span>
              </span>
              <span class="mt-1 text-sm leading-relaxed text-ink-soft">
                {{ collection.description }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- 标签 -->
      <section v-if="tags.length" class="mb-10">
        <h2 class="text-meta font-medium uppercase tracking-[0.18em] text-ink-soft">Tags</h2>

        <ul class="mt-3 flex flex-wrap gap-2">
          <li v-for="tag in tags" :key="tag.name">
            <NuxtLink
              :to="`/tags/${encodeURIComponent(tag.name)}`"
              class="inline-flex items-baseline gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-card-hover hover:text-ink-strong"
            >
              {{ tag.name }}
              <span class="text-meta tabular-nums">{{ tag.count }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- 全部文章 -->
      <section>
        <h2 class="text-meta font-medium uppercase tracking-[0.18em] text-ink-soft">
          All posts
        </h2>

        <div class="mt-3 flex flex-col gap-4">
          <BlogPostCard v-for="post in posts" :key="post.slug" :post="post" />

          <p v-if="posts.length === 0" class="rounded-3xl bg-card p-8 text-center text-ink-soft">
            还没有文章。在 <code class="font-mono text-sm">content/posts/</code> 下新增一个
            <code class="font-mono text-sm">.md</code> 文件即可。
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
