# 图片管线

这篇写给要换素材或调压缩参数的人。图片在构建期处理一次，产物不入库；文章与相册引用的是素材 key，不是文件路径。

## 两类来源

| 来源 | 写法 | 处理方式 |
| --- | --- | --- |
| 仓库本地 | `covers/hydrangea`、`albums/anime-moments/01`，相对 `assets/media` 且不带扩展名 | 构建期压成 AVIF / WebP，页面用 `<picture>` 让浏览器自选 |
| 图床或外链 | `https://…`，或 `/…` 开头的 `public` 路径 | 原样交给浏览器，不经过压缩管线 |

两种都由 `app/components/BlogImage.vue` 统一处理，调用方不用关心区别。

## 流程

```
assets/media/**          源图（入库）
     ↓  sharp 压缩
public/media/**          avif / webp 产物（.gitignore 忽略）
     ↓  清单
runtimeConfig.public.mediaManifest
     ↓  查表
<BlogImage>              输出 <picture> 与 <img>
```

清单的 key 是相对 `assets/media` 的路径（去掉扩展名），值是尺寸、各格式产物的地址与回退地址。管线实现在 `modules/media/`：`modules/media/index.ts` 负责扫描与清单注入，`modules/media/compress.ts` 是一次解码多格式输出，`modules/media/quality.ts` 是质量换算表。

`nuxt prepare` 期间会跳过压缩（每次 `bun install` 都会跑 `postinstall`，不跳会拖慢安装）。开发服务器会监听 `assets/media/`，素材变化后重新处理，清单有变化才重启。

缓存按「源文件 mtime + size」与「压缩设置哈希」双重比对：改设置会整体重编，只改一张图就只重编那张。缓存文件是仓库根目录的 `.media-cache.json`，同样不入库。

## 格式与质量

参数在 `blog.config.ts` 的 `media` 段，字段表见[配置](configuration.md)。

`format: 'both'` 会为每张图同时产出 `.avif` 与 `.webp`：

```html
<picture>
  <source srcset="/media/…/01.avif" type="image/avif">
  <source srcset="/media/…/01.webp" type="image/webp">
  <img src="/media/…/01.webp" …>   <!-- 不支持 avif / webp 时的回退 -->
</picture>
```

回退图优先用 webp，不支持 avif 的浏览器比不支持 webp 的多。`format: 'avif'` 时回退图也是 avif，Safari 16 之前的版本会看不到图。

`quality` 是以 WebP 的标尺为准的。两种编码器的 quality 含义不同，给同一个数字时，中高质量段的 AVIF 反而更大：

```
q=72   avif=139KB   webp=99KB     ← avif 大了 40%
q=40   avif= 48KB   webp= 61KB
```

`format: 'both'` 时浏览器优先选中排在 `<source>` 前面的 avif，等于拿到一个比 webp 还大的文件。

所以管线用 `scripts/benchmark-quality.ts` 对真实素材做 PSNR 对比，标定出等画质点，写进 `modules/media/quality.ts` 的 `EQUIVALENCE` 表（表外线性插值）。换算之后同一份 `quality: 72` 产出 avif 2246KB / webp 2549KB，avif 稳定小 12% 左右，`both` 才是净收益。

换了一批素材之后可以重新标定：

```bash
bun scripts/benchmark-quality.ts
```

想绕过换算直接指定，用 `avifQuality` 与 `webpQuality` 覆盖。`maxWidth` 默认 1920，超过就等比缩小；`avifEffort` 默认 4，实测再往上收益极小。

## 在文章与组件里用图

frontmatter 的 `cover`、正文里的 Markdown 图片、友链头像、相册封面都接受素材 key。

组件属性（`app/components/BlogImage.vue`）：

| 属性 | 默认 | 说明 |
| --- | --- | --- |
| `src` | 必填 | 素材 key、`/` 开头的 public 路径，或 http(s) 链接 |
| `alt` | 必填 | 替代文本 |
| `loading` | `'auto'` | `auto` 表示跨域图用 `eager`、同源图用 `lazy` |
| `fill` | `true` | `true` 填满外层容器（容器自己定尺寸）；`false` 按原始比例撑开，瀑布流用 |
| `sizes` | `'100vw'` | 远程图的响应式提示，`fill` 为 `true` 时不输出 |
| `imgClass` | `''` | 附加在 `<img>` 上的类 |
| `referrerPolicy` | `'no-referrer'` | 引用来源策略 |

清单里有尺寸时会给 `<img>` 写上 `width` / `height` 撑住版面，图片到达时页面不跳。

### 防盗链

不少图床做了防盗链：请求头里出现站外 Referer 就回 403。实测 `i0.hdslb.com`：

```
GET，无 Referer                → 200
GET，Referer: localhost:3000   → 403
```

组件默认给每个 `<img>` 加 `referrerpolicy="no-referrer"`，浏览器完全不发送 Referer，这类图就能加载。

少数图床反过来，必须带 Referer 才给图。那种情况按需覆盖：

```vue
<BlogImage src="https://…" alt="…" referrer-policy="origin" />
```

### 跨域图片不用 lazy

实测过的坑（Chrome 153，两个互不相关的跨域图源各测一遍）：

| 组合 | 结果 |
| --- | --- |
| 跨域 + `loading="lazy"` | 请求根本不发出，`naturalWidth` 恒为 0，`load` / `error` 都不触发 |
| 跨域 + `loading="eager"` | 正常加载 |
| 同源 + `loading="lazy"` | 正常加载 |

跨域图开了 lazy 会永久停在骨架屏上。组件按来源自动选择：跨域 eager、同源 lazy，可以用 `loading="lazy" | "eager"` 显式覆盖。

`loading` 是字符串枚举而不是布尔值。Vue 会把声明为 `Boolean` 且未传值的 prop 自动转成 `false`，「没传」和「传了 false」就分不开了。

### 加载提示

图片就位前显示一层扫光骨架屏（`.media-skeleton`，定义在 `app/assets/css/main.css`），`load` 后 300ms 淡入盖住它。加载失败留下一块静态底色，不会在版面上留一个说不清的空洞。`prefers-reduced-motion` 由全局规则统一停掉动画。

## 文章封面

- frontmatter 写了 `cover`：用它，本地素材 key 或图床链接都可以
- 没写：回落到随机图 API，URL 上带一个每次服务端渲染都不同的种子

同一页里每篇无封面文章的 URL 必须彼此不同，所以 slug 也拼进了查询参数。只用时间种子的话整页会命中同一个 URL，浏览器复用那份 302 与图片缓存，结果是整页同一张图。

随机封面每次渲染都变，也就意味着每张都会真实发起一次跨域请求。这是「随机图」这个需求的固有成本，介意的话把 `media.randomCover.enabled` 关掉，只给文章写自定义封面。静态生成时页面在构建期渲染一次，随机封面也就随之固定下来。

## 相册

相册不需要在配置里列图片。在 `app/app.config.ts` 里声明一册，`dir` 指向 `assets/media` 下的目录：

```ts
albums: [
  { slug: 'anime-moments', title: 'Anime Moments', description: '…', dir: 'albums/anime-moments' },
]
```

往 `assets/media/albums/anime-moments/` 里丢图片就会被自动收录，按文件名自然排序（`01, 02, … 10`）。`/gallery/:slug` 用 CSS 多列实现瀑布流，图片保持原始比例、高度自然错落，效果取决于素材本身的横竖比例差异，所以示例素材是横竖混排的。

## 示例素材

`assets/media/` 里的图来自公开随机图 API（<https://t.alcy.cc>），只用于演示排版与压缩管线。正式使用时替换成自己的图片，并注意原图授权。重新抓取：

```bash
bun scripts/fetch-demo-media.ts          # 只补齐缺失的
bun scripts/fetch-demo-media.ts --force  # 全部重新抓取
```

脚本做了三件事：按内容哈希去重（该 API 会重复返回同一张图）、把源图长边压到 2200 以内（封面 1920、友链头像 400 见方）、让相册素材横竖交替（随机端点大量返回 16:9，全横图会让瀑布流退化成等宽网格）。存盘用 WebP q86。

头像 `assets/media/avatar.webp` 不参与脚本，是人工挑好的固定素材，想换直接替换那个文件，尺寸要求 ≥512×512。
