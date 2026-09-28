# 贡献指南

Stardust 是一个**阅读优先**的博客模板：Nuxt 4 + Tailwind CSS 4，没有数据库，内容就是 Markdown 文件。
欢迎 bug 报告、文档修正、无障碍与排版改进，以及不破坏模板定位的新能力。

先说清楚一件事：这个仓库是**模板**，不是某个人正在运营的博客站点。只对某个站点有意义的改动
（换成自己的配色、写自己的文案、加一个只服务于某个栏目的页面）更适合 fork 之后自己改；
能进上游的是「下一个用模板的人也会受益」的改动。拿不准就先开 issue 聊一句，比写完再被退省事。

## 开发环境

| 工具 | 版本 |
| --- | --- |
| Node.js | 24 LTS（`engines` 声明为 `^22.19.0 \|\| ^24.11.0`） |
| Bun | 1.4.x（所有安装与脚本都走 bun） |
| Git | 近期版本即可 |

```bash
bun install              # 安装依赖，postinstall 会跑 nuxt prepare
bun run dev              # 开发服务器 http://localhost:3000
bunx nuxi typecheck      # 类型检查（严格模式）
bun run build            # 生产构建，产物在 .output/
bun run preview          # 预览构建产物
bun run generate         # 静态生成
```

`bun run dev` 是用 Node 运行时执行 Nuxt CLI 的；想用 Bun 运行时跑开发服务器，加 `--bun`：`bun --bun run dev`。

技术栈版本是锁定的：Nuxt 4.5、Vue 3.5、Vite 8（Rolldown）、Tailwind CSS 4.3、TypeScript 5.9。
不要顺手升主版本；确实需要升级就单独开一个 PR，在描述里写明原因和验证方式。

## 目录约定

Nuxt 4 的应用源码目录是 `app/`，不是项目根。

| 路径 | 放什么 |
| --- | --- |
| `app/pages/` | 页面，文件名即路由 |
| `app/components/` | 组件，按 `blog/`、`ui/` 分组 |
| `app/composables/`、`app/utils/` | 组合式函数与工具函数 |
| `app/assets/css/main.css` | 设计令牌与排版系统，唯一样式来源 |
| `app/app.config.ts` | 站点内容配置：站名、导航、友链、相册 |
| `shared/types/`、`shared/utils/` | 客户端与服务端共用的类型与工具 |
| `server/api/`、`server/utils/` | Nitro 服务端代码 |
| `content/posts/` | 文章 Markdown，子文件夹就是合集 |
| `modules/media/` | 图片管线（扫描、压缩、清单注入） |
| `assets/media/` | 图片源文件，入库 |
| `blog.config.ts` | 构建期配置：压缩格式与质量、代码块与图表开关 |

**不要在项目根新建 `pages/`、`components/`、`composables/`** ——Nuxt 4 只会从 `app/` 里发现它们。
新增页面用 `bunx nuxi add page <name>` 生成骨架，省得放错位置。

## 分支模型

GitHub Flow：`main` 始终可构建，所有改动通过 PR 合入，`main` 不直接 push。

从最新的 `main` 切分支，名字用 `<type>/<short-slug>`：

```
feat/reading-time
fix/heading-hierarchy
docs/contributing
refactor/markdown-blocks
chore/bun-1.4
ci/manual-workflow
```

不要用 `master`，也不要留长期存在的个人分支——合完就删。

## 提交规范

使用 Conventional Commits 2.0，提交信息用英文、命令式现在时：

```
<type>(<scope>): <subject>

<body>

<footer>
```

标题不超过 72 字符，首字母小写，结尾不加句号；标题与正文、正文与 footer 之间各空一行。

允许的 `type`：

| type | 用途 |
| --- | --- |
| `feat` | 新功能、新页面、新组件、新交互 |
| `fix` | 修复 bug |
| `docs` | 仅文档变更 |
| `style` | 仅格式、空格、分号，不影响逻辑 |
| `refactor` | 重构，不新增功能也不修 bug |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统、依赖、锁文件 |
| `ci` | GitHub Actions、CI 配置 |
| `chore` | 杂项，不修改 src 或 test |
| `revert` | 回滚提交 |

推荐的 `scope`：`app`、`blog`、`design`、`a11y`、`seo`、`content`、`server`、`shared`、`config`、`deps`、`ci`、`release`、`docs`。
scope 可以省略，但同一个项目里保持一致。

```
feat(blog): add reading time estimate
fix(a11y): correct heading hierarchy in post layout
chore(deps): bump nuxt to 4.5.2
```

两个容易搞混的地方：改 UI 视觉、设计令牌、排版参数属于产品行为，用 `feat(design)` 或 `fix(design)`，`style` 只留给纯格式化；
破坏性变更在 type 后加 `!`，并在 footer 写 `BREAKING CHANGE:`。

一个提交只做一件事。格式化、重命名、重构不要和功能混在一起；依赖升级、文档更新各自单独提交。

## 样式与设计约束

**改设计令牌之前，先读 `AGENTS.md` 第 4 节。** 那几条是硬性参数，不是建议：正文度量 65ch、桌面 18px / 移动最低 16px、
行高随行长变化、层级比例 Perfect Fourth、正文对比度 ≥ 4.5:1、标题不得跳级、文章内嵌目录不用 sticky。

其他约定：

- Tailwind 4 没有配置文件，令牌写在 `app/assets/css/main.css` 的 `@theme` 里，不要新建 `tailwind.config.js`。
- 不写内联 `style`，也不硬编码颜色、间距、字号，一律引用令牌。
- 暗色模式的令牌要单独校验对比度，不能直接反转浅色值。
- 涉及颜色的改动请跑一遍实测脚本，不要目测：
  `bun scripts/verify-code-contrast.ts`、`bun scripts/verify-diagram-theme.ts`。

## 不要提交的东西

`.gitignore` 已经挡掉了大部分，这里再列一遍容易误加进 `git add .` 的：

- `public/media/`、`.media-cache.json` ——图片管线的构建期产物与缓存，源文件在 `assets/media/`。
- `.nuxt/`、`.output/`、`.data/`、`dist/`。
- `.env` 及任何密钥、token、证书。需要新增配置项时，只改 `.env.example`。
- `console.log` 残留。

反过来，`bun.lock` **必须提交**，依赖变更时同步更新（`bun install` 会自动改它）。

## PR 流程

1. 开 issue 或在已有 issue 下说一声，避免和别人的改动撞车。
2. 从 `main` 切分支，按上面的规范写提交。
3. 提交前自查：

   ```bash
   git status --short          # 无意外文件
   git diff --check            # 无空白错误
   bun install --frozen-lockfile
   bunx nuxi typecheck
   bun run build
   ```

4. 按 `.github/PULL_REQUEST_TEMPLATE.md` 填 PR 描述，标题遵循 Conventional Commits，与最终 squash 的提交信息一致。
5. 有 UI 变更就附截图或录屏，明暗两种模式各一张。

> 仓库自带的 CI 是**手动触发**的（`.github/workflows/ci.yml` 只有 `workflow_dispatch`），PR 上不会有自动检查。
> 本地那三条命令请自己跑完并勾选，别指望机器人兜底。

合并策略是 Squash and merge，保持 `main` 的线性历史。评审意见改完后直接往同一个分支推提交，不要反复 force push。

## 文档与 CHANGELOG

- 面向人的文档（README、本文件、issue/PR 模板）用中文；代码标识符、命令、git 术语保持英文。
- 用户能感知的变更记进 `CHANGELOG.md` 的 `Unreleased` 段落，按 Keep a Changelog 的类别归类。
- 已经发布的版本条目不要再改，修正写在新的版本里。
- `CHANGELOG.md` 遵循 Keep a Changelog 格式，版本遵循 SemVer：`feat` → MINOR，`fix` → PATCH，`BREAKING CHANGE` → MAJOR。

## 安全问题

不要用公开 issue 报告漏洞，走 GitHub Security Advisory，细节见 [SECURITY.md](SECURITY.md)。
参与本项目即视为同意 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
