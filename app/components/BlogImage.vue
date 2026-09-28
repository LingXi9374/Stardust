<script setup lang="ts">
import { isRemoteMedia, useMediaManifest } from '~/composables/useMedia'

const props = withDefaults(
  defineProps<{
    /** 本地素材 key（相对 assets/media，不含扩展名）、/ 开头的 public 路径，或 http(s) 图床链接 */
    src: string
    alt: string
    /** 远程图的响应式提示 */
    sizes?: string
    /**
     * 加载策略。
     * - 'auto'（默认）：跨域图 eager，同源图 lazy（原因见下面 loadingMode 的说明）
     * - 'eager' / 'lazy'：显式指定
     *
     * 刻意用字符串而不是布尔：Vue 会把声明为 Boolean 且未传值的 prop 自动转成 false，
     * 于是"没传"和"传了 false"无法区分。
     */
    loading?: 'auto' | 'eager' | 'lazy'
    /** true：填满外面的容器（容器自己定尺寸）；false：按原始比例撑开，瀑布流用 */
    fill?: boolean
    /** 加在 img 上的附加类 */
    imgClass?: string
    /**
     * 引用来源策略，默认 no-referrer。
     *
     * 很多图床做了防盗链：请求头里带站外 Referer 就回 403。
     * 例如 https://i0.hdslb.com 上的图片，带 Referer 是 403、不带是 200。
     * no-referrer 让浏览器完全不发送 Referer，这类图就能正常加载。
     *
     * 少数图床反过来——必须带 Referer 才给图（例如 doubanio 的某些资源）。
     * 那种情况在这里覆盖成 'origin' 或具体策略即可。
     */
    referrerPolicy?: ReferrerPolicy
  }>(),
  { fill: true, sizes: '100vw', imgClass: '', referrerPolicy: 'no-referrer', loading: 'auto' },
)

const manifest = useMediaManifest()

/**
 * 加载提示是一层绝对定位的扫光骨架屏（.media-skeleton），图片 load 之后淡入盖住它；
 * prefers-reduced-motion 由 main.css 的全局规则统一停掉动画。
 *
 * 以上说明写在脚本里而不是 HTML 注释——注释会留在开发期的 DOM 中，
 * 当本组件被放进 <NuxtLink>（文章卡片就是）时可能被算进可访问名称。
 */
const loaded = ref(false)
const failed = ref(false)
const imgEl = ref<HTMLImageElement | null>(null)

interface Resolved {
  width?: number
  height?: number
  fallback: string
  sources: Array<{ format: string; src: string }>
}

/**
 * 三种来源：
 * - http(s)://…  图床 / 外链，直接交给浏览器，不经过压缩管线
 * - /…           放在 public 下的静态文件，同样不处理
 * - 其余          assets/media 里的素材，查清单拿多格式产物
 */
const resolved = computed<Resolved>(() => {
  const src = props.src?.trim() ?? ''
  if (!src) return { fallback: '', sources: [] }

  if (isRemoteMedia(src) || src.startsWith('/')) {
    return { fallback: src, sources: [] }
  }

  const entry = manifest[src]
  if (!entry) {
    // 清单里没有：开发期给出明确提示，而不是静默渲染空白
    if (import.meta.dev) {
      console.warn(
        `[BlogImage] 素材 "${src}" 不在媒体清单里。` +
          `确认它位于 assets/media/${src}.{jpg,png,webp,…}，然后重启或等一次热重载。`,
      )
    }
    return { fallback: '', sources: [] }
  }

  return {
    width: entry.width,
    height: entry.height,
    fallback: entry.fallback,
    sources: entry.variants.map((variant) => ({ format: `image/${variant.format}`, src: variant.src })),
  }
})

/** 清单里有尺寸时用它撑住版面，避免图片到达时页面跳动 */
const dimensionAttrs = computed(() =>
  props.fill || !resolved.value.width
    ? {}
    : { width: resolved.value.width, height: resolved.value.height },
)

/**
 * 跨域图片一律用 eager，不用 lazy。
 *
 * 实测（Chrome 153，两个互不相关的跨域图源各测一遍）：
 *   跨域 + loading="lazy"  → 请求根本不发出，naturalWidth 恒为 0，load/error 都不触发
 *   跨域 + loading="eager" → 正常加载
 *   同源 + loading="lazy"  → 正常加载
 *
 * 也就是说跨域图开了 lazy 会永久停在骨架屏上。确实想强制 lazy 就传 loading="lazy"，
 * 但要先确认目标浏览器上请求真的会发出。
 */
const loadingMode = computed(() => {
  if (props.loading !== 'auto') return props.loading
  return isRemoteMedia(props.src) ? 'eager' : 'lazy'
})

/** 加载失败时给一块静态底色，避免版面留下一个说不清的空洞 */
const failedStyle = computed(() =>
  failed.value ? 'background-color: var(--color-card)' : undefined,
)

function onLoad(): void {
  loaded.value = true
}

function onError(): void {
  failed.value = true
  loaded.value = true
}

// src 变化时重新进入加载态（客户端换封面时会走到）
watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
  },
)

onMounted(() => {
  // 图片可能在 hydration 之前就已经加载完了，load 事件不会再触发，
  // 只靠 @load 会让骨架屏永远停在那里。
  const el = imgEl.value
  if (el?.complete && el.naturalWidth > 0) loaded.value = true
})
</script>

<template>
  <div class="relative overflow-hidden" :style="failedStyle">
    <div v-if="!loaded && resolved.fallback" class="media-skeleton absolute inset-0" aria-hidden="true" />

    <picture v-if="resolved.fallback">
      <source
        v-for="source in resolved.sources"
        :key="source.format"
        :srcset="source.src"
        :type="source.format"
      />
      <img
        ref="imgEl"
        :src="resolved.fallback"
        :alt="alt"
        :width="dimensionAttrs.width"
        :height="dimensionAttrs.height"
        :sizes="props.fill ? undefined : props.sizes"
        :loading="loadingMode"
        :fetchpriority="loadingMode === 'eager' ? 'high' : 'auto'"
        decoding="async"
        :referrerpolicy="props.referrerPolicy"
        class="transition-opacity duration-300"
        :class="[
          props.fill ? 'absolute inset-0 size-full object-cover' : 'h-auto w-full',
          // 三者互斥：同时输出 opacity-100 与 opacity-0 时，谁生效由样式表顺序决定，
          // 而不是由类名在属性里的先后决定
          loaded && !failed ? 'opacity-100' : 'opacity-0',
          props.imgClass,
        ]"
        @load="onLoad"
        @error="onError"
      />
    </picture>
  </div>
</template>
