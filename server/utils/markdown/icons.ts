/**
 * 提示框图标。
 *
 * 这里刻意用行内 SVG 而不是引入图标库：这些图标是服务端拼进 HTML 的，
 * 走不到 Vue 组件那条路；而且统共十来个，没必要为它们拉一个运行时进来。
 * 形状取自 Feather 的 24×24 线性风格，与 Font Awesome 的实心图标区分开。
 */

const wrap = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

export const ADMONITION_ICONS: Record<string, string> = {
  note: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>'),
  tip: wrap(
    '<path d="M9 18h6"/><path d="M10 21h4"/>' +
      '<path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1h6c0-.4.1-.8.5-1.1A6 6 0 0 0 12 3Z"/>',
  ),
  important: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>'),
  warning: wrap(
    '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>' +
      '<path d="M12 9v4"/><path d="M12 17h.01"/>',
  ),
  caution: wrap(
    '<path d="M8.2 2.6 2.6 8.2a2 2 0 0 0-.6 1.4v4.8a2 2 0 0 0 .6 1.4l5.6 5.6a2 2 0 0 0 1.4.6h4.8a2 2 0 0 0 1.4-.6l5.6-5.6a2 2 0 0 0 .6-1.4V9.6a2 2 0 0 0-.6-1.4L15.8 2.6a2 2 0 0 0-1.4-.6H9.6a2 2 0 0 0-1.4.6Z"/>' +
      '<path d="M12 8v5"/><path d="M12 16h.01"/>',
  ),
  success: wrap('<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>'),
  question: wrap(
    '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.2-.9.8-.9 1.4v.8"/><path d="M12 17h.01"/>',
  ),
  failure: wrap('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>'),
  danger: wrap('<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"/>'),
  bug: wrap(
    '<rect x="8" y="6" width="8" height="14" rx="4"/>' +
      '<path d="M8 12H3M21 12h-5M8 7 5 4M16 7l3-3M8 17l-3 3M16 17l3 3"/>',
  ),
  example: wrap('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'),
  quote: wrap(
    '<path d="M9 7H5.5A2.5 2.5 0 0 0 3 9.5v2A2.5 2.5 0 0 0 5.5 14H7v1a3 3 0 0 1-3 3"/>' +
      '<path d="M20 7h-3.5A2.5 2.5 0 0 0 14 9.5v2a2.5 2.5 0 0 0 2.5 2.5H18v1a3 3 0 0 1-3 3"/>',
  ),
}

export const FALLBACK_ADMONITION_ICON = ADMONITION_ICONS.note!

/**
 * 类型别名 → 基础类型。
 *
 * GitHub 只认 5 种；Obsidian 的别名很多，这里全部接住并归到一种视觉表现上，
 * 这样 `> [!TLDR]` 和 `> [!SUMMARY]` 长得一样，但都能用。
 */
export const ADMONITION_ALIASES: Record<string, string> = {
  note: 'note',
  info: 'note',
  abstract: 'note',
  summary: 'note',
  tldr: 'note',
  todo: 'note',
  tip: 'tip',
  hint: 'tip',
  important: 'important',
  success: 'success',
  check: 'success',
  done: 'success',
  question: 'question',
  help: 'question',
  faq: 'question',
  warning: 'warning',
  caution: 'caution',
  attention: 'caution',
  failure: 'failure',
  fail: 'failure',
  missing: 'failure',
  danger: 'danger',
  error: 'danger',
  bug: 'bug',
  example: 'example',
  quote: 'quote',
  cite: 'quote',
}

/** 中文默认标题，作者没写标题时用它 */
export const ADMONITION_LABELS: Record<string, string> = {
  note: '笔记',
  tip: '提示',
  important: '重要',
  warning: '警告',
  caution: '注意',
  success: '成功',
  question: '问题',
  failure: '失败',
  danger: '危险',
  bug: '缺陷',
  example: '示例',
  quote: '引用',
}
