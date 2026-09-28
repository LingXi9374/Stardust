const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char)
}

/** GET /feed.xml —— RSS 2.0 订阅源。 */
export default defineEventHandler(async (event) => {
  const { site } = useAppConfig()
  const posts = await listPosts()
  const origin = getRequestURL(event).origin

  const items = posts
    .map((post) => {
      const url = `${origin}/posts/${post.slug}`
      const pubDate = post.date ? new Date(`${post.date}T00:00:00Z`).toUTCString() : ''

      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(post.description)}</description>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${escapeXml(origin)}</link>
    <description>${escapeXml(site.tagline)}</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>
`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})
