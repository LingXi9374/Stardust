# AGENTS.md — Nuxt 4 博客模板项目

> 本文件面向 AI Coding Agent。README.md 供人类阅读；本文件是 Agent 在项目中工作时应遵循的完整指令集。

---

## 1. 项目概述

本项目是一个**阅读优先（reading-first）的博客网页模板**，核心设计理念是“排版即界面”——阅读体验本身就是产品。基于网页设计理论，为长文阅读场景提供最优的度量（measure）、行高（leading）和层级（scale）。

- **项目类型**：静态博客模板 / 前端 Starter
- **内容场景**：技术博客、个人写作、编辑类长文
- **设计目标**：在桌面端和移动端均提供接近纸质阅读的体验，同时支持暗色模式

---

## 2. 技术栈（严格锁定）

| 层级 | 技术 | 版本要求 | 关键说明 |
|---|---|---|---|
| 运行时 | Node.js | **24 LTS** | 仅使用偶数版本 LTS；Nuxt 要求 ≥22.x，推荐 24.x |
| 包管理器 | Bun | **1.4.x** | 所有依赖安装、脚本执行使用 `bun` |
| 框架 | Nuxt.js | **4.5.x** | 应用代码位于 `app/` 目录 |
| UI 框架 | Vue | **3.5.x** | 全 Composition API + `<script setup>` |
| 构建工具 | Vite | **8.x** | 使用 Rolldown 驱动的版本 |
| 样式 | Tailwind CSS | **4.x** | 通过 `@tailwindcss/vite` 插件集成 |
| 语言 | TypeScript | **5.x** | 严格模式，禁止 `any` |

### 版本约束（硬性）

- 禁止降级或升级以上任意主版本，除非用户明确要求。
- `package.json` 的 `engines.node` 字段必须声明 `"^22.19.0 || ^24.11.0"`。
- Vite 8 通过 `package.json` overrides 启用 Rolldown 版本：`"vite": "npm:rolldown-vite@latest"`。Nuxt 会自动检测并调整配置。

---

## 3. 项目结构约定

Nuxt 4 的默认源码目录为 `app/`，与 `server/`、`shared/`、`public/` 平级。

```
.
├── app/                    # 客户端应用代码（Nuxt app 目录）
│   ├── assets/
│   │   └── css/
│   │       └── main.css    # Tailwind 入口：@import "tailwindcss";
│   ├── components/
│   │   ├── blog/           # 博客专用组件
│   │   │   ├── PostCard.vue
│   │   │   ├── PostMeta.vue
│   │   │   └── TableOfContents.vue
│   │   └── ui/             # 通用 UI 原语
│   ├── composables/
│   │   └── useReadingTime.ts
│   ├── layouts/
│   │   └── default.vue
│   ├── pages/
│   │   ├── index.vue       # 文章列表
│   │   └── posts/
│   │       └── [slug].vue  # 文章详情
│   ├── plugins/
│   ├── utils/
│   ├── app.vue
│   ├── app.config.ts
│   └── error.vue
├── content/                # 内容文件（Markdown/MDX）
├── public/                 # 静态资源
├── shared/                 # 客户端 + 服务端共享代码
│   ├── types/
│   └── utils/
├── server/                 # Nitro 服务端代码
│   └── api/
├── nuxt.config.ts
├── tsconfig.json
└── package.json
```

### 结构规则

- **禁止**在项目根目录创建 `components/`、`pages/` 等目录——Nuxt 4 的目录发现仅基于 `app/`。
- 新增页面必须放入 `app/pages/`，文件名即路由路径。
- 新增组件默认放入 `app/components/`，按功能子目录分组（`blog/`、`ui/`）。
- 共享类型定义放入 `shared/types/`，客户端与服务端均可自动导入。
- 服务端 API 放入 `server/api/`，使用 `defineEventHandler`。

---

## 4. 设计系统规则（网页设计理论约束）

以下是本项目博客模板的**硬性设计参数**。Agent 在生成任何排版或布局代码时必须遵守。

### 4.1 阅读列（Measure）

阅读列是博客的核心产品。三个数字支配可读性：行长度、行高、层级比例。

- **每行字符数**：50–75 字符，目标值 **66**（Bringhurst 经典值）。
- **正文容器宽度**：使用字符单位而非固定像素，`max-width: 65ch` 作为正文列约束。
- 不足 45 字符 → 视线回扫过于频繁；超过 80 字符 → 回扫易错行。

### 4.2 行高（Leading）

| 场景 | 桌面端 | 移动端 |
|---|---|---|
| 正文 | 1.5–1.6 | 1.3–1.45 |
| 标题（h2–h4） | 1.1–1.2 | 1.1–1.2 |
| 大标题 / 展示字 | ~1.0（配合 `letter-spacing: -0.02em` 至 `-0.04em`） | — |

长行需要更多行高；短行需要更少。

### 4.3 字号与层级

- **正文字号**：桌面端 **18px**（最优），移动端最低 16px。低于 16px 在暗色模式下可读性显著下降。
- **层级比例**：使用 Perfect Fourth（1.333）作为通用模块化比例。仅在编辑类标题驱动的场景下使用黄金比例（1.618）。
- **标题跳级禁止**：不得因视觉尺寸而跳过标题层级（如 H2 → H4）。尺寸由 CSS 控制，语义顺序服务于屏幕阅读器。

### 4.4 对比度（WCAG 2.2）

- 正文文本对比度 ≥ **4.5:1**（AA）
- 大文本（≥24px 或粗体 ≥18.7px）≥ **3:1**
- AAA 目标：正文 ≥ 7:1
- **必须验证，不得目测判断**。

### 4.5 目录（TOC）

- TOC 位于**左侧栏（left rail）** ，列出所有标题，标签与标题完全一致，滚动时高亮当前章节。
- 文章内嵌 TOC **不得使用 sticky**（会与全局导航冲突）。左侧栏 TOC 可以使用 sticky。

### 4.6 代码块

- 使用 **Shiki** 作为语法高亮器，不使用 Prism。
- `<pre>` 块必须同时支持**水平滚动**和**键盘聚焦**（`tabindex="0"`）。
- 暗色模式下代码高亮 token 颜色应**降低饱和度**，霓虹色即使在 4.5:1 对比度下感知效果仍不佳。

### 4.7 动效

- **内容页避免动画**。仅允许极轻微的淡入，或完全无动效。读者认为运动是干扰而非愉悦。

### 4.8 阅读时间

- 在文章卡片和详情页展示预估阅读时间，基准速率 **265 WPM**。实现成本低，UX 回报高。

### 4.9 暗色模式

- **必须提供暗色模式切换**，但默认模式选择需审慎。多数用户阅读时浅色模式体验更优。
- 暗色模式的 token 需单独校验对比度，不得直接反转浅色色值。

---

## 5. 样式系统（Tailwind CSS 4）

### 5.1 集成方式

Tailwind CSS 4 通过 Vite 插件集成，不使用 `tailwind.config.js` 传统配置文件。

`nuxt.config.ts`：

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
})
```

`app/assets/css/main.css`：

```css
@import "tailwindcss";

@theme {
  /* 设计令牌在此定义 */
}
```

### 5.2 样式规则

- **禁止内联 `style`** ——所有样式通过 Tailwind 工具类或 `@theme` 令牌表达。
- **禁止硬编码颜色、间距、字号**——必须引用设计令牌。
- Tailwind 4 的 `@theme` 指令用于定义自定义设计令牌（颜色、字体、间距），令牌名使用语义化命名（如 `--color-text-primary`、`--spacing-reading-column`）。
- 暗色模式使用 `dark:` 前缀，令牌层面通过 CSS 变量切换。

---

## 6. 代码规范

### TypeScript

- **严格模式**：`tsconfig.json` 中 `strict: true`。
- **禁止 `any`**：使用 `unknown` 配合类型守卫，或定义精确类型。
- 类型定义优先放入 `shared/types/`，自动导入可用。
- Nuxt 4 为 app、server、shared 分别生成 TypeScript 项目，根目录仅保留一个 `tsconfig.json`。

### Vue 3

- 全部使用 **Composition API** 与 `<script setup lang="ts">`。
- **禁止 Options API**（`data`、`methods`、`computed` 选项式写法）。
- Props 与 Emits 使用类型化声明：`defineProps<Props>()`、`defineEmits<Emits>()`。
- 组件文件名使用 PascalCase（`PostCard.vue`），模板中使用 PascalCase 引用。

### Nuxt 4 数据获取

- 使用 `useAsyncData` 或 `useFetch`，不使用裸 `fetch`。
- 相同 key 的多个组件自动共享数据，利用此机制避免重复请求。
- 组件卸载时自动清理，无需手动处理。

### 通用

- **禁止 `console.log` 提交到生产代码**。使用 `console.debug` 仅在开发分支中临时使用。
- 文件末尾保留一个换行符。
- 导入排序：Node/外部包 → `#imports` → `~/` 别名 → 相对路径。

---

## 7. 构建与运行命令

所有命令通过 **Bun** 执行。

| 用途 | 命令 |
|---|---|
| 安装依赖 | `bun install` |
| 开发服务器（Node 运行时） | `bun run dev` |
| 开发服务器（Bun 运行时） | `bun --bun run dev` |
| 类型检查 | `bun run postinstall && bunx nuxi typecheck` |
| 生产构建 | `bun run build` |
| 生产预览 | `bun run preview` |
| 生成页面 | `bunx nuxi generate` |
| 添加页面 | `bunx nuxi add page about` |
| 添加组件 | `bunx nuxi add component BlogPostCard` |

### Bun 运行时说明

- `bun --bun run dev` 强制 Nuxt CLI 使用 Bun 运行时而非 Node.js。
- 生产构建时设置 `nitro: { preset: "bun" }` 以获得 Bun 优化构建。
- Bun 默认不执行 post-install 脚本，安全但需注意某些包的手动初始化步骤。

---

## 8. 执行权限

### 自动执行（无需确认）

- 读取、搜索、分析项目文件
- 运行类型检查、lint、格式化
- 运行开发服务器或构建命令
- 添加 `app/` 目录下的页面、组件、composable
- 在 `shared/` 和 `server/` 下添加类型或工具函数

### 需要确认

- 安装或移除任何 npm 依赖
- 修改 `nuxt.config.ts` 中的模块或插件配置
- 修改 `package.json` 的 `overrides`、`engines` 或脚本
- 修改 `tsconfig.json`
- 删除 `app/`、`content/`、`server/` 下的已有文件

### 绝对禁止

- 执行 `git push`、`git reset --hard`、强制删除远程分支
- 未经确认安装全局包或修改系统环境
- 在项目中提交 `.env`、密钥、凭证
- 硬编码任何 API Key 或 secret

---

## 9. Git 提交规范

本项目将开源到 GitHub，所有提交、分支、PR、发布均遵循以下规范。Agent 默认只可执行只读 Git 命令；任何写操作必须获得用户明确授权。

### 9.1 核心原则

- 使用 **Conventional Commits 2.0**。
- 一个提交只做一件事，保持原子性。
- 提交信息默认使用**英文**，命令式现在时。
- 禁止提交 secrets、生成物、本地环境文件。
- 主分支 `main` 受保护，禁止直接 push。
- 所有变更通过 Pull Request 合入。

### 9.2 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

- 标题不超过 **72 字符**。
- 标题与正文之间必须空一行。
- 正文与 footer 之间必须空一行。
- 不强制要求 body 和 footer，但 breaking change 必须写在 footer。
- 标题首字母小写，结尾不加句号。

### 9.3 允许的 type

| type | 用途 |
|---|---|
| `feat` | 新功能、新页面、新组件、新交互 |
| `fix` | 修复 bug |
| `docs` | 仅文档变更 |
| `style` | 仅格式、空格、分号、纯格式化，不影响逻辑 |
| `refactor` | 重构，不新增功能也不修 bug |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统、依赖、锁文件 |
| `ci` | GitHub Actions、CI 配置 |
| `chore` | 杂项，不修改 src 或 test |
| `revert` | 回滚提交 |

> UI 视觉、设计令牌、排版参数调整属于产品行为，使用 `feat(design)` 或 `fix(design)`；纯格式化才用 `style`。

### 9.4 允许的 scope

scope 使用小写短横线，可省略，但同一项目内应保持一致。

推荐 scope：

`app`、`blog`、`design`、`a11y`、`seo`、`content`、`server`、`shared`、`config`、`deps`、`ci`、`release`、`docs`

示例：

```
feat(blog): add reading time estimate
fix(a11y): correct heading hierarchy in post layout
style(design): adjust body measure to 66ch
chore(deps): bump nuxt to 4.5.1
ci: add bun install cache
```

### 9.5 subject / body / footer 规则

**subject**

- 使用命令式现在时：`add`、`fix`、`remove`，不用 `added`、`adds`。
- 描述“做了什么”，不描述“怎么做的”。
- 不加句号。
- 不超过 72 字符。

**body**

- 解释 **what** 和 **why**，不解释 how。
- 每行不超过 72 字符。
- 可分段，段间空行。

**footer**

- 关联 issue：`Closes #123`、`Fixes #123`、`Refs #123`。
- 破坏性变更：`BREAKING CHANGE: ...` 或 `BREAKING-CHANGE: ...`。
- 共同作者：`Co-authored-by: Name <email>`。
- DCO 签名：`Signed-off-by: Name <email>`。

### 9.6 Breaking Change

在 type/scope 后加 `!`，并在 footer 写 `BREAKING CHANGE:`。

```
feat(api)!: remove legacy post endpoint

BREAKING CHANGE: /api/posts is removed. Use /api/v2/posts instead.
Closes #88
```

### 9.7 推荐与禁止示例

推荐：

```
feat(blog): add table of contents with scroll highlight

Highlight the current section in the left rail TOC.
Keep the in-article TOC non-sticky to avoid nav conflicts.

Closes #42
```

禁止：

```
update stuff
fix bug
Feat: Add TOC.
feat(blog): added toc and fixed styles and updated deps
```

### 9.8 提交粒度

- 功能与对应测试尽量同一提交。
- 纯格式化、重命名、重构不要和功能混在一起。
- 依赖升级单独提交：`chore(deps): ...`。
- 文档更新单独提交：`docs: ...`。
- 不提交 `node_modules/`、`.nuxt/`、`.output/`、`.data/`、`dist/`、`.env`、`*.log`、`.DS_Store`。
- `bun.lock` 必须提交，且依赖变更时同步更新。

### 9.9 分支模型

采用 GitHub Flow：

- 主分支：`main`，始终可构建、可部署。
- 功能分支从 `main` 切出，合入后删除。
- 分支命名：

```
feat/<short-slug>
fix/<short-slug>
docs/<short-slug>
refactor/<short-slug>
chore/<short-slug>
ci/<short-slug>
```

示例：

```
feat/reading-time
fix/heading-hierarchy
chore/bun-1.4
```

禁止：

- 直接 push `main`
- 长期存在的个人分支
- 使用 `master` 作为默认分支

### 9.10 Pull Request 规范

PR 标题必须遵循 Conventional Commits，与最终 squash 提交信息一致。

PR 描述模板：

```md
## 摘要

简述本次变更。

## 关联 Issue

Closes #

## 变更类型

- [ ] feat
- [ ] fix
- [ ] docs
- [ ] style
- [ ] refactor
- [ ] perf
- [ ] test
- [ ] build
- [ ] ci
- [ ] chore

## 测试

- [ ] `bun install --frozen-lockfile`
- [ ] `bunx nuxi typecheck`
- [ ] `bun run build`
- [ ] 如存在：`bun run lint`

## UI 变更

附截图或录屏。无 UI 变更可删除。

## 检查清单

- [ ] 遵循 AGENTS.md 设计系统
- [ ] 无 secrets、密钥、凭证
- [ ] 已更新 CHANGELOG（如需要）
- [ ] 未跳过标题层级
- [ ] 暗色模式对比度已检查
```

合并策略：推荐 **Squash and merge**，保持 `main` 历史线性、提交信息整洁。

### 9.11 版本与 CHANGELOG

- 版本遵循 **SemVer**。
- `feat` → MINOR，`fix` → PATCH，`BREAKING CHANGE` → MAJOR。
- 使用 `release-please` 或 `changesets` 自动生成 CHANGELOG 和版本 PR。
- Git tag 格式：`vX.Y.Z`，例如 `v0.1.0`。
- 禁止手工随意编辑已发布版本的 CHANGELOG。
- 发布 PR 标题示例：`chore(release): v0.1.0`。

### 9.12 提交前检查

Agent 在建议提交前，应运行或提示运行：

```bash
git status --short
git diff --check
bun install --frozen-lockfile
bunx nuxi typecheck
bun run build
# 如存在
bun run lint
```

检查：

- `git status` 中无意外文件。
- 无 `.env`、密钥、凭证。
- 无 `console.log` 残留。
- 无生成物被跟踪。
- 提交信息符合本规范。

### 9.13 Agent Git 权限

**可自动执行（只读）**

```bash
git status
git diff
git diff --stat
git log --oneline
git show
git branch --show-current
```

**需要用户明确确认**

```bash
git add
git commit
git switch -c
git checkout -b
git merge
git tag
git push
git push -u origin <branch>
```

**绝对禁止**

```bash
git push --force
git push --force-with-lease
git reset --hard
git clean -fd
git rebase
git commit --amend
git filter-branch
git config --global
```

补充规则：

- 除非用户明确要求，Agent 不得自动 `git commit` 或 `git push`。
- 不得修改已推送到远程的历史。
- 不得删除远程分支或标签。
- 不得提交 `.env`、`*.pem`、`id_rsa`、token、cookie。
- 不得在提交信息中自动添加 AI 署名，除非用户或仓库政策要求。
- 如项目启用 DCO，提交时使用 `git commit -s`。

### 9.14 开源仓库必备文件

GitHub 开源仓库应包含：

```text
LICENSE
README.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
CHANGELOG.md
.editorconfig
.gitattributes
.env.example
.github/
├── PULL_REQUEST_TEMPLATE.md
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml
│   └── feature_request.yml
├── workflows/
│   └── ci.yml
└── dependabot.yml
```

推荐许可证：MIT。若希望专利授权更明确，可选 Apache-2.0。

### 9.15 CI 建议

`.github/workflows/ci.yml`：

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.4.x

      - run: bun install --frozen-lockfile
      - run: bunx nuxi typecheck
      - run: bun run build
```

如项目存在 lint 脚本，在 `typecheck` 前加入：

```yaml
      - run: bun run lint
```

依赖更新建议使用 Renovate 或 Dependabot。提交信息前缀统一为：

```text
chore(deps): ...
```

或：

```text
fix(deps): ...
```

---

## 10. 关键陷阱

- **Nuxt 4 目录**：不要往根目录写 `pages/` 或 `components/`，应用代码一律在 `app/` 下。
- **Tailwind 4 无 config 文件**：设计令牌通过 `@theme` 在 CSS 中定义，不要创建 `tailwind.config.js`。
- **Vite 8 Rolldown**：使用 `rolldownOptions` 而非 `rollupOptions` 进行构建配置。
- **Bun 的 `--bun` 标志**：`bun run dev` 使用 Node 运行时执行脚本；`bun --bun run dev` 才使用 Bun 运行时。
- **暗色模式对比度**：暗色模式下的文本对比度需单独验证，不可默认继承浅色模式的通过结果。
- **标题语义**：禁止为视觉尺寸跳级标题，用 CSS 控制大小。
- **TOC sticky 规则**：左侧栏 TOC 可 sticky，文章内嵌 TOC 不可 sticky。