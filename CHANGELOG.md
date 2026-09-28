# Changelog

本文件记录 Stardust 的变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

已发布的条目只做追加，不改动历史内容；版本与 CHANGELOG 的发布流程见 `AGENTS.md` 第 9.11 节。

## [Unreleased]

首个公开版本 `v0.1.0` 的全部内容，尚未发布，因此没有日期。

### Added

- **阅读优先的排版**：正文 `65ch` 度量（目标 66 字符）、桌面 18px / 移动 16px 字号、随行长变化的行高、Perfect Fourth（1.333）层级比例；左侧栏 sticky 目录配合滚动高亮，文章内嵌目录不使用 sticky。
- **暗色模式**：深色令牌由同一色相家族单独推导，不是浅色值的反转；首次绘制前由内联脚本应用，无主题闪烁。
- **代码块**：Shiki 双主题高亮（以 `github-light` 为蓝本派生出 `stardust-light` / `stardust-dark`，见 `server/utils/markdown/theme.ts`），终端与编辑器两种窗口框架、行号策略（`auto` / `always` / `never`）、行标记与折叠、标签页、复制按钮；`<pre>` 同时支持水平滚动与键盘聚焦。
- **Markdown 扩展**：提醒框（admonition）、GitHub 仓库卡片 `::github{repo="owner/name"}`、KaTeX 公式（行内、块级、矩阵与对齐多行）。
- **图表**：Mermaid 按需在浏览器端渲染，PlantUML 在渲染阶段编码成服务端 SVG 地址；两者统一放在 4:3 画板里。
- **图片管线**：`assets/media/` 的素材由 sharp 在构建期压缩成 AVIF / WebP（含两种编码器的质量换算表），页面用 `<picture>` 让浏览器自选；支持外链图床、防盗链处理、加载骨架屏，以及未指定封面时的随机图。
- **照片查看器**：点击文章内任意图片打开，支持左右切换与首尾循环、底部缩略图栏、5 档缩放、放大后拖动平移、幻灯片与全屏。
- **图表查看器**：Mermaid / PlantUML 画板支持缩放、拖动平移与全屏；全屏时原位留下同尺寸占位，退出后按原样放回。
- **合集与标签**：合集就是 `content/posts/` 下的一个文件夹（标题与描述写在 `_collection.md`），标签在 frontmatter 里自由添加、无需注册；两者各有独立的时间线子页面，`/contents` 汇总每个合集的文章数与所有标签的出现次数。
- **内容 API**：`GET /api/posts`（支持 `?collection=` 与 `?tag=` 筛选）、`GET /api/posts/:slug`、`GET /api/collections`、`GET /api/collections/:slug`、`GET /api/site-info`；筛选在服务端完成。
- **相册**：往 `assets/media/<dir>/` 丢图片即自动收录，列表页是 4:3 封面网格，内页是瀑布流，未知 slug 返回 404。
- **统计页**：聚合文章数、合集数、标签数与总字数，并列出这份构建产物的信息（版本、构建时刻、构建平台、Node 与 Bun 版本、许可协议），数据来自 `GET /api/site-info`。
- **RSS 2.0**：`/feed.xml`。
- **阅读时间**：文章卡片与详情页展示预估阅读时间，拉丁文本按 265 词/分钟、CJK 按 300 字/分钟，代码块不计入。
- **对比度校验脚本**：`scripts/verify-code-contrast.ts` 与 `scripts/verify-diagram-theme.ts` 逐对实测代码高亮与图表主题的对比度，修改任何色值后重新跑，不以目测判断。
- **示例素材工具**：`scripts/fetch-demo-media.ts` 抓取演示用图片（去重、限尺寸），`scripts/benchmark-quality.ts` 用 PSNR 标定 AVIF 与 WebP 的质量换算表。

依赖版本：Node.js 24 LTS、Bun 1.4、Nuxt 4.5、Vue 3.5、Vite 8（Rolldown）、Tailwind CSS 4.3、TypeScript 5.9（严格模式）。
