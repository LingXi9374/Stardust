import { config } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

/**
 * Font Awesome 7 图标。
 *
 * - 图标 CSS 由 nuxt.config.ts 的 css 数组静态引入，因此关闭运行时注入，
 *   避免服务端渲染时样式后到导致图标尺寸闪烁。
 * - 这里不调用 library.add()：各组件直接传入 IconDefinition 对象，
 *   只有真正用到的图标才会进入产物（字符串名查找会迫使整包被引用）。
 */
config.autoAddCss = false

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('FontAwesomeIcon', FontAwesomeIcon)
})
