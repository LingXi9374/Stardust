<script setup lang="ts">
import { themeInitScript } from '~/composables/useTheme'

const { site } = useAppConfig()

/** 站点级 SEO：标题模板、描述、图标、分享卡片、主题色。见 blog.config.ts 的 seo 段。 */
useSiteSeo()

useHead({
  script: [{ innerHTML: themeInitScript, tagPosition: 'head' }],
  title: site.name,
})

/**
 * 页面切换：沉入 / 浮出。
 *
 * 动画作用在**整个子页面**上，而不是逐个元素错峰。理由：一篇长文有几百个节点，
 * 逐个错峰意味着要为几百个合成层排队，正文要等动画铺完才全部可见——对阅读优先的
 * 站点是负收益。单个容器的 transform + opacity 全程留在合成器上，代价固定且极低。
 *
 * 必须走 NuxtPage 自己的 transition prop，不能自己在默认插槽里包一层 <Transition>。
 * Nuxt 内部是这么判断的（node_modules/nuxt/dist/pages/runtime/page.js）：
 *
 *   const hasTransition = !!(props.transition ?? route.meta.pageTransition ?? appPageTransition)
 *
 * 它只认这三个来源。插槽内容会被再包进一层 <Suspense>，外面手动加的那层
 * <Transition> 在这个结构里不会触发——写了等于没写，而且不会有任何报错。
 *
 * 页面 key 由 Nuxt 的 generateRouteKey 生成，路径变了就会换 key，
 * 因此 /posts/a → /posts/b 这类同组件不同参数也能正确重挂载。
 */
const pageTransition = { name: 'page', mode: 'out-in' } as const
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage :transition="pageTransition" />
    </NuxtLayout>
  </div>
</template>
