<script setup lang="ts">
import Giscus from '@giscus/vue'
import type { Theme } from '@giscus/vue'
import { comments as commentsConfig } from '~~/blog.config'

/**
 * 文章评论（giscus）。
 *
 * 放在上一篇 / 下一篇之后——读者先看完内容与导航，再决定要不要参与讨论。
 *
 * 关于自定义主题：giscus 是**在 iframe 里**注入
 * `<link rel="stylesheet" crossorigin="anonymous" href="...">`，
 * 所以主题 URL 必须是绝对 https 地址，且托管方能返回 CORS 头。站点跑在
 * http（比如本地开发）时，https 的 giscus.app 去加载 http 样式表属于混合内容，
 * 浏览器会直接拦掉——那种情况下退回 giscus 内置主题，而不是留一个加载不出来的
 * 空样式。判断依据是协议而不是 dev/prod：线上用 http 部署同样会失败。
 */
const { isDark } = useTheme()

const { giscus, enabled } = commentsConfig

/** 只有 https 才可能加载自定义主题 */
const customThemeUsable = computed(() => useRequestURL().origin.startsWith('https://'))

/**
 * 主题值：https 下用站内自定义主题的绝对地址，否则退回内置主题名。
 * isDark 是响应式的，切换站点主题时 @giscus/vue 会通过 setConfig 通知 iframe，
 * 不重新加载 iframe。
 */
const theme = computed<Theme>(() => {
  const { theme: paths } = giscus
  const wantsDark = isDark.value

  if (!customThemeUsable.value) {
    return (wantsDark ? paths.fallbackDark : paths.fallbackLight) as Theme
  }

  const path = wantsDark ? paths.dark : paths.light
  return `${useRequestURL().origin}${path}` as Theme
})

/**
 * 仓库信息没填全时不渲染评论区，而是给维护者一条明确提示。
 * 直接渲染会让 giscus 弹一个「仓库不存在」的错误框，读者看到的是坏掉的页面。
 */
const configured = computed(() => {
  const { repo, repoId, categoryId } = giscus
  return Boolean(repo && !repo.startsWith('your-name/') && repoId && categoryId)
})
</script>

<template>
  <section v-if="enabled" class="mt-16 border-t border-line pt-8" aria-labelledby="comments-heading">
    <h2 id="comments-heading" class="text-xl font-medium tracking-tight text-ink-strong">
      {{ commentsConfig.heading }}
    </h2>

    <div v-if="configured" class="mt-6">
      <!--
        @giscus/vue 在 onMounted 里才动态 import Web Component，服务端渲染的是一个
        空节点，所以这里不需要 ClientOnly——组件自身就是 SSR 安全的。
      -->
      <Giscus
        :repo="giscus.repo as `${string}/${string}`"
        :repo-id="giscus.repoId"
        :category="giscus.category"
        :category-id="giscus.categoryId"
        :mapping="giscus.mapping"
        :strict="giscus.strict"
        :reactions-enabled="giscus.reactionsEnabled"
        :emit-metadata="giscus.emitMetadata"
        :input-position="giscus.inputPosition"
        :lang="giscus.lang"
        :loading="giscus.loading"
        :theme="theme"
      />
    </div>

    <p v-else class="mt-6 rounded-2xl border border-dashed border-line bg-card p-4 text-sm text-ink-soft">
      评论区还没配置好。到
      <a
        href="https://giscus.app/zh-CN"
        target="_blank"
        rel="noopener noreferrer"
        class="underline underline-offset-2"
      >giscus.app</a>
      填好仓库，把生成的
      <code class="rounded bg-canvas px-1.5 py-0.5 text-xs">repo</code> /
      <code class="rounded bg-canvas px-1.5 py-0.5 text-xs">repoId</code> /
      <code class="rounded bg-canvas px-1.5 py-0.5 text-xs">categoryId</code>
      抄进 <code class="rounded bg-canvas px-1.5 py-0.5 text-xs">blog.config.ts</code> 的
      <code class="rounded bg-canvas px-1.5 py-0.5 text-xs">comments.giscus</code> 即可。
    </p>
  </section>
</template>
