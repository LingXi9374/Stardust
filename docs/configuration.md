# 配置

这篇写给要改站点信息的人。Stardust 的配置分两处：`blog.config.ts` 管构建期与渲染期的行为，`app/app.config.ts` 管站点内容。下面逐字段列出取值、默认值和影响范围。

## 两个文件的分工

| 文件 | 管什么 | 生效时机 |
| --- | --- | --- |
| `app/app.config.ts` | 站名、首页文案、导航、社交按钮、友链、相册 | 开发期热更新；构建进产物 |
| `blog.config.ts` | SEO、站点元信息、图片管线、代码块策略、图表开关、Markdown 扩展开关 | 构建期求值，写进产物 |

`blog.config.ts` 由 `nuxt.config.ts`、`modules/media`、Markdown 渲染管线与服务端接口直接 import，改完需要重启开发服务器（图片素材的改动会自动重启，见[图片管线](media-pipeline.md)）。

## blog.config.ts

### seo

站点级 SEO 默认值，由 `app/composables/useSiteSeo.ts` 输出。标题、描述、图标、分享图都在这里，单页的覆盖走 `usePageSeo()`。

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | string | `'Stardust'` | 站点标题，用于 `<title>` 与搜索结果 |
| `titleTemplate` | string | `'%s · Stardust'` | `%s` 换成当前页标题；首页没有页标题时直接用 `title` |
| `description` | string | — | 站点描述，出现在搜索结果摘要与分享卡片 |
| `keywords` | string[] | — | 逗号拼接写入 `<meta name="keywords">` |
| `favicon` | string | `'/favicon.svg'` | 相对 `public` 的路径 |
| `appleTouchIcon` | string | `''` | iOS 主屏图标，留空回退 `favicon` |
| `ogImage` | string | `''` | 默认分享图，填 `assets/media` 的素材 key 或完整 URL；留空时文章用封面、其他页面不输出 |
| `locale` | string | `'zh_CN'` | `og:locale` |
| `twitter.card` | `'summary' \| 'summary_large_image'` | `'summary_large_image'` | X 卡片类型 |
| `twitter.site` | string | `''` | `@用户名`，留空则不输出 |
| `themeColor.light` | string | `'#e9feff'` | 亮色地址栏配色 |
| `themeColor.dark` | string | `'#0f2a30'` | 暗色地址栏配色 |
| `indexable` | boolean | `false` | `false` 时输出 `noindex, nofollow` |

`indexable` 默认为 `false` 是给模板仓库用的：同一份代码衍生出的站点内容会高度重合，谁的演示站被收录都是互相伤害。正式建站时改成 `true`。

`title` 与 `app/app.config.ts` 里的 `site.name` 是两件事：`title` 给搜索引擎看，`site.name` 显示在侧栏。多数情况下写成同一个即可。

### siteMeta

站点元信息，用于文章页脚与 `/statistics`。

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `since` | string | `'2024-01-01'` | 建站日期，`YYYY-MM-DD`；统计页据此算运行时长 |
| `version` | string | `'0.1.0'` | 站点版本号，展示在统计页的构建信息里 |
| `license.name` | string | `'CC BY-NC-SA 4.0'` | 文章页脚显示的协议简称 |
| `license.url` | string | Creative Commons 地址 | 协议原文链接 |
| `outdatedAfterDays` | number | `100` | 文章超过多少天算过时；设 `0` 则从不提示 |

过时提示的基准日期取文章的 `updated`，没写这个字段时回退到 `date`。判断逻辑在 `app/components/blog/PostFooter.vue`。

### media

图片管线的压缩参数。完整流程见[图片管线](media-pipeline.md)。

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `format` | `'avif' \| 'webp' \| 'both'` | `'both'` | `both` 同时产出两种格式，页面用 `<picture>` 让浏览器自选 |
| `quality` | number | `72` | 压缩质量 1–100，**以 WebP 的标尺为准**，AVIF 一侧由标定表换算 |
| `avifQuality` | number? | 未设置 | 直接指定 AVIF 质量，覆盖换算结果 |
| `webpQuality` | number? | 未设置 | 直接指定 WebP 质量，覆盖 `quality` |
| `maxWidth` | number | `1920` | 超过这个宽度等比缩小 |
| `avifEffort` | number | `4` | AVIF 编码耗时档位 0–9；实测过了 4 之后体积差不到 1%，耗时却要 ×6 |
| `randomCover.enabled` | boolean | `true` | 文章没写 `cover` 时是否回落到随机图 API |
| `randomCover.endpoint` | string | `'https://t.alcy.cc/pc'` | 每次请求 302 到一张不同的图 |
| `randomCover.minWidth` | number | `1280` | 低于此宽度的图不作为封面 |

`format` 设成 `'avif'` 时回退图也是 avif，Safari 16 之前的版本看不到图。要兼顾老浏览器就用默认的 `'both'`。

### codeBlocks

代码块的默认行为，单个代码块可以用围栏参数覆盖（写法见[写文章](writing.md)）。

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `lineNumbers` | `'auto' \| 'always' \| 'never'` | `'auto'` | `auto` 表示行数达到阈值才显示 |
| `lineNumbersThreshold` | number | `3` | `auto` 策略下的行数阈值 |
| `terminalLanguages` | string[] | bash / sh / shell / zsh / fish / console / terminal / powershell / ps / ps1 / cmd / bat | 这些语言套 mac 终端窗口，其余套编辑器窗口 |
| `copyButton` | boolean | `true` | 代码块右上角的复制按钮；关掉则不加载对应的客户端脚本 |
| `wrap` | boolean | `false` | 默认是否自动换行 |
| `terminalDots` | `'classic' \| 'palette'` | `'classic'` | 终端窗口左上角三个圆点：`classic` 是 mac 红黄绿，也是全站唯一一处色板外的颜色；`palette` 改用锁定前景色 |

### diagrams

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `mermaid` | boolean | `true` | 关闭后 mermaid 代码块退化成普通代码块，源码依然可读 |
| `plantuml.enabled` | boolean | `true` | 关闭后显示图表源码 |
| `plantuml.server` | string | `'https://www.plantuml.com/plantuml'` | PlantUML 服务地址，可指向自建实例 |

PlantUML 的图表源码会随 URL 发给这个服务。介意的话换自建实例，见[部署](deployment.md)。

### markdown

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `githubCard` | boolean | `true` | 是否渲染 `::github{repo="owner/name"}` 卡片；渲染时请求 GitHub API，未认证每小时 60 次，超限或断网降级成静态卡片 |
| `admonitions` | boolean | `true` | 关闭后提醒框退回普通引用块 |
| `admonitionsColorful` | boolean | `false` | 开启后按语义着色（note 蓝 / tip 绿 / warning 黄 / danger 红），会引入色板外的颜色 |

### comments

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | 评论总开关。关掉后文章页不渲染评论区，`@giscus/vue` 也不会被加载，不留多余请求 |
| `heading` | string | `'评论'` | 评论区标题 |
| `giscus.repo` | `` `${string}/${string}` `` | — | 评论所在仓库。**建站时必须替换** |
| `giscus.repoId` | string | `''` | 仓库 ID |
| `giscus.category` | string | `'Announcements'` | Discussion 分类名 |
| `giscus.categoryId` | string | `''` | 分类 ID |
| `giscus.mapping` | `'pathname'` 等 | `'pathname'` | 页面与 Discussion 的映射方式 |
| `giscus.strict` | `'0' \| '1'` | `'0'` | `1` = 只接受对该仓库有权限的人发起新讨论 |
| `giscus.reactionsEnabled` | `'0' \| '1'` | `'1'` | 是否显示表情回应 |
| `giscus.emitMetadata` | `'0' \| '1'` | `'0'` | 是否把讨论元数据发给父页面 |
| `giscus.inputPosition` | `'top' \| 'bottom'` | `'top'` | 评论输入框在列表上方还是下方 |
| `giscus.lang` | string | `'zh-CN'` | 界面语言 |
| `giscus.loading` | `'lazy' \| 'eager'` | `'lazy'` | `lazy` 等滚动到评论区附近才加载 iframe |
| `giscus.theme.light` / `.dark` | string | 见下 | 自定义主题，相对站点根的路径 |
| `giscus.theme.fallbackLight` / `.fallbackDark` | string | `'light'` / `'dark_dimmed'` | 站点不是 https 时退回的 giscus 内置主题名 |

`repo` / `repoId` / `categoryId` 不要手写——去 <https://giscus.app/zh-CN> 填好仓库，页面会直接把这三个值生成出来，照抄即可。没填全时文章页不会渲染评论区，而是显示一条指向该页面的提示，不会给读者看到一个报错的 iframe。

`theme.light` 与 `theme.dark` 会被拼成绝对 https 地址再交给 giscus。完整的配置流程与那两个主题文件怎么改，见[评论](comments.md)。

## app/app.config.ts

改动这个文件不需要动组件。

### site

| 字段 | 默认 | 用在哪 |
| --- | --- | --- |
| `name` | `'Name'` | 侧栏左上角站名、页脚版权 |
| `codename` | `'Codename'` | 首页主标题 |
| `description` | `'Description'` | 首页副标题 |
| `tagline` | `'一个阅读优先的简洁风博客模板。'` | 首页与 About 页的描述、首页 SEO 描述 |
| `author` | `'Name'` | About 页与文章页脚的作者名 |
| `email` | `'hello@example.com'` | About 页的联系方式 |
| `startYear` | `2024` | 侧栏版权的起始年份，与当前年份组成区间 |

### nav

数组，每项 `{ label, to }`，顺序即侧栏展示顺序。默认条目指向 `/`、`/contents`、`/friends`、`/about`、`/gallery`、`/statistics`。`to` 写路由路径，可以指向自己新增的页面。

### social

首页底部的平台跳转按钮，每项 `{ label, href, icon }`。

`icon` 是键名，由 `app/components/ui/SocialLinks.vue` 映射到 Font Awesome 图标。可用的键：`x`、`github`、`bilibili`、`rss`、`email`，认不出的值回退到 `link`。站外链接自动加 `target="_blank" rel="noopener noreferrer"`，站内路径（`/feed.xml`）与 `mailto:` 保持当前页。

想加别的平台，在 `app/components/ui/SocialLinks.vue` 的 `ICONS` 里补一行。图标以 `IconDefinition` 直接传入，没有调用 `library.add()`，所以只有这里列出的图标会进产物；改成字符串名会把整包图标带上。

组件还有 `variant="compact"` 变体（更小的行内样式），适合放进页脚或 About 页。

### friends

友链列表，每项 `{ name, href, avatar, description }`。

`avatar` 可以填 `assets/media` 的素材 key（例如 `friends/01`），也可以直接填图床链接。留空时显示一块强调色圆形占位。头像走 `<BlogImage>`，默认带 `referrerpolicy="no-referrer"`，防盗链的图床也能加载。

### albums

相册列表，每项 `{ slug, title, description, dir, cover? }`。图片不在这里列：`dir` 指向 `assets/media` 下的目录，清单里该目录下的素材会被自动收录，按文件名自然排序（`01, 02, … 10`）。`cover` 填素材 key，留空用该目录排序第一张。

`slug` 决定访问路径 `/gallery/<slug>`，`dir` 是相对 `assets/media` 的目录名（例如 `albums/anime-moments`）。两者可以不同名。

## 合集不在配置文件里

合集由 `content/posts/` 下的子文件夹决定，标题与描述写在文件夹内的 `_collection.md`。建文件夹就是建合集，删掉文件夹合集就消失，不会出现「配置里有、内容里没有」的空合集。写法见[写文章](writing.md)。

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `NUXT_PUBLIC_SITE_URL` | 空 | 站点对外地址，用于 canonical、`og:url` 与绝对化的分享图。留空时页面照常工作，只是不输出需要绝对地址的标签 |
| `NUXT_CONTENT_DIR` | `content/posts` | 文章 Markdown 所在目录，相对项目根，解析基准是进程工作目录 |

`.env.example` 里有这两项的模板。环境变量通过 Nuxt 的 `NUXT_` 前缀映射到 `runtimeConfig`，与配置文件互不冲突。

## 数据接口

页面路由一览在 [README](../README.md) 里。页面用到的接口如下，都由 Nitro 的 `server/api/` 提供。

| 接口 | 返回 |
| --- | --- |
| `GET /api/posts` | 全部文章摘要，置顶优先、其后按日期倒序 |
| `GET /api/posts?collection=<slug>` | 某个合集的文章 |
| `GET /api/posts?tag=<tag>` | 某个标签的文章 |
| `GET /api/posts/:slug` | 文章详情（已渲染 HTML、目录、前后篇）；不存在返回 404 |
| `GET /api/collections` | 全部合集，按 `order` 排序 |
| `GET /api/collections/:slug` | 单个合集；不存在返回 404 |
| `GET /api/site-info` | 构建信息与聚合统计，供 `/statistics` 使用 |
| `GET /api/search?q=<查询>&limit=<条数>` | 站内搜索，范围是全部文章的标题与正文；查询过短时返回空结果 |

筛选在服务端完成，子页面只取自己需要的数据，不会把全量列表传给客户端。合集名随文章摘要一起下发（`collectionName`），详情页不必再查一次合集列表。
