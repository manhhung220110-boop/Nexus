import type { YouTubeVideoSummary } from '../../lib/youtube';

export function VideoCard({ video, onClick }: { video: YouTubeVideoSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-card border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:shadow-[var(--shadow-md)]"
    >
      <img
        src={video.thumbnail}
        alt={video.title}
        className="w-full aspect-video object-cover"
      />
      <div className="p-3">
        <p className="line-clamp-2 font-medium text-[var(--text)]">{video.title}</p>
        <p className="mt-1 text-sm text-[var(--text-2)]">{video.channelTitle}</p>
      </div>
    </button>
  );
}
