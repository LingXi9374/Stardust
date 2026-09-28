# Stardust

一个阅读优先的博客模板。Nuxt 4 + Tailwind CSS 4，站点内容就是 `content/posts/` 下的 Markdown 文件，没有数据库，也没有后端依赖。

<!-- 截图占位：把首页截图放进仓库（例如 docs/images/ 下），再把下面这行改成对应路径。
     ![Stardust 首页](图片路径) -->

## 特性

- 排版按长文阅读调过：正文列 65ch、字号 18px、行高随行长变化，明暗两套主题
- 合集就是 `content/posts/` 下的文件夹，标签写在文章里，两者都有时间线子页面
- 构建期图片管线把 `assets/media/` 的原图压成 AVIF / WebP，页面用 `<picture>` 让浏览器自选
- 代码块（Shiki 双主题）、提醒框、剧透、图片网格、GitHub 仓库卡片
- KaTeX 在服务端渲染公式，Mermaid 在浏览器端按需渲染，PlantUML 编码成服务端 SVG 地址
- 文章图片查看器与图表查看器
- 正文与标题对比度实测 6.3:1 与 10.6:1，最紧的一处次要文字 4.68:1，均达到 WCAG 2.2 AA；代码块与图表配色另有校验脚本

技术栈：Nuxt 4.5、Vue 3.5、Vite 8、Tailwind CSS 4.3、TypeScript 5.9（严格模式）、Shiki 4、KaTeX 0.18、Mermaid 12、sharp 0.35、Font Awesome 7。

两条依赖上的注意事项：

- Vite 8 已内置 Rolldown，不需要历史上那个 `"vite": "npm:rolldown-vite@latest"` override。保留它反而会引入 `rolldown@1.0.0-beta.53`，与 Nuxt 声明的 peer 冲突，`nuxt prepare` 会直接失败。
- `markdown-it@15` 自带类型声明，不要再装 `@types/markdown-it`（停在 14.x）。旧声明会覆盖官方类型，`StateCore`、`Env`、`MarkdownIt` 这些类型会报错。

## 快速开始

需要 Node.js 24 LTS 与 Bun 1.4。

```bash
bun install
bun run dev
```

开发服务器默认在 <http://localhost:3000>。`bun install` 会顺带跑 `nuxt prepare` 生成类型声明。

| 命令 | 说明 |
| --- | --- |
| `bun run dev` | 开发服务器（Node 运行时） |
| `bun --bun run dev` | 开发服务器，强制用 Bun 运行时 |
| `bun run build` | 生产构建，产物在 `.output/` |
| `bun run preview` | 预览构建产物 |
| `bun run generate` | 静态生成，站点在 `.output/public/` |
| `bun run typecheck` | 类型检查（严格模式） |

`bun run typecheck` 会输出两遍 `Resolve plugin path failed: vue-router/volar/sfc-route-blocks`。`@vue/language-core` 要找的内部路径在当前 vue-router 版本里没有导出，只影响 SFC 内 `<route>` 自定义块的类型提示，命令仍以退出码 0 结束。

### 换成自己的站点

1. 改 `app/app.config.ts`：站名、首页标题与描述、导航、社交按钮、友链、相册。
2. 改 `blog.config.ts`：SEO 标题与描述、`siteMeta` 里的建站日期与许可协议。正式建站时把 `seo.indexable` 改成 `true`。
3. 删掉 `content/posts/showcase/` 下的功能示例，写自己的第一篇，格式见[写文章](docs/writing.md)。
4. 用 `assets/media/` 里自己的图片替换示例素材，压缩参数在 `blog.config.ts` 的 `media` 段，见[图片管线](docs/media-pipeline.md)。
5. 部署时设好 `NUXT_PUBLIC_SITE_URL`，见[部署](docs/deployment.md)。

## 页面

| 路由 | 内容 |
| --- | --- |
| `/` | 首页：头像、站名、描述与平台跳转按钮 |
| `/contents` | 文章索引：合集入口、标签入口、全部文章卡片 |
| `/collections/:slug` | 合集时间线，按年份分组 |
| `/tags/:tag` | 标签时间线，同样按年份分组 |
| `/posts/:slug` | 文章详情：左侧栏目录、正文、页脚许可与过时提示 |
| `/friends` | 友链 |
| `/about` | 关于 |
| `/gallery` | 相册列表 |
| `/gallery/:slug` | 相册内页，瀑布流；未知 slug 返回 404 |
| `/statistics` | 站点统计：构建信息、运行时长、文章与标签数量、发布日历 |
| `/feed.xml` | RSS 2.0 |

未知合集 slug 返回 404，未知标签返回空列表。404 统一由 `app/error.vue` 接管。数据接口列在[配置](docs/configuration.md)文末。

## 配置速查

| 想改什么 | 改哪里 |
| --- | --- |
| 站名、首页标题、导航、社交按钮、友链、相册 | `app/app.config.ts` |
| SEO 标题与描述、图标、分享图、`seo.indexable` | `blog.config.ts` 的 `seo` |
| 建站日期、版本号、文章许可协议、过时提示天数 | `blog.config.ts` 的 `siteMeta` |
| 图片压缩格式与质量、缩放上限、随机封面 API | `blog.config.ts` 的 `media` |
| 代码块行号策略、终端语言、复制按钮、默认换行 | `blog.config.ts` 的 `codeBlocks` |
| Mermaid / PlantUML 开关与服务地址 | `blog.config.ts` 的 `diagrams` |
| 提醒框着色、GitHub 卡片 | `blog.config.ts` 的 `markdown` |
| 站点对外 URL | 环境变量 `NUXT_PUBLIC_SITE_URL` |
| 文章目录位置 | 环境变量 `NUXT_CONTENT_DIR`，默认 `content/posts` |

站点 URL 只从环境变量读，配置文件里不写。逐字段说明见 [配置](docs/configuration.md)。

## 目录结构

```
app/                  客户端应用：pages / components / composables / plugins / layouts / assets/css
content/posts/        文章；子文件夹即合集，标题与描述写在文件夹内的 _collection.md
assets/media/         图片源文件（入库）
public/media/         avif / webp 产物（构建时生成，不入库）
modules/media/        图片管线：扫描、压缩、清单注入、开发期监听
server/               Nitro 服务端：API、RSS、Markdown 渲染
shared/               两端共用的类型与工具
scripts/              质量标定与对比度校验脚本
blog.config.ts        构建期配置
nuxt.config.ts        Nuxt 配置
```

## 文档

| 文档 | 内容 |
| --- | --- |
| [配置](docs/configuration.md) | 两个配置文件的逐字段说明，路由与 API 一览 |
| [写文章](docs/writing.md) | frontmatter、合集规则、Markdown 扩展语法与代码块写法 |
| [图片管线](docs/media-pipeline.md) | 源图到产物的流程、格式与质量换算、防盗链、相册素材 |
| [设计系统](docs/design-system.md) | 排版参数、色板派生、对比度校验、代码与图表主题 |
| [交互与查看器](docs/interactions.md) | 页面过渡、文章页浮动操作、照片查看器、图表查看器 |
| [部署](docs/deployment.md) | 环境变量、SSR 与静态生成、PlantUML 自建、出站请求 |

## 部署

生产环境用 Node 24 或 Bun 1.4。两件事容易漏：

- `NUXT_PUBLIC_SITE_URL` 设成完整的对外地址，带协议、结尾不带斜杠。不设页面照常工作，只是不输出 canonical 与 `og:url`。
- 让进程的工作目录停在项目根。内容目录按进程工作目录解析，默认 `content/posts`；只把 `.output/` 搬走时要一并带上 `content/`。

```bash
bun run build
node .output/server/index.mjs
```

不想要常驻进程就用 `bun run generate`，把 `.output/public/` 交给静态托管。

`seo.indexable` 默认 `false`，页面会带 `noindex, nofollow`。正式建站时改成 `true`。

更多见 [部署](docs/deployment.md)。

## 已知限制

- 文章只认小写 `.md`，只看 `content/posts/` 一层子文件夹，合集里再套目录不会被收录。
- 文件名要用 ASCII。详情页对 slug 做白名单校验，中文或空格文件名能进列表，点开是 404。
- 列表不分页，文章多了 `/contents` 会很长。
- 站内没有搜索与评论，模板也不打算加：这两件事各有更合适的现成方案，塞进来会让模板变重。
- `bun run typecheck` 会打印两条 `vue-router/volar/sfc-route-blocks` 解析警告，见[快速开始](#快速开始)。

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。提交信息用 Conventional Commits，分支从 `main` 切出，PR 需要在本地跑通 `bun install --frozen-lockfile`、`bunx nuxi typecheck`、`bun run build`。

安全问题走 [SECURITY.md](SECURITY.md)，版本记录在 [CHANGELOG.md](CHANGELOG.md)，行为准则见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

`.github/workflows/ci.yml` 的触发器只有 `workflow_dispatch`，push 与 PR 都不会自动跑；`.github/dependabot.yml` 目前全是注释，不产生更新 PR。想启用哪个，把对应的 `on:` 块或配置块取消注释。

## 许可

MIT，见 [LICENSE](LICENSE)。
