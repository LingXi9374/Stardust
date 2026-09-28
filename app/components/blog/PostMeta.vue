<script setup lang="ts">
const props = defineProps<{
  date: string
  readingMinutes: number
  tags?: string[]
}>()

const { label } = useReadingTime(() => props.readingMinutes)

/**
 * 视觉分隔点 `·` 对辅助技术隐藏，紧随其后的是 sr-only 的逗号：
 * 视觉上只看到圆点，播报时听到的是停顿，而不是把日期和阅读时间连成一串。
 */
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-meta text-ink-soft">
    <time :datetime="date">{{ formatDate(date) }}</time>
    <span aria-hidden="true">·</span>
    <span class="sr-only">, </span>
    <span>{{ label }}</span>

    <template v-if="tags && tags.length">
      <span aria-hidden="true">·</span>
      <span class="sr-only">, </span>
      <span class="flex flex-wrap gap-1.5">
        <NuxtLink
          v-for="tag in tags"
          :key="tag"
          :to="`/tags/${encodeURIComponent(tag)}`"
          class="rounded-full bg-card px-2.5 py-0.5 transition-colors hover:bg-card-hover hover:text-ink-strong"
        >
          {{ tag }}
        </NuxtLink>
      </span>
    </template>
  </div>
</template>
