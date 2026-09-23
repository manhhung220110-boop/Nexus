import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getTheme, setTheme } from '../lib/theme'
import { isSpotifyConnected, startSpotifyLogin, disconnectSpotify } from '../lib/spotify'

export function SettingsPage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [theme, setThemeState] = useState(getTheme())
  const [spotifyConnected, setSpotifyConnected] = useState(isSpotifyConnected())

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('display_name, bio, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? '')
          setBio(data.bio ?? '')
          setAvatarUrl(data.avatar_url ?? null)
        }
        setLoading(false)
      })
  }, [user])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
      setAvatarUrl(data.publicUrl)
    }
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    await supabase.from('profiles').update({ display_name: displayName, bio }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
  }

  function toggleTheme(next: 'light' | 'dark') {
    setTheme(next)
    setThemeState(next)
  }

  function handleSpotifyToggle() {
    if (spotifyConnected) {
      disconnectSpotify()
      setSpotifyConnected(false)
    } else {
      startSpotifyLogin()
    }
  }

  if (loading) return <p className="text-[var(--text-2)]">Đang tải…</p>

  return (
    <div className="mx-auto max-w-[560px] space-y-6">
      <section className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-semibold text-[var(--text)]">Ảnh đại diện</h2>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
              ?
            </div>
          )}
          <label className="cursor-pointer rounded-control border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]">
            {uploading ? 'Đang tải lên…' : 'Đổi ảnh'}
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>
      </section>

      <section className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-semibold text-[var(--text)]">Hồ sơ</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-[var(--text-2)]">Email</label>
            <input
              disabled
              value={user?.email ?? ''}
              className="w-full rounded-control border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[var(--text-2)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--text-2)]">Tên hiển thị</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-blue focus:ring-2 focus:ring-nexus-blue/25"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--text-2)]">Tiểu sử</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              className="w-full rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-blue focus:ring-2 focus:ring-nexus-blue/25"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-control bg-nexus-blue px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
          {saved && <span className="ml-3 text-sm text-nexus-green">Đã lưu.</span>}
        </form>
      </section>

      <section className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-semibold text-[var(--text)]">Giao diện</h2>
        <div className="flex gap-2">
          <button
            onClick={() => toggleTheme('light')}
            className={
              theme === 'light'
                ? 'rounded-control border border-nexus-blue bg-nexus-blue/10 px-4 py-2 text-nexus-blue'
                : 'rounded-control border border-[var(--border)] px-4 py-2 text-[var(--text-2)]'
            }
          >
            Sáng
          </button>
          <button
            onClick={() => toggleTheme('dark')}
            className={
              theme === 'dark'
                ? 'rounded-control border border-nexus-blue bg-nexus-blue/10 px-4 py-2 text-nexus-blue'
                : 'rounded-control border border-[var(--border)] px-4 py-2 text-[var(--text-2)]'
            }
          >
            Tối
          </button>
        </div>
      </section>

      <section className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-semibold text-[var(--text)]">Tài khoản kết nối</h2>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text)]">Spotify</span>
          <button
            onClick={handleSpotifyToggle}
            className={
              spotifyConnected
                ? 'rounded-control border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-2)]'
                : 'rounded-control bg-nexus-green px-4 py-2 text-sm font-medium text-white hover:bg-green-600'
            }
          >
            {spotifyConnected ? 'Ngắt kết nối' : 'Kết nối'}
          </button>
        </div>
      </section>
    </div>
  )
}
