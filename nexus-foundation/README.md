# Nexus — Phase 1 Foundation

This is the first slice of the full spec: project skeleton, database schema
+ row-level security, email/password + Google auth, and a Cloudflare Worker
that keeps the YouTube key off the client. Feed, chat, music playback, and
watch pages come next, in that order.

**⚠️ Rotate your YouTube key first.** The key from your spec
(`AIzaSyARQq2...`) was pasted in plain text in this chat, which means it's
no longer private. Before shipping anything, go to Google Cloud Console →
APIs & Services → Credentials, either regenerate the key or lock it down
hard: Application restrictions → HTTP referrers (your domain only), API
restrictions → YouTube Data API v3 only. Never put it in `.env` — it only
ever lives as a Worker secret (see step 4).

## 1. Supabase

Your project is already live: `https://kljmklegdxlvzyrohzhz.supabase.co`.

1. SQL Editor → run `supabase/migrations/0001_init.sql`, then
   `supabase/migrations/0002_rls.sql`.
2. Authentication → Providers → enable **Email** (should be on by default).
3. Settings → API → copy the **Project URL** and **anon public** key into
   your local `.env` (copy `.env.example` → `.env` first).

## 2. Google OAuth (the screen you had open)

On the "Create OAuth client ID" screen:

- **Application type:** Web application (already correct)
- **Name:** anything internal, e.g. `Nexus Web`
- **Authorized JavaScript origins:** add `http://localhost:5173` for dev,
  and your future Cloudflare Pages domain (e.g. `https://nexus.pages.dev`)
- **Authorized redirect URIs** (shown after you add an origin):
  `https://kljmklegdxlvzyrohzhz.supabase.co/auth/v1/callback` — this comes
  straight from your Supabase project URL, it's not a placeholder.

Then: copy the generated **Client ID** and **Client secret** into Supabase
→ Authentication → Providers → Google, and toggle it on.

## 3. Spotify (the screen you had open)

- **Tên ứng dụng:** `Nexus`
- **Mô tả ứng dụng:** one line, e.g. "Unified social/music/video app"
- **Trang web:** optional, leave blank for now
- **URI chuyển hướng:** add both
  `http://127.0.0.1:5173/spotify/callback` (dev — Spotify requires
  `127.0.0.1`, not `localhost`) and your prod callback later, then press
  "Thêm vào" for each
- **APIs/SDKs:** check only **API web** and **Bộ công cụ phát lại trên
  web** (Web Playback SDK) — leave iOS/Android/Ads unchecked
- Accept the terms box, press **Lưu**

Copy the app's **Client ID** into `.env` as `VITE_SPOTIFY_CLIENT_ID`. No
client secret is needed — `src/lib/spotify.ts` uses the PKCE flow, which
is built for browser apps and doesn't require one.

## 4. Cloudflare

**Worker (YouTube proxy)** — from your terminal, not the dashboard:

```bash
cd workers/youtube-proxy
wrangler login
wrangler secret put YT_API_KEY     # paste the (rotated) key when prompted
wrangler deploy --env production
```

Copy the deployed Worker URL into `VITE_YOUTUBE_PROXY_URL`.

**Pages (the frontend)** — from the Cloudflare dashboard home you had
open: search (`Ctrl/Cmd+K`) for **Workers & Pages** → Create → Pages →
Connect to Git → point at this repo. Build command `npm run build`,
output directory `dist`. Add the four `VITE_*` variables from your `.env`
as Pages environment variables (Settings → Environment variables).

## 5. Run it locally

```bash
npm install
cp .env.example .env   # fill in the real values from steps 1–3
npm run dev
```

## What's built vs. what's next

| Done | Not yet (next phases) |
|---|---|
| Email + Google sign-in/up | Feed, posts, reactions, comments |
| Full DB schema + RLS (profiles, posts, chat, notifications) | 1:1 / group chat UI + realtime |
| Responsive 3-column app shell | Spotify browse/playback UI |
| YouTube key hidden behind a Worker | YouTube watch/search pages |
| | Stories, groups, pages |
| | PWA manifest + service worker |

Say the word and we keep going module by module — feed next, or chat, or
music, your call.
