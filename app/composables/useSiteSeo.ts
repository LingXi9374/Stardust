import { seo as seoConfig } from '~~/blog.config'

/**
 * 站点级 SEO。
 *
 * 配置来源有两个：
 *
 * - `blog.config.ts` 的 `seo`：标题、描述、图标、分享图、地区、主题色等**内容**
 * - `runtimeConfig.public.siteUrl`：站点完整 URL，**只从环境变量 NUXT_PUBLIC_SITE_URL 来**
 *
 * 为什么站点 URL 不进 blog.config.ts：同一份模板会被部署到无数个域名下，
 * 把 URL 固化进配置文件意味着每个使用者都要改源码，升级时还会冲突。
 *
 * 在 app.vue 里调用一次即可装上全局默认值；页面用 usePageSeo() 覆盖单页信息。
 */
export function useSiteSeo() {
  const { public: publicConfig } = useRuntimeConfig()
  const manifest = useMediaManifest()

  /** 去掉结尾斜杠，拼路径时不会出现 // */
  const siteUrl = computed(() => String(publicConfig.siteUrl || '').replace(/\/+$/, ''))

  /** 相对路径补成绝对地址；没有 siteUrl 时返回空串（宁可不输出，也不输出错误地址） */
  function absolute(path: string): string {
    const value = path.trim()
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value
    if (!siteUrl.value) return ''
    return `${siteUrl.value}${value.startsWith('/') ? value : `/${value}`}`
  }

  /**
   * 把分享图解析成可直接使用的地址。
   * 支持三种写法：assets/media 的素材 key、以 / 开头的 public 路径、完整 URL。
   */
  function resolveImage(source: string): string {
    const value = source.trim()
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value

    if (value.startsWith('/')) return absolute(value)

    const entry = manifest[value]
    return entry ? absolute(entry.fallback) : ''
  }

  useHead({
    titleTemplate: (title?: string) =>
      title ? seoConfig.titleTemplate.replace('%s', title) : seoConfig.title,

    meta: [
      { name: 'description', content: seoConfig.description },
      { name: 'keywords', content: seoConfig.keywords.join(', ') },
      { name: 'author', content: seoConfig.title },

      // 模板演示站默认不被收录，正式建站时把 seo.indexable 改成 true
      ...(seoConfig.indexable
        ? [{ name: 'robots', content: 'index, follow' }]
        : [{ name: 'robots', content: 'noindex, nofollow' }]),

      // 地址栏配色随明暗切换，两份都要给
      { name: 'theme-color', content: seoConfig.themeColor.light, media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: seoConfig.themeColor.dark, media: '(prefers-color-scheme: dark)' },

      { property: 'og:site_name', content: seoConfig.title },
      { property: 'og:locale', content: seoConfig.locale },
      { name: 'twitter:card', content: seoConfig.twitter.card },
      ...(seoConfig.twitter.site
        ? [{ name: 'twitter:site', content: seoConfig.twitter.site }]
        : []),
    ],

    link: [
      { rel: 'icon', href: seoConfig.favicon },
      {
        rel: 'apple-touch-icon',
        href: seoConfig.appleTouchIcon || seoConfig.favicon,
      },
    ],
  })

  return { siteUrl, absolute, resolveImage }
}

/**
 * 单页 SEO。页面调它来覆盖标题、描述与分享图。
 *
 * og:url 只在配了 siteUrl 时输出——没有绝对地址的 canonical 是有害的，
 * 搜索引擎会把它当成另一个页面。
 */
export function usePageSeo(meta: {
  title?: MaybeRefOrGetter<string | undefined>
  description?: MaybeRefOrGetter<string | undefined>
  /** 分享图：素材 key、public 路径或完整 URL */
  image?: MaybeRefOrGetter<string | undefined>
  type?: 'website' | 'article'
}) {
  const { absolute, resolveImage } = useSiteSeo()
  const route = useRoute()

  const title = computed(() => toValue(meta.title))
  const description = computed(() => toValue(meta.description))
  const image = computed(() => resolveImage(toValue(meta.image) ?? ''))

  useSeoMeta({
    title: () => title.value,
    description: () => description.value,
    ogTitle: () => title.value,
    ogDescription: () => description.value,
    ogType: meta.type ?? 'website',
    ogUrl: () => absolute(route.path),
    ogImage: () => image.value || undefined,
  })
}
