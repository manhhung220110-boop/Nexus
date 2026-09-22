import { useState } from 'react'
import { startSpotifyLogin, isSpotifyConnected, searchTracks, type SpotifyTrackSummary } from '../lib/spotify'

export function MusicPage() {
  const [connected] = useState(isSpotifyConnected())
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<SpotifyTrackSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      setTracks(await searchTracks(query))
    } catch {
      setError('Tìm nhạc thất bại, thử kết nối lại Spotify.')
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-[480px] space-y-4 rounded-card border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <p className="text-[var(--text-2)]">Kết nối Spotify để tìm và nghe nhạc.</p>
        <button
          onClick={() => startSpotifyLogin()}
          className="rounded-control bg-nexus-green px-5 py-2.5 font-medium text-white hover:bg-green-600"
        >
          Kết nối Spotify
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm bài hát, nghệ sĩ..."
          className="flex-1 rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-green focus:ring-2 focus:ring-nexus-green/25"
        />
        <button
          type="submit"
          className="rounded-control bg-nexus-green px-5 py-2.5 font-medium text-white hover:bg-green-600"
        >
          Tìm
        </button>
      </form>

      {loading && <p className="text-[var(--text-2)]">Đang tìm...</p>}
      {error && <p className="text-nexus-coral">{error}</p>}

      <div className="space-y-3">
        {tracks.map((t) => (
          <iframe
            key={t.id}
            title={t.name}
            src={`https://open.spotify.com/embed/track/${t.id}`}
            width="100%"
            height="152"
            style={{ borderRadius: 12 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  )
}
