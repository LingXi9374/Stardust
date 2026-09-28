<script setup lang="ts">
/**
 * Win10 开始屏幕风格的磁贴。
 *
 * 两种排布：
 * - `stack`：图标在上、数值居中，适合「文章数」「总字数」这类大数字
 * - `row`：图标在左、标签与内容在右，适合「构建平台」「Nuxt 版本」这类文本值
 *
 * 与原版磁贴的两点差异，都是为了让它在阅读优先的站点里不显得突兀：
 * 圆角用 rounded-xl 而不是原版的近直角；配色只用锁定色板，
 * 没有原版那种高饱和的纯色块——磁贴之间靠「实心 / 描边」区分主次。
 */
withDefaults(
  defineProps<{
    label: string
    value: string | number
    /** 值后面的单位，小字显示 */
    unit?: string
    /** 一行说明，显示在标签下方 */
    hint?: string
    /** solid：强调色实心，用于关键数字；outline：常规卡片 */
    tone?: 'solid' | 'outline'
    /** 占据的列数（窄屏一律 1 列，见模板里的响应式类） */
    span?: 1 | 2
    layout?: 'stack' | 'row'
  }>(),
  { unit: '', hint: '', tone: 'outline', span: 1, layout: 'stack' },
)
</script>

<template>
  <div
    class="rounded-xl border p-4 transition-colors"
    :class="[
      layout === 'stack' ? 'flex min-h-[7.5rem] flex-col justify-between' : 'flex items-center gap-3',
      tone === 'solid'
        ? 'border-transparent bg-accent text-[#0b2b33]'
        : 'border-line bg-card text-ink hover:bg-card-hover',
      span === 2 ? 'sm:col-span-2' : '',
    ]"
  >
    <!-- 横向布局：图标独立成一列，用底色块把它和文字分开 -->
    <span
      v-if="layout === 'row'"
      class="grid size-9 shrink-0 place-items-center rounded-lg"
      :class="tone === 'solid' ? 'bg-[#0b2b33]/10 text-[#0b2b33]' : 'bg-canvas text-accent-deep'"
    >
      <slot name="icon" />
    </span>

    <div :class="layout === 'row' ? 'min-w-0 flex-1' : 'mt-3'">
      <template v-if="layout === 'row'">
        <p class="text-xs" :class="tone === 'solid' ? 'text-[#0b2b33]/75' : 'text-ink-soft'">
          {{ label }}
        </p>
        <p
          class="mt-0.5 truncate text-base font-medium"
          :class="tone === 'solid' ? 'text-[#0b2b33]' : 'text-ink-strong'"
          :title="String(value)"
        >
          {{ value }}
        </p>
        <p
          v-if="hint"
          class="mt-0.5 truncate text-[0.6875rem]"
          :class="tone === 'solid' ? 'text-[#0b2b33]/60' : 'text-ink-soft/80'"
          :title="hint"
        >
          {{ hint }}
        </p>
      </template>

      <template v-else>
        <slot name="icon" />

        <p class="flex items-baseline gap-1">
          <span
            class="text-2xl font-medium tracking-tight tabular-nums"
            :class="tone === 'solid' ? 'text-[#0b2b33]' : 'text-ink-strong'"
          >
            {{ value }}
          </span>
          <span
            v-if="unit"
            class="text-xs"
            :class="tone === 'solid' ? 'text-[#0b2b33]/70' : 'text-ink-soft'"
          >
            {{ unit }}
          </span>
        </p>

        <p
          class="mt-1 text-xs"
          :class="tone === 'solid' ? 'text-[#0b2b33]/80' : 'text-ink-soft'"
        >
          {{ label }}
        </p>

        <p
          v-if="hint"
          class="mt-0.5 truncate text-[0.6875rem]"
          :class="tone === 'solid' ? 'text-[#0b2b33]/60' : 'text-ink-soft/80'"
          :title="hint"
        >
          {{ hint }}
        </p>
      </template>
    </div>
  </div>
</template>
