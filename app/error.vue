<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const title = computed(() => (props.error.statusCode === 404 ? 'Page not found' : 'Something broke'))

const detail = computed(() =>
  props.error.statusCode === 404
    ? '这个地址没有对应的内容，也许它已经被重命名或移走了。'
    : props.error.statusMessage || '服务器遇到了意料之外的情况。',
)

useHead({ title: `${props.error.statusCode} · ${title.value}` })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-canvas px-6">
    <div class="w-full max-w-md text-center">
      <p class="text-codename font-medium text-ink-strong">{{ error.statusCode }}</p>
      <div class="rule-dotted mx-auto mt-4 w-44" />
      <h1 class="mt-5 text-xl font-medium text-ink-strong">{{ title }}</h1>
      <p class="mt-2 text-ink-soft">{{ detail }}</p>

      <button
        type="button"
        class="mt-8 rounded-full bg-accent px-6 py-2.5 font-medium text-[#0b2b33] transition-colors hover:bg-accent-deep"
        @click="clearError({ redirect: '/' })"
      >
        Back to home
      </button>
    </div>
  </div>
</template>
