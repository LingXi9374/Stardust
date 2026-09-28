---
title: Shiki 与代码块的两个细节
description: 水平滚动和键盘聚焦，比配色方案更影响代码块是否可用。
date: 2025-09-15
tags: [nuxt, a11y, tooling]
---

代码高亮很容易被当成一个纯视觉问题。实际上，两个不那么显眼的属性决定了长代码行在真实场景里能不能用。

## 细节一：必须能水平滚动

```css
.reading-column pre {
  overflow-x: auto;
  tab-size: 2;
}
```

没有这条，一行动辄 120 字符的代码会把整个页面撑出横向滚动条，正文的度量随之失效。

## 细节二：必须能键盘聚焦

可滚动区域如果拿不到焦点，键盘用户就只能看着被裁掉的代码。加一个 `tabindex`：

```html
<pre tabindex="0"><code>...</code></pre>
```

Markdown 渲染器不会自动加这个属性，需要在渲染后处理，或者用自定义规则注入。

## 服务端渲染方案

在 Nitro 里惰性创建一个 Shiki 高亮器，然后接到 markdown-it 的 `highlight` 钩子上：

```ts
const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark-dimmed'],
  langs: ['ts', 'vue', 'css', 'bash'],
})

const md = new MarkdownIt({
  highlight(code, lang) {
    return highlighter.codeToHtml(code, {
      lang,
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    })
  },
})
```

只要 `highlight` 的返回值以 `<pre` 开头，markdown-it 就会原样采用，不再自行包裹。高亮器在进程内复用，不随请求重建。

### 暗色 token 要降饱和

霓虹色即使在 4.5:1 的对比度下，感知上也依然刺眼。暗色主题选降饱和的变体，再把代码块背景拉回自己的色板，避免它跳出整页的视觉体系。

## 小结

高亮的配色方案换来换去，收益远小于把滚动和焦点这两件事做对。
