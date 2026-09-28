<script setup lang="ts">
import type { PostSummary } from '~~/shared/types/content'

const route = useRoute()

const tag = computed(() => String(route.params.tag))

const { data: posts } = await useFetch<PostSummary[]>(
  () => postsEndpoint({ tag: tag.value }),
  { default: () => [] },
)

useSeoMeta({
  title: () => `#${tag.value}`,
  description: () => `带有 ${tag.value} 标签的全部文章。`,
})
</script>

<template>
  <BlogArchiveView
    :title="`#${tag}`"
    :lead="`带有 ${tag} 标签的全部文章，按时间倒序。`"
    :posts="posts"
    empty-hint="没有文章使用这个标签。"
  />
</template>
