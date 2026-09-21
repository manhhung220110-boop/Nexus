const BASE = import.meta.env.VITE_YOUTUBE_PROXY_URL as string;

export interface YouTubeVideoSummary {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

export align async function searchVideos(query: string): Promise<YouTubeVideoSummary[]> {
  const qs = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '12',
    q: query,
  });

  const res = await fetch(`${BASE}/api/yt/search?${qs.toString()}`);
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);

  const data = await res.json();
  return (data.items ?? []).map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url,
  }));
}
