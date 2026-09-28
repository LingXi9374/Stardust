/**
 * 照片查看器的状态。
 *
 * 用 useState 而不是模块级 ref：模块级状态在 SSR 下会跨请求泄漏。
 * 查看器本身只在用户点击后才打开，所以服务端永远是关闭态。
 */

export interface PhotoItem {
  /** 大图地址 */
  src: string
  alt: string
  /**
   * 底部缩略图地址。
   * 本地素材与主图同源同址（media manifest 没有输出多档宽度），
   * 用同一个 URL 的好处是浏览器直接复用已经加载过的那张，不会多一次下载。
   */
  thumb: string
}

/** 幻灯片每张停留多久 */
export const SLIDESHOW_INTERVAL = 4000

/**
 * 缩放档位。
 * 与图表查看器保持同一套档位，两处的操作手感才一致。
 */
export const ZOOM_LEVELS = [1, 1.5, 2, 3, 4] as const

export function usePhotoViewer() {
  const items = useState<PhotoItem[]>('photo-viewer-items', () => [])
  const activeIndex = useState<number>('photo-viewer-index', () => 0)
  const isOpen = useState<boolean>('photo-viewer-open', () => false)

  /** 幻灯片是否在播放 */
  const playing = useState<boolean>('photo-viewer-playing', () => false)
  /** 底部缩略图栏是否显示 */
  const stripVisible = useState<boolean>('photo-viewer-strip', () => true)
  /** 浏览器全屏状态，由 fullscreenchange 同步 */
  const isFullscreen = useState<boolean>('photo-viewer-fullscreen', () => false)

  const current = computed<PhotoItem | null>(() => items.value[activeIndex.value] ?? null)
  const total = computed(() => items.value.length)
  const canSlide = computed(() => items.value.length > 1)

  function open(list: PhotoItem[], index: number): void {
    if (list.length === 0) return
    items.value = list
    activeIndex.value = Math.min(Math.max(index, 0), list.length - 1)
    isOpen.value = true
  }

  /**
   * 关闭时把临时状态收回默认值。
   * 不重置的话，下次打开会带着上一轮的播放状态进来，很突兀。
   * 缩放状态留在组件里，由它自己在打开/换图时归零。
   */
  function close(): void {
    isOpen.value = false
    playing.value = false
  }

  /** 循环切换：在首尾之间前后翻不撞墙 */
  function go(step: number): void {
    if (items.value.length === 0) return
    const count = items.value.length
    activeIndex.value = (activeIndex.value + step + count) % count
  }

  function select(index: number): void {
    if (index < 0 || index >= items.value.length) return
    activeIndex.value = index
  }

  return {
    items,
    activeIndex,
    isOpen,
    current,
    total,
    canSlide,
    playing,
    stripVisible,
    isFullscreen,
    open,
    close,
    go,
    select,
  }
}
