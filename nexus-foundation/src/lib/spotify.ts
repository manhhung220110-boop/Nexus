/**
 * Spotify Authorization Code + PKCE flow.
 * This flow is designed for public clients (SPAs) — no client secret required,
 * and the token exchange call is CORS-enabled by Spotify, so it can run
 * entirely in the browser.
 */

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string
const VERIFIER_KEY = 'nexus_spotify_pkce_verifier'

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'user-library-modify',
  'user-read-playback-state',
  'user-modify-playback-state',
  'streaming',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
].join(' ')

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(input)
  return crypto.subtle.digest('SHA-256', data)
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  bytes.forEach((b) => (str += String.fromCharCode(b)))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Step 1: redirect the user to Spotify's consent screen. */
export async function startSpotifyLogin() {
  const verifier = randomString(64)
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  const challenge = base64UrlEncode(await sha256(verifier))

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
}

/** Step 2: on /spotify/callback, exchange the ?code= for tokens. */
export async function completeSpotifyLogin(code: string) {
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) throw new Error('Missing PKCE verifier — restart the Spotify login.')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`)
  sessionStorage.removeItem(VERIFIER_KEY)

  // { access_token, token_type, scope, expires_in, refresh_token }
  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    scope: string
  }>
}
const TOKEN_KEY = 'nexus_spotify_access_token';
const TOKEN_EXPIRY_KEY = 'nexus_spotify_token_expiry';

export function saveSpotifyToken(accessToken: string, expiresIn: number) {
  sessionStorage.setItem(TOKEN_KEY, accessToken);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
}

export function getSpotifyAccessToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) ?? 0);
  if (!token || Date.now() > expiry) return null;
  return token;
}

export function isSpotifyConnected(): boolean {
  return getSpotifyAccessToken() !== null;
}

export interface SpotifyTrackSummary {
  id: string;
  name: string;
  artists: string;
  albumImage: string;
}

export align async function searchTracks(query: string): Promise<SpotifyTrackSummary[]> {
  const token = getSpotifyAccessToken();
  if (!token) throw new Error('Chưa kết nối Spotify');

  const qs = new URLSearchParams({
    q: query,
    type: 'track',
    limit: '10',
  });

  const res = await fetch(`https://spotify.com{qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);

  const data = await res.json();
  return (data.tracks?.items ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    artists: t.artists.map((a: any) => a.name).join(', '),
    albumImage: t.album.images?.[1]?.url ?? t.album.images?.[0]?.url,
  }));
}
