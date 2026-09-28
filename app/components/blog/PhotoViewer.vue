<script setup lang="ts">
/**
 * 文章照片查看器。
 *
 * 与图表查看器（逻辑在 content.client.ts 里）刻意分离：
 * 两者虽然都是「半透明黑底 + 右上角关闭」的观感，但交互模型完全不同——
 * 照片是多张之间切换，图表是单张缩放平移。混在一起会让两边都变复杂。
 *
 * 但**缩放这一块两边用的是同一套做法**（translate + scale、中心缩放、拖动平移、
 * 边界限制、复位），细节和踩过的坑见下面 zoom 那一段的注释。
 *
 * 注意：usePhotoViewer 必须**显式导入**。
 * Nuxt 生成 .nuxt/imports.d.ts 时会漏掉它——同一个目录下其他合成式（useCollections、
 * useMedia…）都正常，唯独这个文件只导出了 SLIDESHOW_INTERVAL / ZOOM_LEVELS / PhotoItem，
 * 与文件名同名的那个函数反而不在列表里。删掉 .nuxt 重新 prepare 依然如此，不是缓存问题。
 * 这是 Nuxt 扫描的内部行为，显式导入是确定可行的绕法。
 */
import { SLIDESHOW_INTERVAL, ZOOM_LEVELS, usePhotoViewer } from '~/composables/usePhotoViewer'
const {
  items,
  activeIndex,
  isOpen,
  current,
  total,
  canSlide,
  playing,
  stripVisible,
  isFullscreen,
  close,
  go,
  select,
} = usePhotoViewer()

const root = ref<HTMLElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const stageImage = ref<HTMLImageElement | null>(null)

/** 打开前记录焦点，关闭后还回去，键盘用户不会丢位置 */
let lastFocused: HTMLElement | null = null

/* ── 幻灯片 ─────────────────────────────────────────────────────── */

let timer: number | null = null

function stopTimer(): void {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}

/** 手动翻页时重置计时，否则刚翻过去就可能立刻又被自动翻走 */
function restartTimer(): void {
  if (!playing.value || !isOpen.value) return
  stopTimer()
  timer = window.setInterval(() => go(1), SLIDESHOW_INTERVAL)
}

function togglePlay(): void {
  playing.value = !playing.value
}

function manualGo(step: number): void {
  go(step)
  restartTimer()
}

function manualSelect(index: number): void {
  select(index)
  restartTimer()
}

watch([playing, isOpen], ([active, open]) => {
  if (import.meta.server) return
  if (active && open) restartTimer()
  else stopTimer()
})

onBeforeUnmount(stopTimer)

/* ── 全屏 ───────────────────────────────────────────────────────── */

async function toggleFullscreen(): Promise<void> {
  if (import.meta.server) return

  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await root.value?.requestFullscreen()
  } catch {
    // 浏览器不支持或用户拒绝，保持原状即可，不打断浏览
  }
}

function syncFullscreen(): void {
  isFullscreen.value = Boolean(document.fullscreenElement)
  // 全屏切换后画布尺寸变了，边界要重新量
  void nextTick(measureStage)
}

/* ── 缩放与平移 ─────────────────────────────────────────────────── */

const zoomIndex = ref(0)
/** 平移量（屏幕像素）。用普通对象而不是 ref：拖动时每帧都写 DOM，不走响应式。 */
const pan = { x: 0, y: 0 }
/** 缓存的尺寸，拖动过程中不再读布局 */
const metrics = { imgW: 0, imgH: 0, availW: 0, availH: 0 }

function zoomLevel(): number {
  return ZOOM_LEVELS[zoomIndex.value] ?? 1
}

/**
 * 量一次尺寸并缓存。
 *
 * 只在「换图 / 改缩放 / 改窗口尺寸 / 进出全屏」时调用，拖动过程中一律用缓存值——
 * 指针每移动一像素都去读 offsetWidth 或 getComputedStyle 会触发强制同步布局。
 */
function measureStage(): void {
  const image = stageImage.value
  const box = stage.value
  if (!image || !box) return

  const style = window.getComputedStyle(box)
  metrics.imgW = image.offsetWidth
  metrics.imgH = image.offsetHeight
  metrics.availW =
    box.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight)
  metrics.availH =
    box.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom)
}

/**
 * 限制平移范围：放大后超出画布的那一圈，最多只能移到边缘对齐。
 *
 * 边界按**图片实际渲染尺寸**算，而不是容器的尺寸——
 * 图片在 1× 时未必填满容器（长图会被高度限制），用容器尺寸算会给出过大的范围，
 * 能把图拖到一半是空白。
 */
function clampPan(): void {
  const scaledW = metrics.imgW * zoomLevel()
  const scaledH = metrics.imgH * zoomLevel()

  const maxX = Math.max(0, (scaledW - metrics.availW) / 2)
  const maxY = Math.max(0, (scaledH - metrics.availH) / 2)

  pan.x = Math.min(maxX, Math.max(-maxX, pan.x))
  pan.y = Math.min(maxY, Math.max(-maxY, pan.y))
}

/**
 * 缩放与平移统一用 transform 表达。
 *
 * 为什么不用 max-width/height 或 width/height 去「放大」：
 *   - max-* 只是抬高上限。图片本来就比上限小，点了没有任何反应。
 *   - width/height 按倍数设定虽然能变大，但长大的方向由容器排布决定，
 *     会往左上角跑；而且居中溢出在滚动容器里是滚不到左上角的，是个死结。
 * transform 一次解决两件事：scale 以元素中心为原点，放大天然从中心向四周展开；
 * translate 恰好就是拖动需要的那个量，两者共用同一组变量。
 */
function applyTransform(): void {
  const el = root.value
  if (!el) return

  el.style.setProperty('--pv-zoom', String(zoomLevel()))
  el.style.setProperty('--pv-x', `${pan.x}px`)
  el.style.setProperty('--pv-y', `${pan.y}px`)

  if (zoomIndex.value > 0) el.dataset.zoomed = ''
  else delete el.dataset.zoomed
}

function setZoom(next: number): void {
  zoomIndex.value = Math.min(Math.max(next, 0), ZOOM_LEVELS.length - 1)

  if (zoomIndex.value === 0) {
    // 缩回 1× 时图片已经完整可见，平移量失去意义
    pan.x = 0
    pan.y = 0
  } else {
    clampPan()
  }

  applyTransform()
}

function resetZoom(): void {
  zoomIndex.value = 0
  pan.x = 0
  pan.y = 0
  applyTransform()
}

/* ── 拖动平移 ───────────────────────────────────────────────────── */

interface DragState {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

let drag: DragState | null = null

function onStagePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  // 只有放大之后才有可平移的内容；1× 时按下应当什么也不发生
  if (zoomIndex.value === 0) return
  // 工具条上的按钮不启动拖动（它们不在 stage 内，这里只是防御）
  if ((event.target as Element | null)?.closest('button')) return

  drag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: pan.x,
    originY: pan.y,
  }

  root.value?.setAttribute('data-dragging', '')
  event.preventDefault()
}

function onStagePointerMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return

  pan.x = drag.originX + (event.clientX - drag.startX)
  pan.y = drag.originY + (event.clientY - drag.startY)

  clampPan()
  applyTransform()
}

function endDrag(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return
  drag = null
  root.value?.removeAttribute('data-dragging')
}

/* ── 键盘 ───────────────────────────────────────────────────────── */

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    // 全屏时先让浏览器退出全屏，再按一次才关查看器
    if (document.fullscreenElement) return
    event.preventDefault()
    close()
    return
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    manualGo(1)
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    manualGo(-1)
    return
  }
  if (event.key === ' ' && canSlide.value) {
    event.preventDefault()
    togglePlay()
  }
}

/* ── 打开 / 关闭 / 换图的收尾 ───────────────────────────────────── */

/** 只预热当前图的左右邻图，不做全量预加载 */
watch([isOpen, activeIndex], ([open, index]) => {
  if (!open) return
  for (const step of [1, -1]) {
    const neighbour = items.value[index + step]
    if (!neighbour) continue
    const image = new Image()
    image.src = neighbour.src
  }
})

/** 换图后回到 1×：上一张的缩放位置对新图没有意义 */
watch(activeIndex, () => {
  resetZoom()
  void nextTick(measureStage)
})

watch(isOpen, async (open) => {
  if (import.meta.server) return

  if (open) {
    lastFocused = document.activeElement as HTMLElement | null
    // 锁滚动，否则背景会跟着手势一起滚
    document.documentElement.dataset.photoViewer = ''
    resetZoom()
    await nextTick()
    dialog.value?.focus()
    measureStage()
    return
  }

  delete document.documentElement.dataset.photoViewer
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
  lastFocused?.focus()
  lastFocused = null
})

function onResize(): void {
  if (!isOpen.value) return
  measureStage()
  clampPan()
  applyTransform()
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreen)
  window.addEventListener('resize', onResize, { passive: true })
})

/** 组件被卸载（例如快速切换路由）时别把滚动锁与监听留下 */
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreen)
  window.removeEventListener('resize', onResize)
  if (import.meta.client) delete document.documentElement.dataset.photoViewer
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pv">
      <div
        v-if="isOpen && current"
        ref="root"
        class="pv"
        :class="{ 'pv--no-strip': !stripVisible }"
        role="dialog"
        aria-modal="true"
        aria-label="图片查看器"
        tabindex="-1"
        @keydown="onKeydown"
        @click.self="close"
      >
        <!-- 工具条：全部排在关闭按钮左侧 -->
        <div class="pv-tools">
          <button
            type="button"
            class="pv-btn"
            aria-label="缩小图片"
            :disabled="zoomIndex <= 0"
            @click.stop="setZoom(zoomIndex - 1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M5 12h14" stroke-linecap="round" />
            </svg>
          </button>

          <button
            type="button"
            class="pv-btn"
            aria-label="放大图片"
            :disabled="zoomIndex >= ZOOM_LEVELS.length - 1"
            @click.stop="setZoom(zoomIndex + 1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </svg>
          </button>

          <button
            type="button"
            class="pv-btn"
            aria-label="复位缩放"
            :disabled="zoomIndex <= 0 && pan.x === 0 && pan.y === 0"
            @click.stop="resetZoom"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" stroke-linecap="round" />
              <path d="M3.5 4v4.6H8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <button
            v-if="canSlide"
            type="button"
            class="pv-btn"
            :class="{ 'is-on': playing }"
            :aria-pressed="playing"
            :aria-label="playing ? '暂停幻灯片' : '播放幻灯片'"
            @click.stop="togglePlay"
          >
            <svg v-if="playing" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="7" y="5.5" width="3.6" height="13" rx="1.2" />
              <rect x="13.4" y="5.5" width="3.6" height="13" rx="1.2" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8.5 5.6a1 1 0 0 1 1.52-.85l8.2 5.4a1 1 0 0 1 0 1.7l-8.2 5.4a1 1 0 0 1-1.52-.85z" />
            </svg>
          </button>

          <button
            v-if="canSlide"
            type="button"
            class="pv-btn"
            :class="{ 'is-on': stripVisible }"
            :aria-pressed="stripVisible"
            :aria-label="stripVisible ? '隐藏缩略图栏' : '显示缩略图栏'"
            @click.stop="stripVisible = !stripVisible"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
              <path d="M3.5 15h17" />
            </svg>
          </button>

          <button
            type="button"
            class="pv-btn"
            :aria-label="isFullscreen ? '退出全屏' : '全屏查看'"
            :aria-pressed="isFullscreen"
            @click.stop="toggleFullscreen"
          >
            <svg v-if="isFullscreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <button type="button" class="pv-btn pv-btn--close" aria-label="关闭图片查看器" @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <button
          v-if="canSlide"
          type="button"
          class="pv-nav pv-nav--prev"
          aria-label="上一张"
          @click.stop="manualGo(-1)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <figure
          ref="stage"
          class="pv-stage"
          @pointerdown="onStagePointerDown"
          @pointermove="onStagePointerMove"
          @pointerup="endDrag"
          @pointercancel="endDrag"
          @pointerleave="endDrag"
        >
          <img
            ref="stageImage"
            :src="current.src"
            :alt="current.alt"
            decoding="async"
            :draggable="false"
            @load="measureStage"
          />
          <figcaption class="pv-caption">
            <span v-if="current.alt">{{ current.alt }}</span>
            <span class="pv-count">{{ activeIndex + 1 }} / {{ total }}</span>
          </figcaption>
        </figure>

        <button
          v-if="canSlide"
          type="button"
          class="pv-nav pv-nav--next"
          aria-label="下一张"
          @click.stop="manualGo(1)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <!-- 底部整排缩略图；没有再发起请求，用的就是文章里已经在缓存里的那些地址 -->
        <div v-if="canSlide && stripVisible" class="pv-strip" role="tablist" aria-label="文章中的图片">
          <button
            v-for="(item, index) in items"
            :key="`${item.src}-${index}`"
            type="button"
            role="tab"
            class="pv-thumb"
            :class="{ 'is-active': index === activeIndex }"
            :aria-selected="index === activeIndex"
            :aria-label="`查看第 ${index + 1} 张：${item.alt || '未命名'}`"
            @click.stop="manualSelect(index)"
          >
            <img :src="item.thumb" alt="" loading="lazy" decoding="async" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
