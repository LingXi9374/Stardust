<script setup lang="ts">
const { site, nav } = useAppConfig()
const route = useRoute()
const { isDark, toggle } = useTheme()

/**
 * 移动端抽屉开合状态。
 *
 * 关闭态除了 -translate-x-full，还必须带 invisible：只把侧栏移出屏幕的话，
 * 里面的导航链接依然可聚焦、依然在无障碍树里，键盘用户会 Tab 进一个
 * 看不见的菜单。invisible (visibility: hidden) 同时移除焦点与无障碍树节点，
 * 桌面端由 lg:visible 复原。
 */
const open = ref(false)

const year = new Date().getFullYear()

watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <!-- 移动端：顶部条 + 抽屉导航 -->
  <header
    class="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line/60 bg-sidebar px-6 py-3.5 lg:hidden"
  >
    <NuxtLink to="/" class="text-xl font-light text-ink-strong">{{ site.name }}</NuxtLink>

    <button
      type="button"
      class="-mr-1.5 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-canvas/70"
      :aria-expanded="open"
      aria-controls="site-sidebar"
      :aria-label="open ? 'Close navigation' : 'Open navigation'"
      @click="open = !open"
    >
      <svg
        v-if="!open"
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        class="size-6"
      >
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
      <svg
        v-else
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        class="size-6"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  </header>

  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-150"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-30 bg-ink-strong/25 lg:hidden"
      @click="open = false"
    />
  </Transition>

  <aside
    id="site-sidebar"
    class="fixed inset-y-0 left-0 z-40 flex w-sidebar max-w-[85vw] flex-col bg-sidebar px-gutter py-12
           transition-[transform,visibility] duration-200 ease-out lg:visible lg:sticky lg:top-0 lg:z-0
           lg:h-screen lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:transition-none"
    :class="open ? 'visible translate-x-0 shadow-xl lg:shadow-none' : 'invisible -translate-x-full'"
  >
    <NuxtLink
      to="/"
      class="text-2xl font-light tracking-wide text-ink-strong transition-colors hover:text-ink"
      @click="open = false"
    >
      {{ site.name }}
    </NuxtLink>

    <nav class="flex flex-1 flex-col justify-center gap-0.5 py-10" aria-label="Primary">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="rounded-lg py-2 text-nav transition-colors"
        :class="
          isActive(item.to)
            ? 'font-semibold text-ink-strong'
            : 'font-normal text-ink-soft hover:text-ink-strong'
        "
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!--
      站内搜索。结果面板向上展开，会盖住导航——这是有意的：
      搜索框钉在侧栏底部，向下展开只能被视口下边缘切掉。
    -->
    <BlogSiteSearch />

    <div class="mt-auto flex items-end justify-between gap-3 pt-8">
      <p class="text-meta text-ink-soft">© {{ site.startYear }}–{{ year }}, {{ site.name }}</p>

      <button
        type="button"
        class="-mb-1 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-canvas/70 hover:text-ink-strong"
        :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
        :aria-pressed="isDark"
        @click="toggle()"
      >
        <svg
          v-if="!isDark"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          class="size-[1.15rem]"
        >
          <path d="M20.5 14.2A8.6 8.6 0 1 1 9.8 3.5a6.9 6.9 0 0 0 10.7 10.7Z" />
        </svg>
        <svg
          v-else
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          class="size-[1.15rem]"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"
          />
        </svg>
      </button>
    </div>
  </aside>
</template>
