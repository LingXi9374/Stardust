# 部署

这篇写给要发布站点的人：装什么运行时、要设哪些环境变量、SSR 与静态生成各自要注意什么。

## 运行环境

| 工具 | 版本 |
| --- | --- |
| Node.js | 24 LTS（`package.json` 的 `engines` 允许 `^22.19.0 \|\| ^24.11.0`） |
| Bun | 1.4.x（`packageManager` 是 `bun@1.4.2`） |

`bun.lock` 入库，部署时用 `bun install --frozen-lockfile` 保证依赖与开发时一致。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `NUXT_PUBLIC_SITE_URL` | 正式站点建议填 | 站点对外地址，带协议、结尾不带斜杠。用于 canonical、`og:url` 与分享图的绝对地址 |
| `NUXT_CONTENT_DIR` | 否 | 文章 Markdown 目录，相对项目根；默认 `content/posts` |

Nuxt 按 `NUXT_` 前缀把环境变量映射到 `runtimeConfig`，所以这两项都不需要写进配置文件。`.env.example` 里有模板，`.env` 本身在 `.gitignore` 里。

`NUXT_PUBLIC_SITE_URL` 留空时页面照常工作，只是不输出需要绝对地址的标签。之所以不把它固化进配置：同一份模板会部署到很多域名下，写进源码意味着每个使用者都要改代码，升级时还会冲突。

`seo.indexable` 默认是 `false`，页面会带 `noindex, nofollow`。正式建站时改成 `true`，否则搜索引擎不会收录。

## SSR 构建

```bash
bun install --frozen-lockfile
bun run build
node .output/server/index.mjs
```

工作目录要停在项目根。内容目录按进程的工作目录解析（`server/utils/collections.ts` 的 `contentRoot()` 用的是 `process.cwd()`），换目录启动会读不到文章。

只把 `.output/` 搬去部署时，要一并带上 `content/`，或者改 `contentRoot()` 的解析基准。文章是运行时从磁盘读的，不是打进 bundle 的资源。

托管平台会被自动识别并显示在统计页：`nuxt.config.ts` 读 `VERCEL`、`GITHUB_ACTIONS`、`CF_PAGES`、`NETLIFY`、`GITLAB_CI`，都没有则记为「本地构建」。统计页上的版本、构建时间也是构建那一刻写入产物的快照，不是运行时状态。

## 静态生成

```bash
bun run generate
```

产物在 `.output/public/`，可以直接交给静态托管。

页面在构建期渲染一次，随后客户端导航读取同目录的 payload，因此文章数量、随机封面这类内容都是构建那一刻的快照，新增文章要重新生成。没有预渲染到的接口在纯静态托管上不会有服务端响应；如果站上还有组件要直接请求 `/api/*`，就用 SSR 构建。

随机封面在静态站上不会每次刷新都变，它是在构建时定下来的。

## 自建 PlantUML 服务

PlantUML 图表在渲染阶段编码成 `<server>/svg/<encoded>` 这样的地址，默认指向 `https://www.plantuml.com/plantuml`。图表源码会随 URL 发给这个服务。

介意的话把 `blog.config.ts` 里的 `diagrams.plantuml.server` 指向自建实例，任何能响应同一路径格式的 PlantUML 服务都可以。不需要 PlantUML 时把 `diagrams.plantuml.enabled` 关掉，页面显示图表源码。

## 出站请求

| 位置 | 请求 | 何时发生 |
| --- | --- | --- |
| 文章封面 | 随机图 API（`blog.config.ts` 的 `media.randomCover.endpoint`） | 文章未定义 `cover` 时，每次渲染 |
| PlantUML | 编码后的图表地址发往 `diagrams.plantuml.server` | 渲染含 plantuml 代码块的文章时 |
| GitHub 卡片 | `api.github.com/repos/:owner/:name` | 渲染含 `::github{}` 的文章时，进程内缓存 30 分钟 |
| Mermaid | 无出站请求，渲染器随站点一起分发 | — |

三项都可以在 `blog.config.ts` 里单独关掉或改指向自建服务。

## 安全边界

正文通过 `v-html` 注入。内容是仓库里的 Markdown 文件，不是用户输入，因此按可信内容处理。如果要接入外部或用户提交的内容，需要先加 HTML 白名单过滤，把 markdown-it 的 `html` 选项改成 `false`。

`getPost()` 对 slug 做白名单校验（`^[A-Za-z0-9][A-Za-z0-9._-]*$`），合集 slug 同样处理，杜绝 `../` 目录穿越。Mermaid 的 `securityLevel` 是 `strict`，图表源码里的 HTML 不解析。

## CI

`.github/workflows/ci.yml` 的触发器只有 `workflow_dispatch`，push 与 PR 都不会自动跑。它是给模板仓库用的：push 上去不应该触发构建或通知。想启用自动 CI，删掉 `workflow_dispatch:`，再把文件顶部注释掉的 `on:` 块恢复出来。任务本身跑 `bun install --frozen-lockfile`、`bunx nuxi typecheck`、`bun run build`。

`.github/dependabot.yml` 目前是纯注释文件，GitHub 读到的是一份空配置，不会开启依赖更新、不会自动开 PR。启用方式与 CI 相同，把注释块取消注释即可；启用后记得同时给 CI 加上 push / PR 触发器，否则依赖 PR 上不会有任何自动检查。
