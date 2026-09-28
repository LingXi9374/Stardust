<script setup lang="ts">
import type { TocHeading } from '~~/shared/types/content'

const props = defineProps<{ headings: TocHeading[] }>()

const activeId = ref('')
let observer: IntersectionObserver | null = null

/**
 * 滚动高亮：进入视口上 1/3 区域的标题里取最靠上的一个。
 * 左侧栏 TOC 允许 sticky（AGENTS.md 4.5）。
 */
onMounted(() => {
  if (props.headings.length === 0) return

  const elements = props.headings
    .map((heading) => document.getElementById(heading.id))
    .filter((element): element is HTMLElement => element !== null)

  if (elements.length === 0) return

  activeId.value = elements[0]?.id ?? ''

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

      const first = visible[0]
      if (first) activeId.value = first.target.id
    },
    { rootMargin: '-88px 0px -68% 0px', threshold: 0 },
  )

  elements.forEach((element) => observer?.observe(element))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <nav v-if="headings.length" class="sticky top-12" aria-label="On this page">
    <p class="text-meta font-medium uppercase tracking-[0.18em] text-ink-soft">On this page</p>

    <ul class="mt-3 space-y-0.5">
      <li v-for="heading in headings" :key="heading.id">
        <a
          :href="`#${heading.id}`"
          class="block border-l-2 py-1 pr-2 text-sm leading-snug transition-colors"
          :class="[
            heading.level === 3 ? 'pl-6' : 'pl-3',
            activeId === heading.id
              ? 'border-accent font-medium text-ink-strong'
              : 'border-line text-ink-soft hover:text-ink-strong',
          ]"
          :aria-current="activeId === heading.id ? 'location' : undefined"
        >
          {{ heading.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
