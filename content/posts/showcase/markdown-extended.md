---
title: Markdown 扩展语法
description: 提醒框、剧透、图片网格与 GitHub 仓库卡片——模板支持的全部块级与行内扩展。
date: 2026-06-18
tags: [markdown, showcase]
---

除了 CommonMark，这套模板还接了几种写长文时真正用得上的语法。全部是 Markdown 原生写法的延伸，不需要引入任何组件。

## 提醒框

GitHub 风格：在引用块的第一行写 `[!类型]`，后面可以跟自定义标题。

> [!NOTE]
> 突出显示读者应该考虑的信息。

> [!TIP] 自定义标题
> 可选信息，帮助读者更顺利地完成某事。

> [!IMPORTANT]
> 读者成功所必需的关键信息。

> [!WARNING]
> 需要立即注意的内容。

> [!CAUTION]
> 某个操作的负面潜在后果。

类型别名比 GitHub 那五种多一些，Obsidian 的写法也接得住：

> [!TLDR]
> 太长不看版。

> [!SUCCESS]
> 检查通过。

> [!BUG]
> 已知缺陷，等待修复。

> [!QUESTION]
> 这里其实还没想清楚。

### 关于颜色

提醒框默认**只用图标和描边粗细区分轻重**，颜色仍取自锁定色板。想换成带语义色的版本，把 `blog.config.ts` 里的 `markdown.admonitionsColorful` 打开即可。

## Docusaurus 风格的容器

不喜欢引用块写法的话，`:::` 容器也可以：

:::tip
这是 `:::tip` 容器，与 `> [!TIP]` 等价。
:::

:::warning[带标题的警告]
方括号里是标题。
:::

:::details[点开看折叠内容]
容器也能当折叠块用。里面照常写 Markdown：

- 列表可以
- **强调**也可以
:::

## 剧透

读者需要主动悬停或聚焦才能看清的文字：内容 :spoiler[被隐藏了 **哈哈**]，鼠标移上去就出来了。

键盘用户按 <kbd>Tab</kbd> 聚焦同样能展开，不会把内容永远锁死。

## 图片网格

用 `[grid]` 包住连续的图片，会按图片数量自动排成响应式网格：

[grid]
![示例一](albums/anime-moments/01)
![示例二](albums/anime-moments/05)
![示例三](albums/anime-moments/05)
[/grid]

网格里的图片会被裁成统一高度，横竖比例差异大时建议拆成两行。

> [!NOTE]
> 图片路径写 `assets/media` 下的素材 key（不带扩展名）就会自动走压缩管线；
> 写 `https://…` 则原样交给浏览器，不经过压缩。

## GitHub 仓库卡片

::github{repo="nuxt/nuxt"}

写法就是上面这一行。渲染时会去 GitHub API 取 star 数与简介，结果在进程内缓存 30 分钟；取不到数据（断网、限流）时降级成一张纯链接卡片，不会让文章渲染失败。

## 表格与其它

| 语法 | 写法 | 说明 |
| :--- | :--- | :--- |
| 提醒框 | `> [!NOTE]` | GitHub / Obsidian 风格 |
| 容器 | `:::tip` | Docusaurus 风格 |
| 折叠 | `:::details[标题]` | 原生 `<details>` |
| 剧透 | `:spoiler[…]` | 悬停或聚焦展开 |
| 网格 | `[grid]…[/grid]` | 最多并排四张 |
| 仓库卡片 | `::github{repo="…"}` | 联网取元数据 |

这些扩展都在 `server/utils/markdown/` 下，一个文件管一类，想改哪条规则直接找对应文件即可。
