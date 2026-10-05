# 评论

文章页的评论用 [giscus](https://giscus.app/zh-CN)：评论以 GitHub Discussions 的形式存在你自己的仓库里，站点这边不存任何数据，读者用 GitHub 账号发言。

组件是官方的 [`@giscus/vue`](https://github.com/giscus/giscus-component)，它是对 `giscus-widget` 这个 Web Component 的一层薄封装。

## 配置

### 1. 给仓库装 giscus App

到 <https://github.com/apps/giscus> 授权，选择要承载评论的仓库。

### 2. 拿三个值

打开 <https://giscus.app/zh-CN>，填上仓库名，页面会生成一段配置。把其中这三个值抄进 `blog.config.ts`：

```ts
export const comments: BlogCommentsConfig = {
  enabled: true,
  heading: '评论',
  giscus: {
    repo: 'your-name/your-repo',
    repoId: 'R_kgDOxxxxxxx',
    category: 'Announcements',
    categoryId: 'DIC_kwDOxxxxxxxx',
    // …
  },
}
```

**不要手写这三个值。** `repoId` 与 `categoryId` 是 GitHub 的 node ID，看着像乱码但是必需的。

### 3. 确认映射方式

`mapping` 默认 `pathname`：一个 URL 路径对应一个讨论串。

本站文章地址是 `/posts/<slug>`，文件夹只负责归档、不进路径，所以**把文章在合集之间搬家不会断开已有评论**。改标题也不会。

### 没配好会怎样

三个值缺任意一个，文章页不会渲染评论区，而是显示一条提示告诉维护者去 giscus.app 填。这比让 giscus 弹一个「仓库不存在」的错误框要好——读者不该看到配置问题的现场。

## 主题

giscus 的界面跑在 `giscus.app` 的 iframe 里，**自定义主题是一个完整的 CSS 文件，整体替换官方主题，没有继承**。官方主题在 `main` 上定义了 82 个变量（含 31 个代码高亮变量），只覆盖一部分的话，剩下的会回落成 Primer 的默认蓝灰色，和本站色板打架。

所以这两个文件是**以官方主题为底、只替换颜色值**生成的：

```
assets/giscus/preferred_color_scheme.css        亮色
assets/giscus/preferred_color_scheme_dark.css   暗色
```

改色之后重新生成：

```bash
bun scripts/build-giscus-theme.ts
```

脚本会重新拉取官方主题、套上 `LIGHT` / `DARK` 两张色板、核对变量数一个不少，并逐对打印对比度。**任何一项低于 4.5:1 就以非零码退出**，不会把不达标的主题写进仓库。

### 链接为什么不靠颜色区分

本站是单色板，`#87c5d1` 一族是**前景面**色不是文字色——实测 `#5aa6b5` 落在 `#e9feff` 上只有 **2.66:1**，根本读不清。所以链接改用「深墨 + 下划线」的编辑式做法：颜色与正文同族，靠下划线区分。这也让色觉障碍读者不必依赖色相。

强调色仍然用在按钮、选中态这些非文字的位置上。

### 为什么主题要由 Nitro 路由提供

giscus 在 iframe 里注入的是：

```html
<link id="giscus-theme" rel="stylesheet" crossorigin="anonymous" href="…">
```

注意那个 `crossorigin="anonymous"`——主题 CSS 是**跨域请求**（文档源是 `giscus.app`，样式表在本站域名下）。没有 `Access-Control-Allow-Origin`，浏览器会直接拒绝应用，表现是评论正常出现、配色却还是 giscus 默认的，很难查。

而两条更直接的路都走不通，都实测过：

- **放 `public/` 直接静态托管**：那些文件会被更早的静态处理器短路，`server/middleware` 根本不会执行。
- **Nitro 路由 + Vite 的 `?raw` 读文件**：`?raw` 在服务端产物里不被支持，rollup 会把 `?raw` 当成文件名的一部分去打开。

所以最终的做法是：样式内容在生成阶段就内联进 `server/utils/giscus-theme.generated.ts`，由 `server/routes/giscus/[file].get.ts` 返回并亲自设置响应头。产物自带内容，不依赖运行时读磁盘，也不需要改 `nuxt.config.ts`。

`.css` 文件保留下来是为了可读与可 diff，两份由同一支脚本一次产出，不会各说各话。

## https 是硬性前提

自定义主题的地址必须是 **https**（giscus 自己的类型定义就把 `Theme` 限制成 `` `https://${string}` ``）。

站点跑在 http 时（本地开发就是），https 的 `giscus.app` 去加载 http 的样式表属于**混合内容**，浏览器直接拦截。这种情况下会自动退回 `theme.fallbackLight` / `fallbackDark` 指定的内置主题，而不是留一个加载不出来的空样式。

判断依据是**协议而不是 dev/prod**：线上用 http 部署同样会失败，所以逻辑写的是 `origin.startsWith('https://')`。

想在本机看到自定义主题的实际效果，需要一个 https 的本地域或一条隧道。

## 主题切换

`@giscus/vue` 的 `theme` 是响应式绑定的，切换站点明暗主题时会通过 `setConfig` 消息通知 iframe，**不会重新加载 iframe**，评论区不会闪一下。

## 性能

- `loading: 'lazy'` 让 iframe 等滚动到评论区附近才加载。一篇文章的读者可能根本不看评论，不该为它付出加载成本。
- `@giscus/vue` 在 `onMounted` 里才动态 import Web Component，服务端渲染的是一个空节点。所以组件本身是 SSR 安全的，不需要额外包 `<ClientOnly>`。
- `comments.enabled` 设为 `false` 时，`@giscus/vue` 完全不会被加载。

## 相关文件

```
app/components/blog/PostComments.vue      文章页评论区
assets/giscus/*.css                       主题（可读的源）
server/utils/giscus-theme.generated.ts    主题（内联版，路由实际返回的）
server/routes/giscus/[file].get.ts        主题路由 + CORS 头
scripts/build-giscus-theme.ts             主题生成与对比度校验
```
