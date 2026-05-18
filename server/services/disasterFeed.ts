export interface DisasterFeedItem {
  id: string
  title: string
  summary: string
  source: string
  sourceUrl: string
  publishedAt: string
  eventType?: string
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseRssItems(xml: string, source: string): DisasterFeedItem[] {
  const items: DisasterFeedItem[] = []
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || []

  for (const block of itemBlocks.slice(0, 12)) {
    const title = stripHtml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Disaster Event')
    const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || ''
    const desc = stripHtml(
      block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || ''
    ).slice(0, 280)
    const pubDate =
      block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ||
      new Date().toISOString()

    items.push({
      id: `${source}-${link || title}`.replace(/\W+/g, '-').slice(0, 80),
      title,
      summary: desc || 'No summary available.',
      source,
      sourceUrl: link,
      publishedAt: pubDate,
    })
  }

  return items
}

export async function fetchRecentDisasters(): Promise<DisasterFeedItem[]> {
  const feeds = [
    { url: 'https://reliefweb.int/disasters/rss.xml', source: 'ReliefWeb' },
    { url: 'https://www.gdacs.org/xml/rss.xml', source: 'GDACS' },
  ]

  const all: DisasterFeedItem[] = []

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'ReliefLens/1.0' },
      })
      if (!res.ok) continue
      const xml = await res.text()
      all.push(...parseRssItems(xml, feed.source))
    } catch (err) {
      console.warn(`Feed failed ${feed.url}:`, err)
    }
  }

  return all
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 24)
}
