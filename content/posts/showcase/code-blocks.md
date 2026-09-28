---
title: 代码块的全部写法
description: 终端窗口、编辑器窗口、文件名、行号、行标记、折叠、标签页——一份可以直接抄的速查。
date: 2026-06-12
tags: [markdown, code, showcase]
---

代码块是这套模板花力气最多的地方。下面每一节都先给写法，再给效果。

## 窗口框架

框架类型由语言决定：终端类语言自动套 mac 终端窗口，其余套编辑器窗口。

```bash
echo "这是终端窗口，因为没有指定 title，标题栏留空"
```

```js
console.log('这是编辑器窗口')
```

用 `title=` 补上文件名：

```js title="my-test-file.js"
console.log('标题属性示例')
```

```powershell title="PowerShell 终端示例"
Write-Output "终端窗口同样可以有标题"
```

想强制指定类型，用 `frame=`：

```sh frame="none"
echo "看，没有框架"
```

```ps frame="code" title="Profile.ps1"
# 不加 frame 的话这是终端窗口，frame="code" 把它变成编辑器窗口
function Watch-Tail { Get-Content -Tail 20 -Wait $args }
New-Alias tail Watch-Tail
```

`frame` 取 `terminal` / `code` / `none` / `auto`（默认，按语言推断）。

## 行号

行数达到阈值就自动显示行号。阈值在 `blog.config.ts` 的 `codeBlocks.lineNumbersThreshold` 里，默认 3 行。

```js
// 这一块只有两行，不显示行号
console.log('短块不给行号，避免喧宾夺主')
```

显式打开 / 关闭：

```js showLineNumbers
// showLineNumbers 强制显示
console.log('来自第 2 行的问候')
console.log('我在第 3 行')
```

```js showLineNumbers=false
// showLineNumbers=false 强制关闭
console.log('这块就不给行号')
console.log('虽然它有四行，按默认策略本该显示')
console.log('第四行')
```

从指定行号起算，适合展示长文件的片段：

```js showLineNumbers startLineNumber=5
console.log('来自第 5 行的问候')
console.log('我在第 6 行')
```

## 行标记

用花括号标出重点行：

```js {1, 4, 7-8}
// 第 1 行 —— 中性标记
// 第 2 行
// 第 3 行
// 第 4 行 —— 中性标记
// 第 5 行
// 第 6 行
// 第 7 行 —— 范围 7-8
// 第 8 行 —— 范围 7-8
```

三种标记类型各有语义：

```js title="line-markers.js" del={2} ins={3-4} {6}
function demo() {
  console.log('此行标记为已删除')
  // 此行和下一行标记为已插入
  console.log('这是第二个插入行')

  return '此行使用中性默认标记'
}
```

还可以给标记加标签，标签会贴在行尾：

```js {"第一步：取值":1} ins={"第二步：补上这个属性":5-6} del={"第三步：删掉这两个状态":8-9}
const props = defineProps({ value: String })

const button = createButton({
  value,
  className: buttonClass,
  disabled,
  active,
})
```

## 折叠

`collapse={…}` 把指定区间默认折起来，读者想看了再展开：

```js collapse={1-5, 21-24}
// 这一段样板代码默认折叠
import { someBoilerplateEngine } from '@example/some-boilerplate'
import { evenMoreBoilerplate } from '@example/even-more-boilerplate'

const engine = someBoilerplateEngine(evenMoreBoilerplate())

// 这部分默认可见
engine.doSomething(1, 2, 3, calcFn)

function calcFn() {
  // 可以有多个折叠区间
  const a = 1
  const b = 2
  const c = a + b

  // 这行保持可见
  console.log(`计算结果: ${a} + ${b} = ${c}`)
  return c
}

// 直到块末尾的代码再次被折起来
engine.closeConnection()
engine.freeMemory()
engine.shutdown({ reason: '示例样板代码结束' })
```

不写区间就是整块折叠：

```js collapse
// 整块默认折叠，点上面的摘要展开
console.log('藏起来了')
```

## 自动换行

长行默认横向滚动，加 `wrap` 改成折行：

```js wrap
// 启用换行
function getLongString() {
  return '这是一个非常长的字符串，除非容器极宽，否则很可能无法适应可用空间'
}
```

```js wrap=false
// 关闭换行（也是默认行为），超出的部分横向滚动
function getLongString() {
  return '这是一个非常长的字符串，除非容器极宽，否则很可能无法适应可用空间'
}
```

## 标签页代码块

用 `::: code-group labels=[…]` 把多个代码块合成一组，标签数量与代码块一一对应：

::: code-group labels=[code.js, code.py, code.html]

```js
export function greet(name) {
  return `Hello, ${name}!`;
}
```

```py
def greet(name):
    return f"Hello, {name}!"
```

```html
<p>Hello, world!</p>
```

:::

标签里可以用 emoji 短代码：

::: code-group labels=[:package: npm, :package: pnpm, :yarn: yarn]

```bash
npm create nuxt@latest
```

```bash
pnpm create nuxt@latest
```

```bash
yarn create nuxt
```

:::

组内仍然是普通代码块，标题、行号、标记、折叠都能照常叠加：

::: code-group labels=[配置, 终端, 折叠]

```js title="nuxt.config.ts" {2} ins={3}
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
});
```

```bash title="部署"
bun run build && node .output/server/index.mjs
```

```js collapse={1-3}
// 这三行默认折叠
import { a } from 'a'
import { b } from 'b'

console.log(a, b)
```

:::

> [!TIP]
> 标签切换是纯 CSS 实现的（radio + `:checked`），没有 JavaScript 参与。
> 好处是首屏不会出现"所有面板同时可见"的闪烁，键盘用户用方向键就能切换。
> 代价是标签数量上限 8 个——够用，而且真要超了改 CSS 就行。

## diff

`diff` 语言可以直接用类似 diff 的写法，Shiki 会按增删上色：

```diff
--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
+this is an actual diff file
-all contents will remain unmodified
 no whitespace will be removed either
```

## 速查表

| 想要的效果 | 写法 |
| :--- | :--- |
| 文件名 | ` ```js title="app.js"` |
| 强制窗口类型 | ` ```sh frame="none"` |
| 显示行号 | ` ```js showLineNumbers` |
| 从第 N 行起算 | ` ```js showLineNumbers startLineNumber=5` |
| 标记若干行 | ` ```js {1,4,7-8}` |
| 插入 / 删除标记 | ` ```js ins={3-4} del={2}` |
| 带标签的标记 | ` ```js {"说明":5-6}` |
| 折叠区间 | ` ```js collapse={1-5}` |
| 整块折叠 | ` ```js collapse` |
| 自动换行 | ` ```js wrap` |
| 标签页 | `::: code-group labels=[a, b]` |
