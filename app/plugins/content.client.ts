/**
 * 正文增强（仅浏览器端）。
 *
 * 1. Mermaid 图表：滚动到附近才动态加载 mermaid 并渲染，首屏不受影响。
 *    渲染失败时保留源码，不会让整页塌掉。
 * 2. 代码块复制按钮：事件委托，不依赖任何框架状态。
 *
 * 两者都是渐进增强——脚本没跑时，mermaid 块显示源码，代码块依然可读可选中。
 */

import { mermaidThemeVariables } from '~~/shared/utils/diagram-theme'

const DIAGRAM_SELECTOR = '.dg--mermaid[data-diagram="mermaid"]:not([data-ready])'
const COPY_SELECTOR = '[data-cb-copy]'

/**
 * 主题变量整套由 shared/utils/diagram-theme.ts 的语义色板派生。
 *
 * 这里不再逐个手写：Mermaid 各图表类型读的变量不同，漏一个就悄悄退回它自己的
 * 默认值（白线、白字、灰底），浅色深色下都可能糊掉。色板是唯一事实来源。
 */
const LIGHT_VARS = mermaidThemeVariables('light')
const DARK_VARS = mermaidThemeVariables('dark')
function isDark(): boolean {
  return document.documentElement.classList.contains('dark')
}

function readCode(el: HTMLElement): string {
  const script = el.querySelector('script.dg-src')
  if (!script?.textContent) return ''
  try {
    const parsed = JSON.parse(script.textContent) as { code?: string }
    return parsed.code ?? ''
  } catch {
    return ''
  }
}

let mermaidReady: Promise<typeof import('mermaid').default> | null = null
let renderSeq = 0

async function loadMermaid() {
  mermaidReady ??= import('mermaid').then((mod) => mod.default)
  return mermaidReady
}

/**
 * mermaid.initialize 会改写全局配置，而 mermaid.render 内部共用一个临时容器，
 * 并发调用会互相踩。所以渲染一律排队，且只在主题真正变化时才重新 initialize。
 */
let configuredFor: 'light' | 'dark' | null = null
let renderQueue: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = renderQueue.then(task, task)
  renderQueue = run.catch(() => undefined)
  return run
}

async function ensureMermaid(dark: boolean) {
  const mermaid = await loadMermaid()
  const mode = dark ? 'dark' : 'light'

  if (configuredFor !== mode) {
    mermaid.initialize({
      startOnLoad: false,
      // securityLevel strict：图表里的 HTML 一律不解析，避免把 Markdown 变成注入口
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: 'inherit',
      themeVariables: dark ? DARK_VARS : LIGHT_VARS,
    })
    configuredFor = mode
  }

  return mermaid
}

interface DiagramState {
  code: string
  /** 已经渲染过的主题 → SVG。第二套主题等真正切过去时再渲染。 */
  rendered: Map<'light' | 'dark', string>
}

const diagrams = new Map<HTMLElement, DiagramState>()

/**
 * 只渲染指定的那一套主题。
 *
 * 早先的写法是「一次把亮暗两套都渲出来」，一页十来个图表就是二十多次渲染，
 * 而且每次都要重新 initialize 配置——图表要等很久才出现。
 * 现在只渲当前主题，另一套等用户真的切过去再补。
 */
async function renderSvg(code: string, dark: boolean): Promise<string> {
  return enqueue(async () => {
    const mermaid = await ensureMermaid(dark)
    const id = `dg-${(renderSeq += 1)}`
    const { svg } = await mermaid.render(id, code)
    return svg
  })
}

function paint(el: HTMLElement, state: DiagramState, dark: boolean): void {
  const svg = state.rendered.get(dark ? 'dark' : 'light')
  if (!svg) return

  let canvas = el.querySelector<HTMLElement>('.dg-canvas')
  if (!canvas) {
    canvas = document.createElement('div')
    canvas.className = 'dg-canvas'
    // 插在工具条之前而不是覆盖整个画板：工具条是后加的，innerHTML 一盖就没了
    el.insertBefore(canvas, el.querySelector('.dg-tools'))
    // 图已经画出来了，源码兜底提示不该继续留在版面上
    el.querySelector('.dg-fallback')?.remove()
  }

  canvas.innerHTML = svg

  // Mermaid 会在根 <svg> 上内联 style="max-width: Npx"。内联样式优先级高于
  // 样式表，留着它缩放就没法突破这个上限——直接摘掉，尺寸交给 CSS 管。
  canvas.querySelector('svg')?.style.removeProperty('max-width')
}

async function renderDiagram(el: HTMLElement): Promise<void> {
  const code = readCode(el)
  if (!code.trim()) return

  el.dataset.ready = 'pending'

  try {
    const dark = isDark()
    const svg = await renderSvg(code, dark)
    const state: DiagramState = { code, rendered: new Map([[dark ? 'dark' : 'light', svg]]) }
    diagrams.set(el, state)

    el.dataset.ready = 'done'
    paint(el, state, dark)
  } catch (error) {
    el.dataset.ready = 'error'
    const hint = el.querySelector('.dg-hint')
    if (hint) {
      hint.textContent = `图表渲染失败：${(error as Error).message.split('\n')[0]}`
    }
  }
}

async function applyTheme(): Promise<void> {
  const dark = isDark()
  const mode = dark ? 'dark' : 'light'

  for (const state of diagrams.values()) {
    if (!state.rendered.has(mode)) {
      try {
        state.rendered.set(mode, await renderSvg(state.code, dark))
      } catch {
        continue
      }
    }
  }

  // 全部备好之后再一次性换掉，避免逐张闪烁
  for (const [el, state] of diagrams.entries()) {
    if (el.dataset.ready === 'done') paint(el, state, dark)
  }
}

function scanDiagrams(root: ParentNode): void {
  const nodes = root.querySelectorAll<HTMLElement>(DIAGRAM_SELECTOR)
  if (nodes.length === 0) return

  if (!('IntersectionObserver' in window)) {
    nodes.forEach((el) => void renderDiagram(el))
    return
  }

  // 距离视口 400px 才开始渲染，避免为一屏之外的图表付出下载与布局成本
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        observer.unobserve(entry.target)
        void renderDiagram(entry.target as HTMLElement)
      }
    },
    { rootMargin: '400px 0px' },
  )

  nodes.forEach((el) => observer.observe(el))
}

function collectCode(block: Element): string {
  const lines = block.querySelectorAll('.cl-c')
  return Array.from(lines)
    .map((line) => {
      // 行尾的标签是渲染时加的，不属于代码本身
      const clone = line.cloneNode(true) as HTMLElement
      clone.querySelectorAll('.cl-tags').forEach((tag) => tag.remove())
      return clone.textContent ?? ''
    })
    .join('\n')
}

async function copyBlock(button: HTMLElement): Promise<void> {
  const block = button.closest('.cb')
  if (!block) return

  const text = collectCode(block)

  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 非安全上下文或用户拒绝授权时的兜底
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try {
      document.execCommand('copy')
    } catch {
      // 复制不了就算了，不打扰读者
    }
    document.body.removeChild(area)
  }

  button.dataset.copied = 'true'
  window.setTimeout(() => {
    delete button.dataset.copied
  }, 1600)
}

/* ────────────────────────────────────────────────────────────────────────
   图表查看器
   ────────────────────────────────────────────────────────────────────────
   与照片查看器刻意分离：那一个是「多张之间切换」，这一个是「单张缩放平移」，
   交互模型不同，混在一起两边都会变复杂。

   全屏不做 DOM 搬移，只是给 .dg 打上 data-fullscreen 由 CSS 撑满视口。
   搬移元素会牵扯占位、恢复位置、Vue 重渲染三件事，而 CSS 方案没有这些风险，
   图表里的 defs / marker id 也不会因为克隆而重复。
   ──────────────────────────────────────────────────────────────────────── */

const ZOOM_LEVELS = [1, 1.5, 2, 3, 4] as const
const TOOLS_HTML =
  '<div class="dg-tools">' +
  '<button type="button" class="dg-btn" data-dg-zoom="out" aria-label="缩小图表">' +
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14" stroke-linecap="round"/></svg>' +
  '</button>' +
  '<button type="button" class="dg-btn" data-dg-zoom="in" aria-label="放大图表">' +
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>' +
  '</button>' +
  '<button type="button" class="dg-btn" data-dg-full aria-label="全屏查看图表" aria-pressed="false">' +
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
  '</button>' +
  '<button type="button" class="dg-btn" data-dg-reset aria-label="复位缩放">' +
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" stroke-linecap="round"/><path d="M3.5 4v4.6H8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
  '</button>' +
  '</div>' +
  '<button type="button" class="dg-close" data-dg-close aria-label="退出全屏">' +
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>' +
  '</button>'

/**
 * 全屏舞台。
 *
 * 之前是给 .dg 直接加 position:fixed。那在正文里有坑：这些图表住在
 * v-html 注入的内容里，固定定位的包含块未必是视口，结果是图表从原位消失
 * （确实被抽出了文档流）却没有铺满屏幕。
 *
 * 现在把图表整个搬到一个挂在 <body> 上的固定层里。body 没有 transform /
 * filter，固定定位一定以视口为基准；退出时按占位空槽原样放回去。
 */
let stage: HTMLDivElement | null = null
let placeholder: HTMLElement | null = null

function diagramStage(): HTMLDivElement {
  if (stage?.isConnected) return stage

  stage = document.createElement('div')
  stage.className = 'dg-stage'
  document.body.appendChild(stage)
  return stage
}

function zoomIndex(figure: HTMLElement): number {
  const raw = Number(figure.dataset.zoomIndex ?? '0')
  if (!Number.isFinite(raw)) return 0
  return Math.min(Math.max(Math.trunc(raw), 0), ZOOM_LEVELS.length - 1)
}

function zoomLevel(figure: HTMLElement): number {
  return ZOOM_LEVELS[zoomIndex(figure)] ?? 1
}

/** 平移量（屏幕像素）。存在 WeakMap 里而不是 dataset，避免每帧写字符串。 */
const panState = new WeakMap<HTMLElement, { x: number; y: number }>()

function panOf(figure: HTMLElement): { x: number; y: number } {
  let state = panState.get(figure)
  if (!state) {
    state = { x: 0, y: 0 }
    panState.set(figure, state)
  }
  return state
}

/** 承载图表的那一层：Mermaid 是 .dg-canvas，PlantUML 就是 .dg 自己 */
function viewportOf(figure: HTMLElement): HTMLElement {
  return figure.querySelector<HTMLElement>('.dg-canvas') ?? figure
}

/**
 * 缩放与平移统一用 transform 表达。
 *
 * 早先是按倍数去设定 width/height，那只能让内容「长大」，长大的方向取决于
 * 容器怎么排布——所以放大时会往左上角跑。改用 transform 之后：
 * scale 以元素中心为原点，放大天然是从中心向四周展开；
 * translate 又恰好就是拖动所需要的那个量，两者共用一套变量。
 */
function applyTransform(figure: HTMLElement): void {
  const index = zoomIndex(figure)
  const { x, y } = panOf(figure)

  figure.style.setProperty('--dg-zoom', String(zoomLevel(figure)))
  figure.style.setProperty('--dg-x', `${x}px`)
  figure.style.setProperty('--dg-y', `${y}px`)

  if (index > 0) figure.dataset.zoomed = ''
  else delete figure.dataset.zoomed

  const out = figure.querySelector<HTMLButtonElement>('[data-dg-zoom="out"]')
  const into = figure.querySelector<HTMLButtonElement>('[data-dg-zoom="in"]')
  const reset = figure.querySelector<HTMLButtonElement>('[data-dg-reset]')
  if (out) out.disabled = index <= 0
  if (into) into.disabled = index >= ZOOM_LEVELS.length - 1
  if (reset) reset.disabled = index <= 0 && x === 0 && y === 0
}

/**
 * 限制平移范围：放大后内容比画板大出的那一圈，最多只能移到边缘对齐。
 * 不限制的话可以把图表整个拖出视野，读者找不回来。
 */
function clampPan(figure: HTMLElement): void {
  const state = panOf(figure)
  const overflow = zoomLevel(figure) - 1
  const box = viewportOf(figure).getBoundingClientRect()

  const maxX = (box.width * overflow) / 2
  const maxY = (box.height * overflow) / 2

  state.x = Math.min(maxX, Math.max(-maxX, state.x))
  state.y = Math.min(maxY, Math.max(-maxY, state.y))
}

function resetView(figure: HTMLElement): void {
  figure.dataset.zoomIndex = '0'
  const state = panOf(figure)
  state.x = 0
  state.y = 0
  applyTransform(figure)
}

/** 给每个图表画板补上工具条；已经加过就跳过 */
function enhanceDiagram(figure: HTMLElement): void {
  if (figure.dataset.tools === 'ready') return
  figure.dataset.tools = 'ready'
  figure.insertAdjacentHTML('beforeend', TOOLS_HTML)
  applyTransform(figure)
}

function setFullscreen(figure: HTMLElement, on: boolean): void {
  const button = figure.querySelector<HTMLButtonElement>('[data-dg-full]')
  if (button) button.setAttribute('aria-pressed', String(on))

  if (on) {
    // 原位留一个同尺寸的虚线空槽，而不是注释。
    // 留注释的话那块版面会直接塌掉，读者看到的就是「图表没了」。
    placeholder = document.createElement('div')
    placeholder.className = 'dg dg--slot'
    placeholder.setAttribute('aria-hidden', 'true')
    figure.parentNode?.insertBefore(placeholder, figure)

    const host = diagramStage()
    host.appendChild(figure)
    host.dataset.open = ''
    figure.dataset.fullscreen = ''

    document.documentElement.dataset.diagramFullscreen = ''
    figure.querySelector<HTMLElement>('[data-dg-close]')?.focus({ preventScroll: true })
    return
  }

  delete figure.dataset.fullscreen

  if (placeholder?.parentNode) {
    placeholder.parentNode.replaceChild(figure, placeholder)
  } else {
    figure.remove()
  }
  placeholder = null

  if (stage) delete stage.dataset.open
  delete document.documentElement.dataset.diagramFullscreen

  figure.querySelector<HTMLElement>('[data-dg-full]')?.focus({ preventScroll: true })
}

/** 正在全屏的那个图表；同时只允许一个 */
function fullscreenFigure(): HTMLElement | null {
  return stage?.querySelector<HTMLElement>('.dg[data-fullscreen]') ?? null
}

function onDiagramToolClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  const figure = target?.closest<HTMLElement>('.dg')
  if (!figure || !target) return

  const zoomButton = target.closest<HTMLElement>('[data-dg-zoom]')
  if (zoomButton) {
    event.preventDefault()
    const step = zoomButton.dataset.dgZoom === 'in' ? 1 : -1
    const next = zoomIndex(figure) + step
    figure.dataset.zoomIndex = String(Math.min(Math.max(next, 0), ZOOM_LEVELS.length - 1))

    if (zoomIndex(figure) === 0) {
      // 缩回 1× 时图表已经完整可见，平移量失去意义，归零
      const state = panOf(figure)
      state.x = 0
      state.y = 0
    } else {
      clampPan(figure)
    }

    applyTransform(figure)
    return
  }

  if (target.closest('[data-dg-reset]')) {
    event.preventDefault()
    resetView(figure)
    return
  }

  if (target.closest('[data-dg-full]')) {
    event.preventDefault()
    const open = fullscreenFigure()
    if (open && open !== figure) setFullscreen(open, false)
    setFullscreen(figure, !figure.hasAttribute('data-fullscreen'))
    return
  }

  if (target.closest('[data-dg-close]')) {
    event.preventDefault()
    setFullscreen(figure, false)
    return
  }

  // 全屏时点空白处也能退出。放大状态下画布上的按下是用来拖动的，不当作退出。
  if (
    figure.hasAttribute('data-fullscreen') &&
    (target === figure || target.classList.contains('dg-canvas')) &&
    zoomIndex(figure) === 0
  ) {
    setFullscreen(figure, false)
  }
}

function scanDiagramsForTools(root: ParentNode): void {
  // .dg--off 里只有一段源码（PlantUML 被关掉或渲染失败），没有可缩放的东西；
  // .dg--slot 是全屏时留在原位的空槽，同样不该长工具条
  const selector = '.dg:not(.dg--off):not(.dg--slot)'
  for (const figure of root.querySelectorAll<HTMLElement>(selector)) {
    enhanceDiagram(figure)
  }
}

/* ────────────────────────────────────────────────────────────────────────
   拖动平移
   ────────────────────────────────────────────────────────────────────────
   只在放大状态下生效——1× 时图表已经完整可见，没有可平移的内容，
   此时按下留给「点空白退出全屏」和正常的页面滚动。
   ──────────────────────────────────────────────────────────────────────── */

interface DragState {
  figure: HTMLElement
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

let drag: DragState | null = null

function onDiagramPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return

  const target = event.target as Element | null
  const figure = target?.closest<HTMLElement>('.dg')
  if (!figure || !target) return
  // 工具条上的按钮不启动拖动
  if (target.closest('.dg-tools, .dg-close')) return
  if (zoomIndex(figure) === 0) return

  const state = panOf(figure)
  drag = {
    figure,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: state.x,
    originY: state.y,
    moved: false,
  }
  figure.dataset.dragging = ''
  event.preventDefault()
}

function onDiagramPointerMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return

  const state = panOf(drag.figure)
  state.x = drag.originX + (event.clientX - drag.startX)
  state.y = drag.originY + (event.clientY - drag.startY)
  drag.moved = true

  clampPan(drag.figure)
  applyTransform(drag.figure)
}

function onDiagramPointerUp(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return
  delete drag.figure.dataset.dragging
  drag = null
}

function onDiagramKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  const figure = fullscreenFigure()
  if (!figure) return
  event.preventDefault()
  setFullscreen(figure, false)
}

export default defineNuxtPlugin((nuxtApp) => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest<HTMLElement>(COPY_SELECTOR)
    if (button) {
      event.preventDefault()
      void copyBlock(button)
    }
  })

  document.addEventListener('click', onDiagramToolClick)
  document.addEventListener('keydown', onDiagramKeydown)
  document.addEventListener('pointerdown', onDiagramPointerDown)
  document.addEventListener('pointermove', onDiagramPointerMove)
  document.addEventListener('pointerup', onDiagramPointerUp)
  document.addEventListener('pointercancel', onDiagramPointerUp)

  const start = () => {
    scanDiagrams(document)
    scanDiagramsForTools(document)
    // 主题切换后重画图表；applyTheme 是异步的，观察回调不等待它
    new MutationObserver(() => {
      void applyTheme()
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  nuxtApp.hook('app:mounted', start)
  nuxtApp.hook('page:finish', () => {
    // 全屏状态下换页：先把图表按占位放回去。
    // 不要提前把 placeholder 置空——那样会走 remove() 分支把图表直接删掉，
    // 而 page:finish 在同页刷新时也会触发，读者会看到图表凭空消失。
    const open = fullscreenFigure()
    if (open) setFullscreen(open, false)

    scanDiagrams(document)
    scanDiagramsForTools(document)
  })
})
