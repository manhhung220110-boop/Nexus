import { Outlet, Link } from 'react-router-dom'
import { Home, MessageCircle, Music, Play, Settings, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { disconnectSpotify } from '../../lib/spotify'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  { to: '/home', label: 'Bảng tin', icon: Home },
  { to: '/messages', label: 'Tin nhắn', icon: MessageCircle },
  { to: '/music', label: 'Âm nhạc', icon: Music },
  { to: '/watch', label: 'Video', icon: Play },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
]

export function AppShell() {
  const { user } = useAuth()

  return (
    <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_1fr_320px]">
      {/* Top bar */}
      <header className="col-span-full sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur">
        <span className="bg-gradient-to-br from-nexus-blue to-nexus-purple bg-clip-text text-xl font-bold text-transparent">
          Nexus
        </span>
        <div className="flex items-center gap-3 text-sm text-[var(--text-2)]">
          {user?.email}
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1 rounded-control border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-2)]"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </header>

      {/* Left sidebar */}
      <aside className="hidden border-r border-[var(--border)] p-3 lg:block">
        <nav className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-control px-3 py-2.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            >
              <Icon size={20} /> {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="min-w-0 px-4 py-6">
        <Outlet />
      </main>

      {/* Right sidebar */}
      <aside className="hidden border-l border-[var(--border)] p-3 xl:block">
        <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-2)]">
          Bạn bè đang online, gợi ý kết bạn, và nhạc đang phát sẽ nằm ở đây (giai đoạn 2).
        </div>
      </aside>
    </div>
  )
}
