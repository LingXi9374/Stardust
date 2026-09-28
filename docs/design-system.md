# 设计系统

这篇写给要改排版、配色或主题的人。约束写在 `AGENTS.md` 第 4 节，实现落在 `app/assets/css/main.css`（设计令牌与页面骨架）与 `app/assets/css/content.css`（Markdown 渲染出来的内容样式）。下面记的是这些规则在本项目里的取值，以及色值为什么这么选。

## 阅读列与行高

阅读列是这个模板的核心产品，三个数字支配可读性：行长度、行高、层级比例。

| 规则 | 取值 |
| --- | --- |
| 正文列宽 | `max-width: 65ch`（目标 66 字符） |
| 正文字号 | 桌面 18px（`--text-reading: 1.125rem`）/ 移动端最低 16px |
| 正文行高 | 桌面 1.6 / 移动端 1.45 |
| 标题行高 | 1.2 |
| 展示字行高 | 约 1.0，配合 `letter-spacing: -0.02em` 至 `-0.04em` |
| 层级比例 | Perfect Fourth（1.333） |
| 阅读时间基准 | 拉丁 265 词/分钟，CJK 300 字/分钟，代码块不计入 |

每行不足 45 字符，视线回扫过于频繁；超过 80 字符，回扫容易错行。中文的等效度量与拉丁不同，讨论写在 `content/posts/reading-first/measure-for-cjk.md`。

标题层级由语义决定，尺寸交给 CSS。不会为了视觉大小把 h2 写成 h4。

## 色板

锁定的三个值定义的是表面，不是文字：

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--color-accent` | `#87c5d1` | 前景色块与装饰，不承载文字 |
| `--color-canvas` | `#e9feff` | 页面底色 |
| `--color-sidebar` | `#cee9ee` | 侧栏底色 |

`#87c5d1` 落在 `#e9feff` 上只有 1.84:1，远低于正文需要的 4.5:1。文字阶因此从同一色相另行推导，色相不变，观感还是同一套配色：

| 令牌 | 值 | 对比度 |
| --- | --- | --- |
| `--color-ink-strong` | `#17414d` | 10.57:1 on canvas，标题 |
| `--color-ink` | `#2c6473` | 6.32:1 on canvas，正文 |
| `--color-ink-soft` | `#356b79` | 5.69 canvas / 5.09 card / 4.68 sidebar，次要文字与导航 |

派生表面色：`--color-card: #ddf1f5`、`--color-card-hover`、`--color-accent-deep`、`--color-accent-soft`、`--color-line`。

图标按钮上的字形用 `#0b2b33`，在 `#87c5d1` 上是 7.77:1。色块上的前景需要自己的一份对比度，不能直接复用文字阶。

想完全复刻设计稿的浅色观感，把 `--color-ink-soft` 改回 `#87c5d1` 即可，代价是次要文字对比度掉到 1.84:1。

### 暗色模式

默认浅色。多数读者在浅色下读长文的体验更好，暗色是提供选项而不是默认推荐。

暗色令牌由同一色相家族重新推导，不是浅色值的机械反转。实测：正文 `#cbe6ec` 在 `#0f2a30` 上 11.53:1，次要文字 8.86:1，侧栏上的次要文字 7.77:1。

侧栏底部的月亮/太阳图标切换主题，选择写入 `localStorage` 的 `stardust-theme` 键。`app/app.vue` 往 `<head>` 注入的内联脚本在首次绘制前应用它，因此没有主题闪烁。

## 代码块配色

亮暗两套配色都以 Shiki 自带的 `github-light` 为起点程序化派生（`server/utils/markdown/theme.ts`），而不是各找一个现成主题。同一个 token 在亮暗两侧永远是同一个色相，切换主题时不会变成另一套语法高亮。

派生分两步：

1. **明度修正**。代码块底色取自锁定色板（亮 `#ddf1f5` / 暗 `#1a3d46`），不是主题自带的纯白与深灰。`github-light` 的橙红 `#e36209` 落在 `#ddf1f5` 上只有 2.99:1，达不到正文所需的 4.5:1。每个 token 会沿明度轴二分到刚好达标的位置，色相与饱和度不动，本来已达标的颜色原样保留。实测有 12 个颜色被调整，例如 `#6a737d → #646d76`、`#d73a49 → #cd2a39`、`#e36209 → #b34d07`。
2. **亮到暗的镜像**。暗色由修正后的亮色镜像而来：明度做压缩镜像 `0.45 + (1 − L) × 0.5` 并落在 `[0.45, 0.95]`，饱和度 × 0.72。直接取补不够用，浅灰镜像后仍是浅灰、深蓝镜像后过亮，两者在暗底上会糊成一片。降饱和也是 `AGENTS.md` 4.6 的要求，霓虹色即使在 4.5:1 下感知效果也差。

主题自带的 `background` 一律丢弃，否则某几行会突然出现一道别的颜色的高亮条。

改动后重跑校验：

```bash
bun scripts/verify-code-contrast.ts
```

当前结果：亮色底色 `#ddf1f5`，104 个 token，最低 4.50:1；暗色底色 `#1a3d46`，最低 4.51:1，两者都没有低于 4.5:1 的项。

渲染时每个 token 只输出 `--shiki-light` 与 `--shiki-dark` 两个自定义属性，由 CSS 按模式选用。不要让亮色直接写成内联 `color`，那样暗色模式只能靠 `!important` 去压，而这正是「暗色下代码看不见字」的常见成因。

## 图表配色

Mermaid 的全部主题变量由 `shared/utils/diagram-theme.ts` 里的一套语义色板派生，亮暗各一份：

| 角色 | 说明 |
| --- | --- |
| `surface` / `surfaceAlt` | 底板、交替底色 |
| `surfaceStrong` | 强调底：实体表头、分区标题、标签块 |
| `line` / `lineSoft` | 连线、网格 |
| `text` / `textMuted` / `textOnStrong` | 底板正文、次级文字、强调底上的文字 |
| `accent` / `accentSoft` | 任务条、活动节点 |
| `scale` | 分类色带（思维导图、时间线、饼图，`cScale0…11`） |
| `gitRamp` | Git 分支色（`git0…7`） |

不逐个手写变量的原因很实际：Mermaid 每种图表读的变量都不一样，漏一个就悄悄退回它自己的默认值，而默认值多是为浅色底设计的。踩过的三个坑：

| 现象 | 漏掉的变量 |
| --- | --- |
| 浅色模式下 Git 分支线看不见 | `git0…7` 之前给的是近白色，而它同时被用作分支线 |
| 深色模式下 ER 属性行白底白字 | `attributeBackgroundColorOdd/Even` 默认是 `#ffffff` / `#f2f2f2` |
| 甘特图分区名看不见、网格线消失 | `sectionBkgColor`、`taskTextOutsideColor`、`gridColor` |

两套配色各展开 143 个变量。校验脚本会对每一对「字与底」做对比度检查：

```bash
bun scripts/verify-diagram-theme.ts
```

当前结果：浅色语义色板 4 对最低 5.66:1，展开后 32 对最低 4.87:1；深色 4 对最低 7.77:1，展开后 32 对最低 5.72:1。

Git 色带必须是同一明度带里的颜色。它同时充当分支线与分支标签底色，标签文字只能二选一（深墨或浅墨），中间调两头都不达标。实测 `#43818f` 配浅墨只有 4.02:1。所以亮色那组整条压在浅墨一定读得清的暗区间，暗色那组压在亮区间。这是脚本抓出来的，不是设计直觉。

分类色带没有这个限制，因为 `cScaleLabelN` 可以逐档挑墨色，由 `bestForeground()` 按对比度自动选，改了底色也不会突然读不清。

## 无障碍

几处不显眼但改回去就会退化的处理：

| 位置 | 处理 | 不这样会怎样 |
| --- | --- | --- |
| `app/components/blog/PostMeta.vue` | 视觉分隔点 `·` 带 `aria-hidden`，紧随一个 `sr-only` 的逗号 | 日期与阅读时间会连读成 "2026/01/123 min read" |
| `app/components/AppSidebar.vue` | 移动端抽屉关闭态同时带 `invisible`，桌面端由 `lg:visible` 复原 | 只做 `-translate-x-full` 的话，隐藏菜单里的链接仍可聚焦、仍在无障碍树里，键盘用户会 Tab 进一个看不见的菜单 |
| `app/components/blog/PostCard.vue` | 置顶时标题加 `pr-24` | 绝对定位的角标会压住长标题的 `truncate` 边界 |
| 组件模板 | 设计说明写在 `<script>` 里，不写成 HTML 注释 | 注释会留在开发期 DOM 中，可能被无障碍检查工具算进列表项的可访问名称 |
| `app/components/blog/PinnedBadge.vue` | 图钉图标 `aria-hidden` | 文字已经写了 Pinned，读屏会重复播报 |

对比度全部以脚本实测，不靠目测。改动任何色值后重跑上面的两个校验脚本。

## 样式写法

Tailwind CSS 4 通过 `@tailwindcss/vite` 集成，没有 `tailwind.config.js`，设计令牌在 `app/assets/css/main.css` 的 `@theme` 里声明：

```css
@import "tailwindcss";

@theme {
  --color-ink: #2c6473;
  --spacing-reading-column: 65ch;
}
```

颜色、间距、字号都引用令牌，不写死数值；组件里不用内联 `style`。暗色模式用 `dark:` 前缀，令牌层面通过 CSS 变量切换（`.dark` 作用域下重新赋值）。

## 动效

内容页基本不动。读者把运动当干扰，只有导航反馈保留了最小剂量：页面切换的 200ms / 140ms 过渡，位移不超过 12px，只动 `transform` 与 `opacity`。单个容器的合成代价固定且极低，逐个元素错峰则要为长文的几百个节点排队，正文要等动画铺完才可见。

`prefers-reduced-motion: reduce` 下过渡直接设为 `none` 并清掉位移，不是把时长调到 0。具体实现与两个查看器的动效见[交互与查看器](interactions.md)。
