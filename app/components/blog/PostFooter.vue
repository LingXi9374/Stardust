<script setup lang="ts">
import { siteMeta } from '~~/blog.config'
import type { PostDetail } from '~~/shared/types/content'

const props = defineProps<{ post: PostDetail }>()

const { site } = useAppConfig()

/**
 * 当前日期。
 *
 * 用 useState 让服务端与客户端共用同一个值：两边各自调 new Date() 时，
 * 跨零点渲染会出现「服务端说 99 天、客户端说 100 天」的 hydration 不匹配。
 */
const today = useState('site-today', () => new Date().toISOString().slice(0, 10))

/** 展示用的日期：优先「最后更新」，没写就用发布日 */
const displayDate = computed(() => props.post.updated || props.post.date)

/** 距今天数。按 UTC 零点做差，避免时区与夏令时把结果算成 0.99 天 */
const daysSince = computed(() => {
  const source = displayDate.value
  if (!source) return 0

  const start = Date.parse(`${source}T00:00:00Z`)
  if (Number.isNaN(start)) return 0

  const [y, m, d] = today.value.split('-').map(Number)
  if (!y || !m || !d) return 0

  return Math.max(0, Math.round((Date.UTC(y, m - 1, d) - start) / 86_400_000))
})

/**
 * 是否提示「内容可能已过时」。
 * 阈值在 blog.config.ts 的 siteMeta.outdatedAfterDays，设 0 则永不提示。
 */
const outdated = computed(
  () => siteMeta.outdatedAfterDays > 0 && daysSince.value > siteMeta.outdatedAfterDays,
)

const permalink = computed(() => {
  const { public: publicConfig } = useRuntimeConfig()
  const base = String(publicConfig.siteUrl || '').replace(/\/+$/, '')
  return base ? `${base}/posts/${props.post.slug}` : `/posts/${props.post.slug}`
})
</script>

<template>
  <footer class="mt-14">
    <!-- 过时提示：只在超过阈值时出现，避免每篇老文章都挂一条 -->
    <div
      v-if="outdated"
      class="flex items-start gap-3 rounded-2xl border border-line bg-card px-4 py-3.5"
      role="note"
    >
      <svg
        class="mt-0.5 size-5 shrink-0 text-ink-soft"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>

      <p class="text-sm leading-relaxed text-ink">
        最后更新于
        <time :datetime="displayDate" class="font-medium text-ink-strong">{{ displayDate }}</time>
        ，距今已过 <span class="font-medium text-ink-strong">{{ daysSince }}</span> 天。
        <span class="block text-ink-soft">部分内容可能已过时。</span>
      </p>
    </div>

    <!-- 许可说明 -->
    <div class="relative mt-4 overflow-hidden rounded-2xl border border-line bg-card p-5">
      <!-- 协议水印，纯装饰 -->
      <svg
        class="pointer-events-none absolute -right-6 -top-6 size-40 text-ink-soft opacity-[0.07]"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 1.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8Zm-2.2 5a3.4 3.4 0 0 0 0 6.8c1 0 1.9-.45 2.5-1.16l-1.1-.75a1.9 1.9 0 1 1 0-3.08l1.1-.75A3.4 3.4 0 0 0 9.8 8.6Zm6 0a3.4 3.4 0 0 0 0 6.8c1 0 1.9-.45 2.5-1.16l-1.1-.75a1.9 1.9 0 1 1 0-3.08l1.1-.75a3.4 3.4 0 0 0-2.5-1.06Z"
        />
      </svg>

      <dl class="relative grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <div class="sm:col-span-2">
          <dt class="text-meta text-ink-soft">标题</dt>
          <dd class="mt-0.5 font-medium text-ink-strong">{{ post.title }}</dd>
        </div>

        <div class="sm:col-span-2">
          <dt class="text-meta text-ink-soft">链接</dt>
          <dd class="mt-0.5">
            <a
              :href="permalink"
              class="break-all text-ink underline decoration-line underline-offset-4 transition-colors hover:text-ink-strong"
            >
              {{ permalink }}
            </a>
          </dd>
        </div>

        <div>
          <dt class="text-meta text-ink-soft">作者</dt>
          <dd class="mt-0.5 text-ink">{{ site.author }}</dd>
        </div>

        <div>
          <dt class="text-meta text-ink-soft">发布于</dt>
          <dd class="mt-0.5 text-ink">
            <time :datetime="post.date">{{ post.date }}</time>
          </dd>
        </div>

        <div class="sm:col-span-2">
          <dt class="text-meta text-ink-soft">许可协议</dt>
          <dd class="mt-0.5">
            <a
              :href="siteMeta.license.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-ink underline decoration-line underline-offset-4 transition-colors hover:text-ink-strong"
            >
              {{ siteMeta.license.name }}
            </a>
          </dd>
        </div>
      </dl>
    </div>
  </footer>
</template>
