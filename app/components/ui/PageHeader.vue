<script setup lang="ts">
defineProps<{
  title: string
  lead?: string
}>()
</script>

<template>
  <header>
    <h1 class="text-3xl font-medium tracking-tight text-ink-strong">{{ title }}</h1>
    <div class="rule-dotted mt-3 w-40" />
    <p v-if="lead" class="mt-4 max-w-[60ch] text-ink-soft">{{ lead }}</p>
  </header>
</template>
