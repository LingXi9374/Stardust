<script setup lang="ts">
import type { PostSummary } from '~~/shared/types/content'

const props = defineProps<{ posts: PostSummary[] }>()

interface YearGroup {
  year: string
  posts: PostSummary[]
}

/**
 * 按年份倒序分组。列表进入组件时已经是有序的（置顶优先、其后日期倒序），
 * 因此这里只需保持首次出现的顺序，不重新排序。
 *
 * 结构说明（刻意不写成 HTML 注释——注释会留在开发期的 DOM 里，
 * 并可能被无障碍检查工具算进列表项的可访问名称中）：
 * - 每组是一条竖直主线（1px，aria-hidden），与下面的节点圆点同心
 * - 节点圆点绝对定位在每项左侧 0 处，尺寸 7px，因此圆心落在 x=3.5px
 * - 主线的 left-[3px] + w-px 让其中线同样落在 x=3.5px
 */
const groups = computed<YearGroup[]>(() => {
  const buckets = new Map<string, PostSummary[]>()

  for (const post of props.posts) {
    const year = post.date.slice(0, 4) || 'Undated'
    const bucket = buckets.get(year)
    if (bucket) bucket.push(post)
    else buckets.set(year, [post])
  }

  return [...buckets.entries()].map(([year, posts]) => ({ year, posts }))
})
</script>

<template>
  <div class="space-y-10">
    <section v-for="group in groups" :key="group.year">
      <h2 class="text-meta font-medium uppercase tracking-[0.18em] text-ink-soft">
        {{ group.year }}
      </h2>

      <div class="relative mt-4">
        <span class="absolute bottom-4 left-[3px] top-4 w-px bg-line" aria-hidden="true" />

        <ol>
          <li
            v-for="post in group.posts"
            :key="post.slug"
            class="relative pb-7 pl-8 last:pb-0"
          >
            <span
              class="absolute left-0 top-[0.5rem] size-[7px] rounded-full bg-accent"
              aria-hidden="true"
            />

            <NuxtLink :to="`/posts/${post.slug}`" class="group block">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <time :datetime="post.date" class="text-meta tabular-nums text-ink-soft">
                  {{ formatMonthDay(post.date) }}
                </time>

                <BlogPinnedBadge v-if="post.pinned" tone="plain" />

                <span class="text-meta text-ink-soft">{{ post.readingMinutes }} min read</span>
              </div>

              <h3
                class="mt-1.5 font-medium text-ink-strong transition-colors group-hover:text-ink"
              >
                {{ post.title }}
              </h3>

              <p v-if="post.description" class="mt-1 text-sm leading-relaxed text-ink-soft">
                {{ post.description }}
              </p>
            </NuxtLink>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>
