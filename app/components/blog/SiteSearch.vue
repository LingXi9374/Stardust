<script setup lang="ts">
import type { SearchHit, SearchResponse } from '~~/shared/types/search'

/**
 * 侧栏站内搜索。
 *
 * 用 $fetch 直接发起查询而不是 useFetch：这是「边打字边查」的命令式请求，
 * 没有初始数据要预取，也不该在服务端渲染时白跑一次空查询。
 * 并发请求用 AbortController 掐掉，否则慢的那个后返回会盖掉新结果。
 */
const DEBOUNCE_MS = 220
const RESULT_LIMIT = 8

const query = ref('')
const hits = ref<SearchHit[]>([])
const total = ref(0)
const pending = ref(false)
/** 已经查过一次且确实没有结果——用来区分「还没输入」和「查了没找到」 */
const searched = ref(false)

const open = ref(false)
const activeIndex = ref(-1)

const input = ref<HTMLInputElement | null>(null)

let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined

/** 与服务端 parseQuery 保持一致，用于本地高亮 */
const terms = computed(() =>
  query.value
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean),
)

function reset(): void {
  hits.value = []
  total.value = 0
  searched.value = false
  activeIndex.value = -1
  open.value = false
}

watch(query, (value) => {
  clearTimeout(timer)
  controller?.abort()

  if (!value.trim()) {
    pending.value = false
    reset()
    return
  }

  pending.value = true
  open.value = true

  timer = setTimeout(() => {
    void run(value)
  }, DEBOUNCE_MS)
})

async function run(value: string): Promise<void> {
  const current = new AbortController()
  controller = current

  try {
    const response = await $fetch<SearchResponse>(searchEndpoint(value, RESULT_LIMIT), {
      signal: current.signal,
    })

    // 迟到的响应直接丢弃，别覆盖用户已经看到的新结果
    if (current.signal.aborted) return

    hits.value = response.hits
    total.value = response.total
    activeIndex.value = response.hits.length > 0 ? 0 : -1
  } catch {
    // abort 会走到这里，属于正常流程，不当错误处理
    if (current.signal.aborted) return
    hits.value = []
    total.value = 0
  } finally {
    if (!current.signal.aborted) {
      pending.value = false
      searched.value = true
    }
  }
}

function go(hit: SearchHit | undefined): void {
  if (!hit) return
  query.value = ''
  reset()
  input.value?.blur()
  void navigateTo(`/posts/${hit.slug}`)
}

function move(step: number): void {
  if (hits.value.length === 0) return
  const count = hits.value.length
  activeIndex.value = (activeIndex.value + step + count) % count
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    open.value = true
    move(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    open.value = true
    move(-1)
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    go(hits.value[activeIndex.value])
    return
  }
  if (event.key === 'Escape') {
    if (!query.value) return
    event.preventDefault()
    query.value = ''
    reset()
    input.value?.blur()
  }
}

/** 点击组件外部就收起结果面板 */
function onDocumentPointerDown(event: PointerEvent): void {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!root.value?.contains(target)) open.value = false
}

const root = ref<HTMLElement | null>(null)

/** ⌘K / Ctrl+K 聚焦搜索框 */
function onShortcut(event: KeyboardEvent): void {
  if (event.key !== 'k' || !(event.metaKey || event.ctrlKey)) return
  event.preventDefault()
  input.value?.focus()
  input.value?.select()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  window.addEventListener('keydown', onShortcut)
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  controller?.abort()
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('keydown', onShortcut)
})

/**
 * 把命中词从文本里切出来单独渲染成 <mark>。
 *
 * 分成片段返回而不是拼一段带标签的 HTML 再 v-html——搜索词来自读者输入，
 * 拼接 HTML 等于把用户输入放进 v-html，那是注入面。
 */
interface Segment {
  text: string
  hit: boolean
}

function highlight(text: string, needles: string[]): Segment[] {
  if (!text) return []
  if (needles.length === 0) return [{ text, hit: false }]

  const lower = text.toLowerCase()
  const ranges: Array<[number, number]> = []

  for (const needle of needles) {
    let at = lower.indexOf(needle)
    while (at !== -1) {
      ranges.push([at, at + needle.length])
      at = lower.indexOf(needle, at + needle.length)
    }
  }

  if (ranges.length === 0) return [{ text, hit: false }]

  ranges.sort((a, b) => a[0] - b[0])

  // 合并重叠区间，否则相邻命中会切出空片段
  const merged: Array<[number, number]> = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([range[0], range[1]])
  }

  const segments: Segment[] = []
  let cursor = 0

  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), hit: false })
    segments.push({ text: text.slice(start, end), hit: true })
    cursor = end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), hit: false })

  return segments
}
</script>

<template>
  <div ref="root" class="relative mt-6">
    <div
      class="flex items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2
             transition-colors focus-within:border-accent-deep"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        class="size-4 shrink-0 text-ink-soft"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>

      <label for="site-search" class="sr-only">搜索文章</label>
      <input
        id="site-search"
        ref="input"
        v-model="query"
        type="search"
        placeholder="搜索文章…"
        autocomplete="off"
        role="combobox"
        aria-controls="site-search-results"
        :aria-expanded="open"
        :aria-activedescendant="activeIndex >= 0 ? `site-search-hit-${activeIndex}` : undefined"
        class="min-w-0 flex-1 bg-transparent text-sm text-ink-strong placeholder:text-ink-soft
               focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        @keydown="onKeydown"
        @focus="open = Boolean(query.trim())"
      >
    </div>

    <!--
      向上展开：搜索框钉在侧栏底部，向下展开会被视口下边缘（以及操作系统的任务栏）切掉。
      高度同时受 20rem 与视口高度约束，矮屏幕上不会顶出屏幕外。
    -->
    <div
      v-if="open"
      id="site-search-results"
      role="listbox"
      aria-label="搜索结果"
      class="absolute inset-x-0 bottom-full z-50 mb-2 max-h-[min(20rem,60vh)] overflow-y-auto
             rounded-xl border border-line bg-canvas p-1.5 shadow-lg"
    >
      <p v-if="pending && hits.length === 0" class="px-2.5 py-2 text-xs text-ink-soft">
        搜索中…
      </p>

      <p v-else-if="searched && hits.length === 0" class="px-2.5 py-2 text-xs text-ink-soft">
        没有找到「{{ query.trim() }}」相关的文章。
      </p>

      <template v-else>
        <button
          v-for="(hit, index) in hits"
          :id="`site-search-hit-${index}`"
          :key="hit.slug"
          type="button"
          role="option"
          :aria-selected="index === activeIndex"
          class="block w-full rounded-lg px-2.5 py-2 text-left transition-colors"
          :class="index === activeIndex ? 'bg-card' : 'hover:bg-card'"
          @click="go(hit)"
          @mousemove="activeIndex = index"
        >
          <span class="block truncate text-sm font-medium text-ink-strong">
            <template v-for="(segment, i) in highlight(hit.title, terms)" :key="i">
              <mark v-if="segment.hit" class="bg-accent/45 text-inherit">{{ segment.text }}</mark>
              <template v-else>{{ segment.text }}</template>
            </template>
          </span>

          <span class="mt-0.5 block truncate text-[0.6875rem] text-ink-soft">
            <template v-if="hit.collectionName">{{ hit.collectionName }} · </template>{{ hit.date }}
          </span>

          <span v-if="hit.snippet" class="mt-1 line-clamp-2 block text-xs text-ink-soft">
            <template v-for="(segment, i) in highlight(hit.snippet, terms)" :key="i">
              <mark v-if="segment.hit" class="bg-accent/45 text-inherit">{{ segment.text }}</mark>
              <template v-else>{{ segment.text }}</template>
            </template>
          </span>
        </button>

        <p v-if="total > hits.length" class="px-2.5 py-1.5 text-[0.6875rem] text-ink-soft">
          还有 {{ total - hits.length }} 篇未列出，试试更具体的关键词。
        </p>
      </template>
    </div>
  </div>
</template>
