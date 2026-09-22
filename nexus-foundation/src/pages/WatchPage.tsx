import { useParams, Link } from 'react-router-dom'

export function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()
  if (!videoId) return null

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <div className="aspect-video w-full overflow-hidden rounded-card bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div>
        <Link to="/watch" className="text-nexus-coral hover:underline">
          ← Quay lại tìm kiếm
        </Link>
      </div>
    </div>
  )
}
