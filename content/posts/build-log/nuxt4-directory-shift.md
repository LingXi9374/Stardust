---
title: Nuxt 4 的目录位移
description: app/ 成为唯一源码根之后，哪些习惯需要改，哪些陷阱会立刻出现。
date: 2025-11-21
tags: [nuxt, framework]
---

Nuxt 4 把客户端源码收进了 `app/`。这不是单纯的整理，它改变了几件事的默认行为。

## 新布局

```
app/        客户端应用代码：pages / components / layouts / composables
content/    内容文件
public/     静态资源
shared/     客户端与服务端共享的类型和工具
server/     Nitro 服务端代码
```

## 立刻会踩的三个坑

### 1. 根目录的 pages/ 不再被发现

往项目根写 `pages/index.vue` 不会有任何反应。目录发现只基于 `app/`。

### 2. Tailwind 4 没有配置文件

设计令牌改用 CSS 中的 `@theme` 指令声明，`tailwind.config.js` 已经不是必需项：

```css
@import 'tailwindcss';

@theme {
  --color-accent: #87c5d1;
  --spacing-sidebar: 17.5rem;
}
```

`--color-*` 会生成 `bg-accent`、`text-accent` 这类工具类；`--spacing-*` 会进入间距尺度。自定义变体则用 `@custom-variant`：

```css
@custom-variant dark (&:where(.dark, .dark *));
```

### 3. shared/ 是双向的

`shared/` 下的类型和工具同时被 app 与 server 引用。阅读时间这类**两端需要同一份基准**的计算，放在这里最合适——服务端算好写进 HTML，客户端就不必再算一次。

```ts
// shared/utils/reading-time.ts
export function countReadingMinutes(source: string): number {
  return Math.max(1, Math.round(source.length / 500))
}
```

## 值不值得

值得。目录结构现在和心智模型一致了：`app/` 是浏览器里跑的东西，`server/` 是服务器上跑的东西，中间那层共享代码有自己的位置。

## 共享层带来的一个实际好处

把阅读时间这类计算放进 `shared/` 之后，服务端可以在渲染时算好写进 HTML，客户端不必再算一遍——两端共用同一份基准，也就不会出现"列表里显示 3 分钟、详情页显示 4 分钟"这种分歧。

```ts
// shared/utils/reading-time.ts —— app 与 server 同时可用
export function countReadingMinutes(source: string): number {
  const cjk = source.match(/[\u4e00-\u9fff]/g)?.length ?? 0
  const latin = source.split(/\s+/).length
  return Math.max(1, Math.round(cjk / 300 + latin / 265))
}
```

客户端只保留一个薄薄的展示层：

```ts
// app/composables/useReadingTime.ts
export function useReadingTime(source: MaybeRefOrGetter<number | string>) {
  const minutes = computed(() => {
    const value = toValue(source)
    return typeof value === 'number' ? value : countReadingMinutes(value)
  })
  return { minutes, label: computed(() => `${minutes.value} min read`) }
}
```

### 自动导入的边界

`shared/` 下的导出会被自动导入，但**只在 app 与 server 各自的上下文中**。从 `shared/utils/` 引用 Vue 的 API 是安全的，反过来在 `shared/` 里使用 `useState`、`useFetch` 这类 Nuxt 组合式函数则不成立——它们只在客户端上下文里存在。

判断标准很简单：这段代码能不能在一台没有浏览器的服务器上跑通？能，就放 `shared/`。

## 迁移时最容易出错的一步

把 `tsconfig.json` 从单文件改成 project references：

```json
{
  "files": [],
  "references": [
    { "path": "./.nuxt/tsconfig.app.json" },
    { "path": "./.nuxt/tsconfig.server.json" },
    { "path": "./.nuxt/tsconfig.shared.json" },
    { "path": "./.nuxt/tsconfig.node.json" }
  ]
}
```

根 `tsconfig.json` 只负责指向，真正的 `compilerOptions` 由 Nuxt 生成。想在根配置里写 `strict: true` 是无效的——它落在 `files: []` 上，不参与任何被引用的项目。正确的位置是 `nuxt.config.ts`：

```ts
export default defineNuxtConfig({
  typescript: { strict: true },
})
```
