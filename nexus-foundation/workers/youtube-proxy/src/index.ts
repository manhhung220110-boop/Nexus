export interface Env {
  YT_API_KEY: string // set with: wrangler secret put YT_API_KEY
  ALLOWED_ORIGIN: string // e.g. https://nexus.pages.dev
}

const ALLOWED_PATHS = new Set([
  'search',
  'videos',
  'channels',
  'playlistItems',
  'playlists',
  'commentThreads',
])

function corsHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(env.ALLOWED_ORIGIN)

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    const url = new URL(req.url)
    // expects /api/yt/<endpoint>?...
    const endpoint = url.pathname.replace(/^\/api\/yt\//, '')

    if (!ALLOWED_PATHS.has(endpoint)) {
      return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
        status: 404,
        headers: { 'content-type': 'application/json', ...cors },
      })
    }

    const qs = new URLSearchParams(url.search)
    qs.set('key', env.YT_API_KEY)

    const upstream = `https://www.googleapis.com/youtube/v3/${endpoint}?${qs.toString()}`

    const res = await fetch(upstream, {
      cf: { cacheTtl: 60, cacheEverything: true },
    })

    return new Response(res.body, {
      status: res.status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=60',
        ...cors,
      },
    })
  },
}
