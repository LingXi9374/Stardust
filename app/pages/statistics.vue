<script setup lang="ts">
import { siteMeta } from '~~/blog.config'
import type { PostSummary } from '~~/shared/types/content'
import type { SiteInfo } from '~~/shared/types/site'
import { daysBetween } from '~~/shared/utils/date'

/**
 * Statistics 页。
 *
 * 版面是 Win10 开始屏幕的磁贴：等宽网格 + 可跨列的方块，
 * 靠「实心 / 描边」区分主次，颜色全部取自锁定色板。
 *
 * 今天取访客系统时区（useToday），所以运行时长与最后活动对谁都准。
 */
const { data: info } = await useFetch<SiteInfo>('/api/site-info')
const { data: posts } = await useFetch<PostSummary[]>('/api/posts', { default: () => [] })

const today = useToday()

const build = computed(() => info.value?.build)
const stats = computed(() => info.value?.stats)

const runningDays = computed(() =>
  stats.value ? daysBetween(stats.value.since, today.value) : 0,
)

const idleDays = computed(() =>
  stats.value?.lastActive ? daysBetween(stats.value.lastActive, today.value) : 0,
)

const counts = computed(() => {
  const map = new Map<string, number>()
  for (const post of posts.value) map.set(post.date, (map.get(post.date) ?? 0) + 1)
  return map
})

/** ISO 时间戳转成本地可读格式；构建时间拿不到就显示占位 */
const builtAtText = computed(() => {
  const raw = build.value?.builtAt
  if (!raw) return '未知'

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
})

const numberFormat = new Intl.NumberFormat('zh-CN')

/**
 * 站点信息的图标。
 *
 * 这些磁贴的值都是「文本」而非数字，没有图标时整块版面会是清一色的字，
 * 所以每个给一个左侧图标。路径统一 24×24 描边风格，与站内其它图标一致。
 */
const ICONS = {
  platform: 'M7 18h9.5a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 6.2 11.3 3.5 3.5 0 0 0 7 18Z',
  version: 'M4 11.5V5.5a1 1 0 0 1 1-1h6a1 1 0 0 1 .7.3l7.5 7.5a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0L4.3 12.2a1 1 0 0 1-.3-.7Z M8.5 8.5h.01',
  license: 'M12 3.5 5.5 6v5.5c0 4 2.8 7.3 6.5 8.5 3.7-1.2 6.5-4.5 6.5-8.5V6Z M9.3 11.8l1.9 1.9 3.5-3.5',
  nuxt: 'M3.5 18.5 9.8 8l3.6 6 M13 18.5l3.4-5.6 4.1 5.6Z',
  node: 'M12 3.2 19.5 7.5v8.6L12 20.4 4.5 16.1V7.5Z',
  bun: 'M12 3.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4Z M12 10.5v4.5',
  tailwind: 'M5 11.5c1.5-3 3.5-4.5 6-4.5 3.8 0 4.5 3 7 3 M5 16.5c1.5-3 3.5-4.5 6-4.5 3.8 0 4.5 3 7 3',
  builtAt: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M12 7.5V12l3 1.8',
  os: 'M4 5.5h16v10H4Z M9.5 19h5 M12 15.5V19',
} as const

usePageSeo({
  title: 'Statistics',
  description: '站点的构建信息与内容统计：文章数、合集数、标签数、总字数，以及发布日历与活跃度。',
})
</script>

<template>
  <div class="px-6 py-12 sm:px-10 lg:px-16 lg:py-14">
    <UiPageHeader title="Statistics" lead="这份产物是什么时候、在哪儿、用什么构建的，以及站点的内容概况。" />

    <!-- ── 站点统计 ── -->
    <section class="mt-10">
      <h2 class="text-meta font-medium uppercase tracking-[0.12em] text-ink-soft">站点统计</h2>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <BlogStatTile label="文章" :value="stats?.posts ?? 0" />
        <BlogStatTile label="合集" :value="stats?.collections ?? 0" />
        <BlogStatTile label="标签" :value="stats?.tags ?? 0" />
        <BlogStatTile
          label="总字数"
          :value="numberFormat.format(stats?.words ?? 0)"
          :hint="`中日韩按字、拉丁按词`"
        />
        <BlogStatTile
          label="运行时长"
          :value="runningDays"
          unit="天"
          :hint="`自 ${stats?.since ?? '—'}`"
          :span="2"
        />
        <BlogStatTile
          label="最后活动"
          :value="idleDays"
          unit="天前"
          :hint="stats?.lastActive || '还没有文章'"
          :span="2"
        />
      </div>
    </section>

    <!-- ── 站点信息 ── -->
    <section class="mt-10">
      <h2 class="text-meta font-medium uppercase tracking-[0.12em] text-ink-soft">站点信息</h2>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <BlogStatTile layout="row" label="构建平台" :value="build?.platform ?? '—'">
          <template #icon>
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path :d="ICONS.platform" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
        </BlogStatTile>

        <BlogStatTile layout="row" label="Blog 版本" :value="build?.blogVersion ?? '—'">
          <template #icon>
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path :d="ICONS.version" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
        </BlogStatTile>

        <BlogStatTile layout="row" label="文章许可" :value="build?.license ?? '—'" :span="2">
          <template #icon>
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path :d="ICONS.license" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
        </BlogStatTile>

        <BlogStatTile layout="row" label="Nuxt" :value="build?.nuxt || '—'">
          <template #icon>
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path :d="ICONS.nuxt" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
        </BlogStatTile>

        <BlogStatTile layout="row" label="Node" :value="build?.node || '—'">
          <template #icon>
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path :d="ICONS.node" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
        </BlogStatTile>

        <BlogStatTile layout="row" label="Bun" :value="build?.bun || '—'">
          <template #icon>
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path :d="ICONS.bun" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
        </BlogStatTile>

        <BlogStatTile layout="row" label="Tailwind CSS" :value="build?.tailwind || '—'">
          <template #icon>
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path :d="ICONS.tailwind" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
        </BlogStatTile>

        <BlogStatTile
          layout="row"
          label="构建时间"
          :value="builtAtText"
          :hint="`本站起始于 ${siteMeta.since}`"
          :span="2"
        >
          <template #icon>
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path :d="ICONS.builtAt" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
        </BlogStatTile>

        <BlogStatTile layout="row" label="系统信息" :value="build?.os ?? '—'" :span="2">
          <template #icon>
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path :d="ICONS.os" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
        </BlogStatTile>
      </div>
    </section>

    <!-- ── 日历与活跃度 ── -->
    <section class="mt-10">
      <h2 class="text-meta font-medium uppercase tracking-[0.12em] text-ink-soft">发布日历</h2>

      <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div class="rounded-2xl border border-line bg-card p-5">
          <BlogPostCalendar :posts="posts" />
        </div>

        <div class="rounded-2xl border border-line bg-card p-5">
          <BlogActivityGrid :counts="counts" />
        </div>
      </div>
    </section>
  </div>
</template>
