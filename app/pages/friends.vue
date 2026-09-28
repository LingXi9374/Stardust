<script setup lang="ts">
const { friends } = useAppConfig()

useSeoMeta({
  title: 'Friends',
  description: '常读的邻居们。',
})
</script>

<template>
  <div class="px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
    <div class="mx-auto max-w-4xl">
      <UiPageHeader
        title="Friends"
        lead="常读的邻居们。交换链接请直接发邮件，附上站点地址和一句话简介即可。"
      />

      <ul class="mt-10 grid gap-4 sm:grid-cols-2">
        <li v-for="friend in friends" :key="friend.name">
          <a
            :href="friend.href"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-full items-start gap-4 rounded-[1.75rem] bg-card p-5 transition-colors hover:bg-card-hover"
          >
            <BlogImage
              v-if="friend.avatar"
              :src="friend.avatar"
              :alt="`${friend.name} 的头像`"
              class="size-11 shrink-0 rounded-full"
            />
            <span v-else class="size-11 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span class="min-w-0">
              <span class="block font-medium text-ink-strong">{{ friend.name }}</span>
              <span class="mt-1 block text-sm leading-relaxed text-ink-soft">
                {{ friend.description }}
              </span>
            </span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
