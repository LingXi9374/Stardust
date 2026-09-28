/**
 * 日期计算。
 *
 * 所有日期都按 `YYYY-MM-DD` 字符串处理，比较时统一落到 UTC 零点——
 * 直接用 Date 相减会因为时区偏移与夏令时算出 0.96 天这种结果，
 * 再取整就出现「明明差一天却显示 0 天」。
 */

/** 取某个时刻所在时区的当天，返回 `YYYY-MM-DD`。 */
export function localToday(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 把 `YYYY-MM-DD` 解析成 UTC 零点的时间戳；非法输入返回 null。 */
export function parseDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const stamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(stamp) ? null : stamp
}

/**
 * `from` 到 `to` 之间的整天数。
 * 任一侧非法就返回 0，调用方不必到处判空。
 */
export function daysBetween(from: string, to: string): number {
  const start = parseDay(from)
  const end = parseDay(to)
  if (start === null || end === null) return 0
  return Math.round((end - start) / 86_400_000)
}

/** 取 `YYYY-MM` 前缀，用于按月分组。 */
export function monthKey(value: string): string {
  return value.slice(0, 7)
}

/** 某个日期所在月的天数。 */
export function daysInMonth(year: number, month: number): number {
  // 下个月的第 0 天就是本月最后一天
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** 某个日期是星期几，0 为周日。 */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}
