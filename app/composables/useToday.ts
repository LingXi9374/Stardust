import { localToday } from '~~/shared/utils/date'

/**
 * 今天，按**访客的系统时区**算。
 *
 * 为什么不能直接用 `new Date()`：
 * 服务端渲染时拿到的是服务器所在时区的日期，跨时区访问就会出现
 * 「日历高亮的今天比访客真正的今天早/晚一天」。
 *
 * 做法是先让 SSR 用一个初始值渲染（useState 会把它带进 payload，
 * 客户端 hydration 时两边一致，不会有 mismatch），挂载后再校正成访客本地日期。
 * onMounted 在 hydration 之后执行，所以这次更新只是普通的响应式 patch。
 */
export function useToday() {
  const today = useState('site-today', () => localToday())

  onMounted(() => {
    const local = localToday()
    if (local !== today.value) today.value = local
  })

  return today
}
