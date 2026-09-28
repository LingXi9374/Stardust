<script setup lang="ts">
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faBilibili, faGithub, faXTwitter } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope, faLink, faRss } from '@fortawesome/free-solid-svg-icons'
import type { SocialLink } from '~~/shared/types/content'

const props = withDefaults(
  defineProps<{
    links: SocialLink[]
    /** default：44px 圆形按钮（首页）；compact：行内小图标（页脚 / About） */
    variant?: 'default' | 'compact'
  }>(),
  { variant: 'default' },
)

/**
 * icon 键名 → 图标。品牌图标来自 free-brands，通用图标来自 free-solid。
 * 直接传 IconDefinition 而不是用 library.add + 字符串名，
 * 这样打包时只有这里列出的图标会进入产物。
 */
const ICONS: Record<string, IconDefinition> = {
  x: faXTwitter,
  github: faGithub,
  bilibili: faBilibili,
  rss: faRss,
  email: faEnvelope,
  link: faLink,
}

function resolveIcon(name: string): IconDefinition {
  return ICONS[name] ?? faLink
}

/** 站外链接新开标签页；站内（如 /feed.xml、mailto:）保持当前页。 */
function targetOf(href: string): string | undefined {
  return isExternalUrl(href) ? '_blank' : undefined
}

function relOf(href: string): string | undefined {
  return isExternalUrl(href) ? 'noopener noreferrer' : undefined
}
</script>

<template>
  <ul
    class="flex flex-wrap items-center justify-center"
    :class="props.variant === 'default' ? 'gap-3' : 'gap-2'"
    aria-label="Elsewhere"
  >
    <li v-for="link in links" :key="link.label">
      <a
        :href="link.href"
        :target="targetOf(link.href)"
        :rel="relOf(link.href)"
        :aria-label="link.label"
        :title="link.label"
        class="flex items-center justify-center rounded-full transition-colors"
        :class="
          props.variant === 'default'
            ? 'size-11 bg-accent text-[#0b2b33] hover:bg-accent-deep'
            : 'size-8 text-ink-soft hover:bg-card hover:text-ink-strong'
        "
      >
        <FontAwesomeIcon
          :icon="resolveIcon(link.icon)"
          class="text-[1.05rem]"
          aria-hidden="true"
        />
      </a>
    </li>
  </ul>
</template>
