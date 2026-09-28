import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import { siteMeta } from './blog.config'

/** 从环境变量推断构建平台。Statistics 页展示用。 */
function detectBuildPlatform(): string {
  if (process.env.VERCEL) return 'Vercel'
  if (process.env.GITHUB_ACTIONS) return 'GitHub Actions'
  if (process.env.CF_PAGES) return 'Cloudflare Pages'
  if (process.env.NETLIFY) return 'Netlify'
  if (process.env.GITLAB_CI) return 'GitLab CI'
  return '本地构建'
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version?: string
  packageManager?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/** 去掉 semver 前缀，`^4.5.2` → `4.5.2` */
function clean(range: string | undefined): string {
  return (range ?? '').replace(/^[\^~>=<\s]+/, '')
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: false },

  css: [
    // Font Awesome 图标基线样式（见 app/plugins/fontawesome.ts 的 autoAddCss 说明）
    '@fortawesome/fontawesome-svg-core/styles.css',
    // KaTeX 公式排版（含字体，交给 Vite 处理成带 hash 的资源）
    'katex/dist/katex.min.css',
    '~/assets/css/main.css',
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  runtimeConfig: {
    /** 文章 Markdown 所在目录，相对项目根。 */
    contentDir: 'content/posts',

    public: {
      /**
       * 站点完整 URL，用于 canonical、og:url 与绝对化的分享图地址。
       *
       * **刻意留空、不写死在这里。** 同一份模板会被部署到无数个域名下，
       * 把 URL 固化进配置文件意味着每个使用者都得改源码、还会在升级时冲突。
       * 部署时用环境变量提供即可：
       *
       *   NUXT_PUBLIC_SITE_URL=https://blog.example.com
       *
       * 留空时页面照常工作，只是不输出 canonical / og:url 这类需要绝对地址的标签。
       */
      siteUrl: '',

      /**
       * 构建信息。这些值在**构建那一刻**求值并被序列化进产物，
       * Statistics 页展示的是「这份产物是什么时候、在哪儿、用什么版本构建的」，
       * 而不是访问者恰好命中的某个实例的运行时状态。
       */
      buildInfo: {
        blogVersion: pkg.version ?? siteMeta.version,
        builtAt: new Date().toISOString(),
        platform: detectBuildPlatform(),
        /** 取自 package.json 的 packageManager 字段，例如 bun@1.4.2 → 1.4.2 */
        bun: pkg.packageManager?.replace(/^bun@/, '') ?? '',
        nuxt: clean(pkg.dependencies?.nuxt),
        vue: clean(pkg.dependencies?.vue),
        tailwind: clean(pkg.devDependencies?.tailwindcss),
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // theme-color / 描述 / 图标等由 app/composables/useSiteSeo.ts 按 blog.config.ts 输出
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap',
        },
      ],
    },
  },
})
