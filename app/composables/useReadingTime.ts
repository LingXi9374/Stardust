import type { MaybeRefOrGetter } from 'vue'
import { countReadingMinutes } from '~~/shared/utils/reading-time'

/**
 * 阅读时间的展示层封装。
 * 计算逻辑位于 shared/utils/reading-time.ts，客户端与服务端共用同一份基准。
 */
export function useReadingTime(source: MaybeRefOrGetter<number | string>) {
  const minutes = computed(() => {
    const value = toValue(source)
    return typeof value === 'number' ? Math.max(1, Math.round(value)) : countReadingMinutes(value)
  })

  const label = computed(() => `${minutes.value} min read`)

  return { minutes, label }
}
