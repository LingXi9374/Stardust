<script setup lang="ts">
/**
 * 宽高比直接给 BlogImage 的根元素，而不是套一层 aspect-[4/3] 再让图片 size-full。
 * 后者的 height:100% 依赖父级高度的百分比解析，一旦解析失败根元素就塌成 0 高，
 * 被自身 overflow-hidden 裁掉——外面只剩一个空的 bg-card 色块。
 */
const { albums } = useAlbums()

useSeoMeta({
  title: 'Gallery',
  description: '按册归档的图像笔记。',
})
</script>

<template>
  <div class="px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
    <div class="mx-auto max-w-4xl">
      <UiPageHeader title="Gallery" lead="按册归档的图像笔记。点进一册看全部。" />

      <ul class="mt-10 grid gap-6 sm:grid-cols-2">
        <li v-for="album in albums" :key="album.slug">
          <NuxtLink :to="`/gallery/${album.slug}`" class="group block">
            <BlogImage
              v-if="album.coverKey"
              :src="album.coverKey"
              :alt="album.title"
              class="aspect-[4/3] w-full rounded-[1.75rem] transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div v-else class="aspect-[4/3] w-full rounded-[1.75rem] bg-card" aria-hidden="true" />

            <div class="mt-3 flex items-baseline justify-between gap-3">
              <h2 class="font-medium text-ink-strong transition-colors group-hover:text-ink">
                {{ album.title }}
              </h2>
              <span class="shrink-0 text-meta tabular-nums text-ink-soft">{{ album.count }} 张</span>
            </div>

            <p class="mt-1 text-sm leading-relaxed text-ink-soft">{{ album.description }}</p>
          </NuxtLink>
        </li>
      </ul>

      <p v-if="albums.length === 0" class="mt-10 rounded-3xl bg-card p-8 text-center text-ink-soft">
        还没有相册。在 <code class="font-mono text-sm">app/app.config.ts</code> 的
        <code class="font-mono text-sm">albums</code> 里加一册即可。
      </p>
    </div>
  </div>
</template>
