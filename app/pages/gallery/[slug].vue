<script setup lang="ts">
const route = useRoute()
const { findBySlug } = useAlbums()

const slug = computed(() => String(route.params.slug))
const album = computed(() => findBySlug(slug.value))

if (!album.value) {
  throw createError({ statusCode: 404, statusMessage: 'Album not found', fatal: true })
}

useSeoMeta({
  title: () => album.value?.title ?? slug.value,
  description: () => album.value?.description ?? '',
})
</script>

<template>
  <div class="px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
    <div class="mx-auto max-w-5xl">
      <UiPageHeader :title="album?.title ?? slug" :lead="album?.description" />

      <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-meta text-ink-soft">
        <NuxtLink to="/gallery" class="transition-colors hover:text-ink-strong">
          ← All albums
        </NuxtLink>
        <span>{{ album?.count ?? 0 }} 张</span>
      </div>

      <!--
        瀑布流：CSS 多列。图片保持原始比例（fill=false），高度自然错落，
        靠的是素材本身的横竖比例差异——不是把所有图裁成同一个尺寸。
      -->
      <div v-if="album?.images.length" class="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
        <figure
          v-for="(key, index) in album.images"
          :key="key"
          class="mb-4 break-inside-avoid"
        >
          <BlogImage
            :src="key"
            :alt="`${album.title} #${index + 1}`"
            :fill="false"
            class="rounded-2xl"
          />
        </figure>
      </div>

      <p v-else class="mt-10 rounded-3xl bg-card p-8 text-center text-ink-soft">
        这一册还没有图片。把图片放进
        <code class="font-mono text-sm">assets/media/{{ album?.dir }}/</code> 即可自动收录。
      </p>
    </div>
  </div>
</template>
