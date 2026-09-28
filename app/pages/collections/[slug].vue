<script setup lang="ts">
import type { CollectionMeta, PostSummary } from '~~/shared/types/content'

const route = useRoute()
const slug = computed(() => String(route.params.slug))

/**
 * 向单个合集接口要元信息。不存在时服务端返回 404，
 * useFetch 会把它带上来——比「列表为空」更能说明问题。
 */
const { data: collection, error } = await useFetch<CollectionMeta>(
  () => collectionEndpoint(slug.value),
)

if (error.value || !collection.value) {
  throw createError({ statusCode: 404, statusMessage: 'Collection not found', fatal: true })
}

const { data: posts } = await useFetch<PostSummary[]>(
  () => postsEndpoint({ collection: slug.value }),
  { default: () => [] },
)

useSeoMeta({
  title: () => collection.value?.name ?? slug.value,
  description: () => collection.value?.description ?? '',
})
</script>

<template>
  <BlogArchiveView
    :title="collection?.name ?? ''"
    :lead="collection?.description"
    :posts="posts ?? []"
    empty-hint="这个合集下还没有文章。"
  />
</template>
