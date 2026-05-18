import React, { useEffect, useState } from 'react'
import { ExternalLink, Radio, Loader2 } from 'lucide-react'
import { backendApi, type DisasterFeedItem } from '@/services/api/backendClient'

export const RecentDisastersSection: React.FC = () => {
  const [items, setItems] = useState<DisasterFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    backendApi
      .getRecentDisasters()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load feed'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section id="recent-disasters" className="w-full max-w-6xl mx-auto px-4 py-16 scroll-mt-24">
      <div className="flex flex-col gap-2 mb-10 text-center">
        <div className="flex items-center justify-center gap-2 text-[#00D4FF]">
          <Radio className="w-5 h-5" />
          <span className="text-[10px] font-black tracking-[0.4em] uppercase">Global Situation Feed</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-wider font-['Orbitron'] text-white">
          RECENT DISASTERS
        </h2>
        <p className="text-xs text-[#8BA3C7] max-w-lg mx-auto uppercase tracking-widest opacity-60">
          Live signals from ReliefWeb and GDACS
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-[#8BA3C7]">
          <Loader2 className="w-5 h-5 animate-spin text-[#00D4FF]" />
          <span className="text-xs font-black tracking-widest uppercase">Syncing global feeds...</span>
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-amber-400 py-8">
          {error}. Start the API server with <code className="text-[#00D4FF]">npm run server</code>.
        </p>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <article
              key={item.id}
              className="bg-[#161B22] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 hover:border-[#00D4FF]/30 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black text-[#00D4FF] uppercase tracking-widest">
                  {item.source}
                </span>
                <span className="text-[9px] text-[#8BA3C7]/60">
                  {new Date(item.publishedAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{item.title}</h3>
              <p className="text-xs text-[#8BA3C7] leading-relaxed flex-1 line-clamp-4">{item.summary}</p>
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] font-black text-[#00D4FF] uppercase tracking-widest hover:text-white transition-colors mt-auto"
                >
                  Read source
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
