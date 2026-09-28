export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  return `${match[1]}/${match[2]}/${match[3]}`
}

/** 仅取月/日，用于时间线这类已按年份分组的场景。 */
export function formatMonthDay(iso: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  return `${match[1]}/${match[2]}`
}

export function isExternalUrl(href: string): boolean {
  return /^https?:\/\//i.test(href)
}
