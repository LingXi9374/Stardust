<script setup lang="ts">
import type { PostSummary } from '~~/shared/types/content'

withDefaults(
  defineProps<{
    title: string
    lead?: string
    posts: PostSummary[]
    emptyHint?: string
  }>(),
  { emptyHint: '这里还没有文章。' },
)
</script>

<template>
  <div class="px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
    <div class="mx-auto max-w-3xl">
      <UiPageHeader :title="title" :lead="lead" />

      <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-meta text-ink-soft">
        <NuxtLink to="/contents" class="transition-colors hover:text-ink-strong">
          ← All contents
        </NuxtLink>
        <span>{{ posts.length }} posts</span>
      </div>

      <div class="mt-10">
        <BlogPostTimeline v-if="posts.length" :posts="posts" />

        <p v-else class="rounded-3xl bg-card p-8 text-center text-ink-soft">
          {{ emptyHint }}
        </p>
      </div>
    </div>
  </div>
</template>
