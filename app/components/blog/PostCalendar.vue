<script setup lang="ts">
import { daysInMonth, weekdayOf } from '~~/shared/utils/date'
import type { PostSummary } from '~~/shared/types/content'

/**
 * 文章日历。
 *
 * 今天由 `useToday()` 按访客系统时区给出；有文章的日期在数字下方点一个点；
 * 点选某天后，下方列出当天的文章。
 */
const props = defineProps<{ posts: PostSummary[] }>()

const today = useToday()

/** 日期 → 当天的文章 */
const byDate = computed(() => {
  const map = new Map<string, PostSummary[]>()
  for (const post of props.posts) {
    const list = map.get(post.date)
    if (list) list.push(post)
    else map.set(post.date, [post])
  }
  return map
})

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

const [initialYear, initialMonth] = today.value.split('-').map(Number)
const cursor = ref({ year: initialYear || 2024, month: initialMonth || 1 })

/**
 * 默认选中：今天有文章就选今天，否则选日期最近的那一篇。
 * 不能直接取 posts[0]——列表是「置顶优先」排的，第一篇未必是最新的。
 * 留空面板会让人以为页面坏了。
 */
const latestDate = computed(() =>
  props.posts.reduce((max, post) => (post.date > max ? post.date : max), ''),
)

const selected = ref(
  byDate.value.has(today.value) ? today.value : latestDate.value,
)

const monthLabel = computed(() => `${cursor.value.year} 年 ${cursor.value.month} 月`)

const isCurrentMonth = computed(() => {
  const [y, m] = today.value.split('-').map(Number)
  return cursor.value.year === y && cursor.value.month === m
})

interface DayCell {
  day: number
  iso: string
  count: number
}

/** 前导空格 + 当月每一天。用 null 占位，网格才对得齐 */
const cells = computed<(DayCell | null)[]>(() => {
  const { year, month } = cursor.value
  const lead = weekdayOf(year, month, 1)
  const total = daysInMonth(year, month)

  const out: (DayCell | null)[] = Array.from({ length: lead }, () => null)

  for (let day = 1; day <= total; day += 1) {
    const iso = `${year}-${pad(month)}-${pad(day)}`
    out.push({ day, iso, count: byDate.value.get(iso)?.length ?? 0 })
  }

  return out
})

const selectedPosts = computed(() => byDate.value.get(selected.value) ?? [])

function shiftMonth(step: number): void {
  const { year, month } = cursor.value
  const next = month + step

  if (next < 1) cursor.value = { year: year - 1, month: 12 }
  else if (next > 12) cursor.value = { year: year + 1, month: 1 }
  else cursor.value = { year, month: next }
}

function goToday(): void {
  const [y, m] = today.value.split('-').map(Number)
  cursor.value = { year: y || 2024, month: m || 1 }
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-card-hover hover:text-ink-strong"
          aria-label="上一个月"
          @click="shiftMonth(-1)"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          class="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-card-hover hover:text-ink-strong"
          aria-label="下一个月"
          @click="shiftMonth(1)"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          v-if="!isCurrentMonth"
          type="button"
          class="ml-1 rounded-lg px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-card-hover hover:text-ink-strong"
          @click="goToday"
        >
          回到本月
        </button>
      </div>

      <p class="text-sm font-medium text-ink-strong" aria-live="polite">{{ monthLabel }}</p>
    </div>

    <div class="mt-3 grid grid-cols-7 gap-1 text-center">
      <span v-for="label in WEEKDAYS" :key="label" class="py-1 text-[0.6875rem] text-ink-soft">
        {{ label }}
      </span>
    </div>

    <div class="grid grid-cols-7 gap-1">
      <template v-for="(cell, index) in cells" :key="index">
        <span v-if="!cell" />

        <button
          v-else
          type="button"
          class="relative grid aspect-square place-items-center rounded-lg text-sm tabular-nums transition-colors"
          :class="[
            cell.iso === selected
              ? 'bg-accent font-medium text-[#0b2b33]'
              : 'text-ink hover:bg-card-hover',
            cell.iso === today && cell.iso !== selected ? 'ring-1 ring-accent-deep' : '',
          ]"
          :aria-label="`${cell.iso}，${cell.count} 篇文章`"
          :aria-pressed="cell.iso === selected"
          @click="selected = cell.iso"
        >
          {{ cell.day }}

          <!-- 有文章的日期在数字下方点一个点 -->
          <span
            v-if="cell.count > 0"
            class="absolute bottom-1 size-1 rounded-full"
            :class="cell.iso === selected ? 'bg-[#0b2b33]' : 'bg-accent-deep'"
          />
        </button>
      </template>
    </div>

    <div class="mt-4 border-t border-line pt-4">
      <p class="text-xs text-ink-soft">
        <template v-if="selected">{{ selected }}</template>
        <template v-else>尚未选择日期</template>
        <span v-if="selectedPosts.length"> · {{ selectedPosts.length }} 篇</span>
      </p>

      <ul v-if="selectedPosts.length" class="mt-2 space-y-1.5">
        <li v-for="post in selectedPosts" :key="post.slug">
          <NuxtLink
            :to="`/posts/${post.slug}`"
            class="flex items-baseline gap-2 text-sm text-ink transition-colors hover:text-ink-strong"
          >
            <span class="mt-1 size-1 shrink-0 rounded-full bg-accent-deep" aria-hidden="true" />
            <span class="min-w-0">{{ post.title }}</span>
          </NuxtLink>
        </li>
      </ul>

      <p v-else-if="selected" class="mt-2 text-sm text-ink-soft">这天没有发布文章。</p>
    </div>
  </div>
</template>
