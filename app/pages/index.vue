<script setup lang="ts">
const { site, social } = useAppConfig()

useSeoMeta({
  title: `${site.codename} — ${site.description}`,
  description: site.tagline,
})
</script>

<template>
  <section class="flex min-h-[80svh] flex-col px-6 pb-14 pt-24 sm:px-10 lg:min-h-screen lg:px-16">
    <!-- 身份区：头像 + 标题 + 点状分隔线 + 描述 -->
    <div class="flex flex-1 items-center justify-center">
      <div class="flex flex-col items-center gap-8 sm:flex-row sm:gap-8">
        <BlogImage
          src="avatar"
          :alt="`${site.name} 的头像`"
          loading="eager"
          class="size-36 shrink-0 rounded-full lg:size-48"
        />

        <div class="min-w-0 max-w-md text-center sm:text-left">
          <h1 class="text-codename font-medium text-ink-strong">{{ site.codename }}</h1>

          <div class="rule-dotted mx-auto mt-3 w-full max-w-[16rem] sm:mx-0 sm:w-64" />

          <p class="mt-3 text-xl font-light text-ink-soft sm:text-2xl">
            {{ site.description }}
          </p>
        </div>
      </div>
    </div>

    <!-- 平台跳转入口 -->
    <UiSocialLinks class="mt-10" :links="social" />
  </section>
</template>
