<script setup lang="ts">
/**
 * 阅读中的浮层操作：回到顶部、回到 Contents。
 *
 * 只在向下滚过一屏后才出现——刚进文章时文章头部那条「← Contents」就够用了，
 * 一上来就挂两个按钮属于噪音。
 *
 * 位置在右下：左侧是固定侧栏，正文居中偏左，右下是唯一不会压住任何内容的角落。
 */
const props = withDefaults(
  defineProps<{
    /** 滚过多少像素后出现 */
    threshold?: number
  }>(),
  { threshold: 600 },
)

const visible = ref(false)
let frame = 0

function update(): void {
  frame = 0
  visible.value = window.scrollY > props.threshold
}

/** 滚动回调里直接读 scrollY 会触发强制同步布局，用 rAF 合并成每帧一次 */
function onScroll(): void {
  if (frame) return
  frame = window.requestAnimationFrame(update)
}

function toTop(): void {
  // 读者关掉动效时不要平滑滚动
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (frame) window.cancelAnimationFrame(frame)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-2 opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div v-if="visible" class="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <button
        type="button"
        class="grid size-11 place-items-center rounded-full border border-line bg-card text-ink shadow-lg transition-colors hover:bg-card-hover hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-deep"
        aria-label="回到顶部"
        @click="toTop"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M12 19V5M6 11l6-6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <NuxtLink
        to="/contents"
        class="grid size-11 place-items-center rounded-full border border-line bg-card text-ink shadow-lg transition-colors hover:bg-card-hover hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-deep"
        aria-label="回到 Contents 页"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M4 6.5h16M4 12h16M4 17.5h10" stroke-linecap="round" />
        </svg>
      </NuxtLink>
    </div>
  </Transition>
</template>
