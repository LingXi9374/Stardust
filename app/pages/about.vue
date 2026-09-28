<script setup lang="ts">
const { site, social } = useAppConfig()

useSeoMeta({
  title: 'About',
  description: site.tagline,
})
</script>

<template>
  <div class="px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
    <div class="mx-auto max-w-3xl">
      <UiPageHeader title="About" :lead="site.tagline" />

      <div class="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <BlogImage
          src="avatar"
          :alt="`${site.author} 的头像`"
          loading="eager"
          class="size-24 shrink-0 rounded-full"
        />
        <div>
          <p class="text-xl font-medium text-ink-strong">{{ site.author }}</p>
          <p class="mt-1 text-ink-soft">{{ site.email }}</p>
        </div>
      </div>

      <!-- 阅读列：66 字符度量、18px 正文（AGENTS.md 4.1 / 4.3） -->
      <div class="reading-column mt-10">
        <p>
          这里是 <strong>{{ site.name }}</strong>。我写技术、写设计，也写那些暂时想不明白的事。
          这个站点刻意做得很安静：没有评论框，没有弹窗，没有推荐算法，只有文字和一个侧栏。
        </p>

        <h2>关于这个模板</h2>
        <p>
          它是一份阅读优先的博客模板。排版即界面——度量控制在 66 字符，正文 18px，
          行高随行长变化。配色是个人偏好，被刻意锁死在三个色值上：
          <code>#87c5d1</code>、<code>#e9feff</code>、<code>#cee9ee</code>。
        </p>

        <h2>这里会出现什么</h2>
        <ul>
          <li>构建过程中真实的取舍，包括被放弃的方案；</li>
          <li>读到的、值得留存的东西，通常带出处；</li>
          <li>阶段性的一点点进展，不保证有结论。</li>
        </ul>

        <h2>联系</h2>
        <p>
          邮件是最可靠的方式：
          <a :href="`mailto:${site.email}`">{{ site.email }}</a>。
        </p>
      </div>

      <ul class="mt-12 flex flex-wrap gap-3">
        <li v-for="link in social" :key="link.label">
          <a
            :href="link.href"
            class="inline-flex items-center rounded-full bg-card px-4 py-2 text-sm text-ink-strong transition-colors hover:bg-card-hover"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
