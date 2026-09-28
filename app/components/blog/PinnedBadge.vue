<script setup lang="ts">
import { faThumbtack } from '@fortawesome/free-solid-svg-icons'

withDefaults(
  defineProps<{
    /** canvas：放在卡片（bg-card）上；plain：放在画布或时间线上 */
    tone?: 'canvas' | 'plain'
  }>(),
  { tone: 'canvas' },
)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-meta font-medium text-ink-soft"
    :class="tone === 'canvas' ? 'bg-canvas' : 'bg-card'"
  >
    <!--
      标题里已经写了 Pinned 字样，图标属于纯粹的视觉提示，
      因此对辅助技术隐藏，避免读屏重复播报。
    -->
    <FontAwesomeIcon :icon="faThumbtack" class="text-[0.85em]" aria-hidden="true" />
    Pinned
  </span>
</template>
