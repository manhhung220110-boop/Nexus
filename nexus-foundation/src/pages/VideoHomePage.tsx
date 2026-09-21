import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchVideos, type YouTubeVideoSummary } from '../lib/youtube';
import { VideoCard } from '../components/video/VideoCard';

export function VideoHomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeVideoSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchVideos(query));
    } catch {
      setError('Không tải được video — kiểm tra VITE_YOUTUBE_PROXY_URL và Worker.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm video trên Nexus..."
          className="flex-1 rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-coral focus:ring-2 focus:ring-nexus-coral/25"
        />
        <button
          type="submit"
          className="rounded-control bg-nexus-coral px-5 py-2.5 font-medium text-white hover:bg-red-600"
        >
          Tìm
        </button>
      </form>

      {loading && <p className="text-[var(--text-2)]">Đang tìm...</p>}
      {error && <p className="text-nexus-coral">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((v) => (
          <VideoCard
            key={v.id}
            video={v}
            onClick={() => navigate(`/watch/${v.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
