/**
 * 文章照片查看器的入口。
 *
 * 只在点击时扫描 DOM，不在页面加载时预建清单：
 * 一篇文章可能引用几十张图，事前扫描既浪费又容易和懒渲染打架。
 * 点击那一刻的成本可以忽略。
 *
 * 约定：给**容器**加 `data-photo`（BlogImage 的根是 div，属性会落在那儿），
 * 里面第一个 <img> 就是这张照片。缩略图直接用同一个地址——文章里那张图
 * 已经在浏览器缓存里了，再取一次不会产生新请求。
 *
 * usePhotoViewer 必须显式导入：Nuxt 的自动导入声明会漏掉它（见组件里的说明）。
 */
import type { PhotoItem } from '~/composables/usePhotoViewer'
import { usePhotoViewer } from '~/composables/usePhotoViewer'

export default defineNuxtPlugin((nuxtApp) => {
  const { open } = usePhotoViewer()

  function toItem(container: Element): PhotoItem | null {
    const image =
      container instanceof HTMLImageElement ? container : container.querySelector('img')
    if (!image) return null

    // currentSrc 是浏览器实际选中的那一个（<picture> 里可能是 avif 或 webp）
    const src = image.currentSrc || image.src
    if (!src) return null

    return { src, alt: image.alt, thumb: src }
  }

  function collect(): { list: PhotoItem[]; nodes: Element[] } {
    // 只在文章范围内找，首页卡片上的图不参与
    const scope = document.querySelector('article') ?? document.body
    const nodes = [...scope.querySelectorAll('[data-photo]')]

    const list: PhotoItem[] = []
    const kept: Element[] = []
    for (const node of nodes) {
      const item = toItem(node)
      if (!item) continue
      list.push(item)
      kept.push(node)
    }

    return { list, nodes: kept }
  }

  function onClick(event: MouseEvent): void {
    // 只有左键、且没按修饰键时才接管，别抢走"在新标签页打开图片"这类操作
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
    if (event.defaultPrevented) return

    const target = event.target
    if (!(target instanceof Element)) return

    const container = target.closest('[data-photo]')
    if (!container) return

    const { list, nodes } = collect()
    const index = nodes.indexOf(container)
    if (index < 0) return

    event.preventDefault()
    open(list, index)
  }

  document.addEventListener('click', onClick)
})
