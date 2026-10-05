<script setup lang="ts">
import type { PostDetail } from '~~/shared/types/content'

const route = useRoute()

const { data, error } = await useFetch<PostDetail>(() => `/api/posts/${route.params.slug}`)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

const post = computed(() => data.value as PostDetail)

/** 合集名随摘要一起下发，这里不必再查一次合集列表 */
const collection = computed(() =>
  post.value.collection
    ? { slug: post.value.collection, name: post.value.collectionName || post.value.collection }
    : undefined,
)

/** 自定义封面优先，未定义则回落到随机图（刷新换一张） */
const { coverOf } = usePostCover()
const cover = computed(() => coverOf(post.value))

useSeoMeta({
  title: () => post.value.title,
  description: () => post.value.description,
  ogType: 'article',
})
</script>

<template>
  <div class="px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
    <div class="mx-auto flex max-w-4xl gap-12">
      <!-- 左侧栏目录：允许 sticky（AGENTS.md 4.5） -->
      <aside class="hidden w-52 shrink-0 xl:block">
        <BlogTableOfContents :headings="post.headings" />
      </aside>

      <article class="min-w-0 flex-1">
        <header class="max-w-[65ch]">
          <NuxtLink
            to="/contents"
            class="text-meta text-ink-soft transition-colors hover:text-ink-strong"
          >
            ← Contents
          </NuxtLink>

          <div v-if="collection" class="mt-4">
            <NuxtLink
              :to="`/collections/${collection.slug}`"
              class="inline-flex items-center rounded-full bg-card px-3 py-1 text-meta font-medium text-ink-soft transition-colors hover:bg-card-hover hover:text-ink-strong"
            >
              {{ collection.name }}
            </NuxtLink>
          </div>

          <h1 class="mt-4 text-3xl font-medium tracking-tight text-ink-strong sm:text-4xl">
            {{ post.title }}
          </h1>

          <p v-if="post.description" class="mt-3 text-lg text-ink-soft">
            {{ post.description }}
          </p>

          <BlogPostMeta
            class="mt-5"
            :date="post.date"
            :reading-minutes="post.readingMinutes"
            :tags="post.tags"
          />

          <div v-if="post.pinned" class="mt-5">
            <BlogPinnedBadge tone="plain" />
          </div>

          <!-- 封面：文章没定义 cover 时由随机图 API 供货，加载中显示扫光骨架 -->
          <!-- data-photo 落在 BlogImage 的根容器上，查看器会取里面的 <img> -->
          <BlogImage
            :src="cover"
            :alt="post.title"
            loading="eager"
            data-photo
            class="mt-6 aspect-[16/9] w-full rounded-[1.5rem]"
          />

          <div class="rule-dotted mt-8 w-full" />
        </header>

        <!-- 窄屏折叠目录：宽屏由左侧栏承担 -->
        <details v-if="post.headings.length" class="mt-8 rounded-2xl bg-card p-4 xl:hidden">
          <summary class="cursor-pointer text-sm font-medium text-ink-strong">On this page</summary>
          <ul class="mt-3 space-y-1.5">
            <li v-for="heading in post.headings" :key="heading.id">
              <a
                :href="`#${heading.id}`"
                class="block text-sm text-ink-soft transition-colors hover:text-ink-strong"
                :class="heading.level === 3 ? 'pl-5' : ''"
              >
                {{ heading.text }}
              </a>
            </li>
          </ul>
        </details>

        <!--
          正文由本站 Markdown（content/posts/*.md）经服务端 markdown-it + Shiki 渲染。
          内容来源可信，不使用用户提交的 HTML。详见 README「安全边界」。
        -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="reading-column mt-10" v-html="post.html" />

        <!-- 许可说明与过时提示 -->
        <BlogPostFooter :post="post" />

        <nav class="mt-16 border-t border-line pt-8" aria-label="Adjacent posts">
          <div class="grid gap-4 sm:grid-cols-2">
            <NuxtLink
              v-if="post.prev"
              :to="`/posts/${post.prev.slug}`"
              class="rounded-2xl bg-card p-4 transition-colors hover:bg-card-hover"
            >
              <span class="text-meta text-ink-soft">Newer</span>
              <span class="mt-1 block font-medium text-ink-strong">{{ post.prev.title }}</span>
            </NuxtLink>

            <NuxtLink
              v-if="post.next"
              :to="`/posts/${post.next.slug}`"
              class="rounded-2xl bg-card p-4 transition-colors hover:bg-card-hover sm:col-start-2 sm:text-right"
            >
              <span class="text-meta text-ink-soft">Older</span>
              <span class="mt-1 block font-medium text-ink-strong">{{ post.next.title }}</span>
            </NuxtLink>
          </div>
        </nav>

        <!-- 评论区放在上一篇 / 下一篇之后：读者先看完内容与导航，再决定要不要参与讨论 -->
        <BlogPostComments />
      </article>
    </div>

    <!-- 向下滚过一屏后出现：回到顶部 / 回到 Contents -->
    <BlogReadingActions />
  </div>
</template>
