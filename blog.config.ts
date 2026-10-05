/**
 * 博客构建期配置。
 *
 * 这里放的是**构建期**设置——图片压缩格式与质量、SEO 默认值、示例素材来源等，
 * 由 nuxt.config.ts、app/composables/useSiteSeo.ts 与 modules/media 读取。
 *
 * 站点内容（站名、导航、合集、友链、相册等）请改 app/app.config.ts。
 */

/* ══════════════════════════════════════════════════════════════════════
   SEO
   ══════════════════════════════════════════════════════════════════════ */

export interface BlogSeoConfig {
  /**
   * 站点标题。用于 <title> 与搜索结果。
   *
   * 和 app.config.ts 里的 `site.name` 是两件事：那个是侧栏上显示的短名字，
   * 这个是给搜索引擎看的完整标题。多数情况下写成同一个即可。
   */
  title: string

  /**
   * 标题模板，`%s` 会被替换成当前页面的标题。
   * 首页没有页面标题，直接用 `title`。
   */
  titleTemplate: string

  /** 站点描述，出现在搜索结果摘要与分享卡片里。 */
  description: string

  /** 关键词。对排名几乎没影响，但填上无妨。 */
  keywords: string[]

  /** 站点图标，相对 public 的路径。 */
  favicon: string

  /** iOS 添加到主屏时用的图标。留空则退回 `favicon`。 */
  appleTouchIcon: string

  /**
   * 默认分享图。填 assets/media 的素材 key，或一个完整 URL。
   * 留空则分享文章时用文章封面，分享其他页面时没有图。
   */
  ogImage: string

  /** Open Graph 的地区标记，形如 zh_CN。 */
  locale: string

  /** X（Twitter）卡片。`site` 填 @用户名，没有就留空字符串。 */
  twitter: {
    card: 'summary' | 'summary_large_image'
    site: string
  }

  /** 浏览器界面配色，明暗各一份。 */
  themeColor: {
    light: string
    dark: string
  }

  /**
   * 是否允许搜索引擎收录。
   *
   * 默认 **false**：这是一份模板，网上会有大量内容一模一样的衍生站，
   * 谁的演示站被收录了都是互相伤害。正式建站时改成 true。
   */
  indexable: boolean
}

export const seo: BlogSeoConfig = {
  title: 'Stardust',
  titleTemplate: '%s · Stardust',
  description: '一个阅读优先的简洁风博客模板。排版即界面——度量、行高与层级都按长文阅读调过。',
  keywords: ['博客模板', 'Nuxt', '阅读优先', '静态站点', 'blog template'],
  favicon: '/favicon.svg',
  appleTouchIcon: '',
  ogImage: '',
  locale: 'zh_CN',
  twitter: {
    card: 'summary_large_image',
    site: '',
  },
  themeColor: {
    light: '#e9feff',
    dark: '#0f2a30',
  },
  indexable: false,
}

/* ══════════════════════════════════════════════════════════════════════
   站点元信息（Statistics 页与文章页脚使用）
   ══════════════════════════════════════════════════════════════════════ */

export interface BlogSiteMetaConfig {
  /** 站点开始运行的年月日，`YYYY-MM-DD`。Statistics 页据此算「运行时长」。 */
  since: string

  /**
   * Blog 版本号。模板自身还没发版，这里由维护者自行定义；
   * 发版后与 CHANGELOG 的版本保持一致。
   */
  version: string

  /** 文章默认许可协议，显示在文章页脚。 */
  license: {
    /** 协议简称，例如 CC BY-NC-SA 4.0 */
    name: string
    /** 协议原文地址 */
    url: string
  }

  /**
   * 文章发布超过多少天算「过时」。
   * 文章页据此显示过时提示；设为 0 则从不提示。
   */
  outdatedAfterDays: number
}

export const siteMeta: BlogSiteMetaConfig = {
  since: '2024-01-01',
  version: '0.1.0',
  license: {
    name: 'CC BY-NC-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh',
  },
  outdatedAfterDays: 100,
}

/* ══════════════════════════════════════════════════════════════════════
   图片管线
   ══════════════════════════════════════════════════════════════════════ */

export type MediaFormat = 'avif' | 'webp'

export interface BlogMediaConfig {
  /**
   * 输出格式：
   * - `avif`  只输出 AVIF
   * - `webp`  只输出 WebP
   * - `both`  同时输出两者，页面用 <picture> 让浏览器自选；
   *           不支持 AVIF 的浏览器会自动回退到 WebP
   */
  format: MediaFormat | 'both'

  /**
   * 压缩质量 1–100。值越低体积越小、质量越差。
   *
   * 注意：这个数是**以 WebP 的标尺为准**的。AVIF 的 quality 是另一把尺子，
   * 同一个数字下 AVIF 反而可能更大，因此管线会按实测标定把它换算过去
   * （见 modules/media/quality.ts）。想绕过换算就直接设下面的两个覆盖值。
   */
  quality: number

  /** 直接指定 AVIF 质量，覆盖换算结果。留空则按标定表换算。 */
  avifQuality?: number

  /** 直接指定 WebP 质量，覆盖上面通用的 quality。 */
  webpQuality?: number

  /** 超过这个宽度就等比缩小，避免把 8000px 的原图直接发到页面上。 */
  maxWidth: number

  /** AVIF 编码耗时档位 0–9。实测 4 之后再往上收益极小（体积差 <1%，耗时 ×6）。 */
  avifEffort: number

  /** 未指定封面时使用的随机图 API。 */
  randomCover: {
    enabled: boolean
    /** 每次请求都会 302 到一张不同的图。 */
    endpoint: string
    /** 低于此宽度的图不作为封面使用（避免糊）。 */
    minWidth: number
  }
}

export const media: BlogMediaConfig = {
  format: 'both',
  quality: 72,
  maxWidth: 1920,
  avifEffort: 4,
  randomCover: {
    enabled: true,
    endpoint: 'https://t.alcy.cc/pc',
    minWidth: 1280,
  },
}

/* ══════════════════════════════════════════════════════════════════════
   文章渲染：代码块与扩展语法
   ══════════════════════════════════════════════════════════════════════ */

export interface BlogCodeBlockConfig {
  /**
   * 行号默认策略。
   * - `auto`   行数 ≥ 3 时显示（默认）
   * - `always` 一律显示
   * - `never`  一律不显示
   *
   * 单个块可用 ```js showLineNumbers 或 showLineNumbers=false 覆盖。
   */
  lineNumbers: 'auto' | 'always' | 'never'

  /** `auto` 策略下的行数阈值 */
  lineNumbersThreshold: number

  /**
   * 哪些语言用终端窗口框架（mac 红黄绿三个圆点）。
   * 其余语言用编辑器窗口框架（文件名 + 语言角标）。
   * 单个块可用 ```sh frame="code" 之类的写法覆盖。
   */
  terminalLanguages: string[]

  /** 代码块右上角的复制按钮。需要客户端脚本，关掉则完全不加载。 */
  copyButton: boolean

  /** 代码块默认是否自动换行。单个块可用 ```js wrap / wrap=false 覆盖。 */
  wrap: boolean

  /**
   * 终端窗口左上角的三个圆点。
   *
   * - `classic`（默认）：mac 的红黄绿。这是全站唯一一处色板外的颜色，
   *   但终端窗口的识别性正是来自这三个点。
   * - `palette`：改用锁定前景色，整套视觉严格不出色板。
   */
  terminalDots: 'classic' | 'palette'
}

export const codeBlocks: BlogCodeBlockConfig = {
  lineNumbers: 'auto',
  lineNumbersThreshold: 3,
  terminalLanguages: [
    'bash',
    'sh',
    'shell',
    'zsh',
    'fish',
    'console',
    'terminal',
    'powershell',
    'ps',
    'ps1',
    'cmd',
    'bat',
  ],
  copyButton: true,
  wrap: false,
  terminalDots: 'classic',
}

export interface BlogDiagramConfig {
  /**
   * Mermaid 在浏览器端渲染（按需加载，只有页面里真的出现 mermaid 块才会拉取）。
   * 关掉后 mermaid 代码块会退化成普通代码块，语法依然可读。
   */
  mermaid: boolean

  /**
   * PlantUML 在渲染阶段编码成服务端 SVG 地址。
   * 图表源码会随 URL 发给这个服务——介意的话把它指向自建实例。
   */
  plantuml: {
    enabled: boolean
    server: string
  }
}

export const diagrams: BlogDiagramConfig = {
  mermaid: true,
  plantuml: {
    enabled: true,
    server: 'https://www.plantuml.com/plantuml',
  },
}

export interface BlogMarkdownConfig {
  /**
   * GitHub 仓库卡片 ::github{repo="owner/name"}
   * 会在渲染时请求 GitHub API 取 star / 描述，结果进程内缓存。
   * 未认证的 API 每小时 60 次，超限或断网时降级成一张静态卡片。
   */
  githubCard: boolean

  /** 提醒框是否渲染成带图标的卡片（关掉则退回普通引用块）。 */
  admonitions: boolean

  /**
   * 提醒框是否按语义着色（note 蓝 / tip 绿 / warning 黄 / danger 红）。
   *
   * 默认 **false**：整套模板的色板被锁死在三个色值上，提醒框只用图标与描边
   * 区分轻重，颜色仍取自锁定色板。开启后才会引入色板之外的语义色。
   */
  admonitionsColorful: boolean
}

export const markdown: BlogMarkdownConfig = {
  githubCard: true,
  admonitions: true,
  admonitionsColorful: false,
}

/* ══════════════════════════════════════════════════════════════════════
   评论：giscus
   ══════════════════════════════════════════════════════════════════════ */

export interface BlogGiscusConfig {
  /**
   * 评论所在的仓库，形如 `owner/name`。
   *
   * 去 https://github.com/apps/giscus 给仓库装上 giscus App，
   * 然后到 https://giscus.app/zh-CN 填仓库名，页面会把下面这几个值
   * 直接生成给你——**照抄即可，不要手写**。
   */
  repo: string

  /** 仓库 ID。在 giscus.app 上配置时会自动填出来。 */
  repoId: string

  /** Discussion 分类名，例如 `Announcements`。 */
  category: string

  /** 分类 ID。同样由 giscus.app 生成。 */
  categoryId: string

  /**
   * 页面与 Discussion 的映射方式。
   *
   * 本站文章 URL 是 `/posts/<slug>`，用 `pathname` 最直观：
   * 一个路径一个讨论串，改标题不会断开已有评论。
   */
  mapping: 'url' | 'title' | 'og:title' | 'specific' | 'number' | 'pathname'

  /** `1` = 只接受「用 GitHub 登录且对该仓库有权限」的人发起新讨论。 */
  strict: '0' | '1'

  /** 是否显示表情回应。 */
  reactionsEnabled: '0' | '1'

  /** 是否把讨论的元数据发给父页面（用于自定义展示）。 */
  emitMetadata: '0' | '1'

  /** 评论输入框在列表上方还是下方。 */
  inputPosition: 'top' | 'bottom'

  /** 界面语言。 */
  lang: string

  /**
   * iframe 的加载时机。`lazy` 会等滚动到评论区附近才加载——
   * 一篇文章的读者可能根本不看评论，不该为它付出加载成本。
   */
  loading: 'lazy' | 'eager'

  /**
   * 自定义主题，相对 public 的路径。
   *
   * 这两个文件由 `bun scripts/build-giscus-theme.ts` 生成：
   * 以 giscus 官方主题为底，把 82 个变量重着色到本站色板（官方主题是整体替换、
   * 没有继承，所以变量一个都不能少）。
   *
   * 运行时会被拼成**绝对 https 地址**再交给 giscus——giscus 注入的 <link>
   * 带 crossorigin="anonymous"，是跨域请求，所以还需要
   * server/middleware/giscus-theme-cors.ts 补上 CORS 头。
   */
  theme: {
    light: string
    dark: string
    /**
     * 站点不是 https 时的回退主题（giscus 内置名）。
     *
     * 这不是偷懒：https 的 giscus.app 加载 http 的样式表属于混合内容，
     * 浏览器直接拦截，所以本地开发环境用自定义主题**必然无效**，
     * 只能退回内置主题。部署到 https 之后自动切回自定义主题。
     */
    fallbackLight: string
    fallbackDark: string
  }
}

export interface BlogCommentsConfig {
  /**
   * 评论总开关。关掉后文章页不渲染评论区，
   * `@giscus/vue` 也不会被加载——不留任何多余请求。
   */
  enabled: boolean

  /** 文章页评论区的标题。 */
  heading: string

  giscus: BlogGiscusConfig
}

export const comments: BlogCommentsConfig = {
  enabled: true,
  heading: '评论',
  giscus: {
    // ↓↓↓ 建站时替换成自己的仓库信息（giscus.app 会直接生成这几个值）↓↓↓
    repo: 'your-name/your-repo',
    repoId: '',
    category: 'Announcements',
    categoryId: '',
    mapping: 'pathname',
    strict: '0',
    reactionsEnabled: '1',
    emitMetadata: '0',
    inputPosition: 'top',
    lang: 'zh-CN',
    loading: 'lazy',
    theme: {
      light: '/giscus/preferred_color_scheme.css',
      dark: '/giscus/preferred_color_scheme_dark.css',
      fallbackLight: 'light',
      fallbackDark: 'dark_dimmed',
    },
  },
}
