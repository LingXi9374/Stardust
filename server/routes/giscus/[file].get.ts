import {
  GISCUS_THEME_DARK,
  GISCUS_THEME_LIGHT,
} from '~~/server/utils/giscus-theme.generated'

/**
 * GET /giscus/:file — 提供 giscus 的自定义主题。
 *
 * 为什么不用 public/ 直接静态托管：giscus 在 iframe 里注入的是
 *
 *   <link id="giscus-theme" rel="stylesheet" crossorigin="anonymous" href="...">
 *
 * 那个 crossorigin 让它成为**跨域请求**（文档源是 giscus.app，样式表在本站域名下），
 * 没有 Access-Control-Allow-Origin 浏览器会直接拒绝应用——表现是评论正常出现、
 * 但配色还是 giscus 默认的，很难查。
 *
 * 而 public/ 下的文件会被更早的静态处理器短路，server/middleware 根本不会执行；
 * Vite 的 ?raw 在服务端产物里也不被支持。所以样式内容在生成阶段就内联进
 * server/utils/giscus-theme.generated.ts，这里直接返回并亲自设响应头。
 *
 * 内容由 `bun scripts/build-giscus-theme.ts` 生成，别手改。
 */
const THEMES: Record<string, string> = {
  'preferred_color_scheme.css': GISCUS_THEME_LIGHT,
  'preferred_color_scheme_dark.css': GISCUS_THEME_DARK,
}

export default defineEventHandler((event) => {
  const file = getRouterParam(event, 'file') ?? ''
  const css = THEMES[file]

  if (!css) {
    throw createError({ statusCode: 404, statusMessage: `没有这个主题：${file}` })
  }

  setResponseHeader(event, 'content-type', 'text/css; charset=utf-8')
  // 允许任意源读取：这是公开的样式表，giscus.app 的 iframe 要跨域取它
  setResponseHeader(event, 'access-control-allow-origin', '*')
  setResponseHeader(event, 'cross-origin-resource-policy', 'cross-origin')
  // 主题随站点一起发布，内容变了会重新生成；一小时足够，也别缓存太久
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')

  return css
})
