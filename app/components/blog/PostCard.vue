<script setup lang="ts">
import type { PostSummary } from '~~/shared/types/content'

const props = defineProps<{ post: PostSummary }>()

const { label } = useReadingTime(() => props.post.readingMinutes)

/** 有自定义封面用它，没有就用随机图（每次刷新换一张） */
const { coverOf } = usePostCover()
const cover = computed(() => coverOf(props.post))

/**
 * 元信息行的结构约定（说明留在脚本里而不是 HTML 注释——注释会留在开发期的
 * DOM 中，可能被无障碍检查工具算进可访问名称）：
 * - 分隔点 ` · ` 对辅助技术隐藏
 * - 日期与阅读时间各自包在元素里，不能留裸文本节点，
 *   否则屏幕阅读器会把两者连读成 "2026/01/123 min read"
 * - 置顶角标绝对定位在右上角，标题的 truncate 边界正好落在它下面，
 *   因此置顶时标题要带 pr-24 让出角标宽度，否则长标题会被压住
 */
</script>

<template>
  <NuxtLink
    :to="`/posts/${post.slug}`"
    class="group relative flex items-center gap-4 rounded-[1.75rem] bg-card p-4 transition-colors hover:bg-card-hover sm:gap-5 sm:p-5"
  >
    <!-- 缩略图：文章自定义封面，或随机图 API 给的一张 -->
    <BlogImage
      :src="cover"
      :alt="post.title"
      class="h-16 w-24 shrink-0 rounded-2xl sm:h-[5.5rem] sm:w-44"
    />

    <div class="min-w-0 flex-1">
      <h2
        class="truncate text-lg font-semibold text-ink-strong sm:text-xl"
        :class="post.pinned ? 'pr-24' : ''"
      >
        {{ post.title }}
      </h2>
      <p class="mt-1 line-clamp-1 text-sm text-ink-soft">{{ post.description }}</p>
      <p class="mt-2 text-meta text-ink-soft sm:mt-3">
        <time :datetime="post.date">{{ formatDate(post.date) }}</time>
        <span aria-hidden="true"> · </span>
        <span class="sr-only">, </span>
        <span>{{ label }}</span>
      </p>
    </div>

    <BlogPinnedBadge
      v-if="post.pinned"
      class="absolute right-4 top-4 sm:right-5"
      tone="canvas"
    />
  </NuxtLink>
</template>
