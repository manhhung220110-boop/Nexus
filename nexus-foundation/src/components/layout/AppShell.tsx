import { Outlet, Link } from 'react-router-dom'
import { Home, MessageCircle, Music, Play, Settings, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { disconnectSpotify } from '../../lib/spotify'

const NAV = [
  { to: '/home', label: 'Bảng tin', icon: Home },
  { to: '/messages', label: 'Tin nhắn', icon: MessageCircle },
  { to: '/music', label: 'Âm nhạc', icon: Music },
  { to: '/watch', label: 'Video', icon: Play },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
]

export function AppShell() {
  const { user } = useAuth()

  function handleSignOut() {
    disconnectSpotify()
    supabase.auth.signOut()
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 pb-16 lg:grid-cols-[260px_1fr_320px] lg:pb-0">
      <header className="col-span-full sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur">
        <span className="bg-gradient-to-br from-nexus-blue to-nexus-purple bg-clip-text text-xl font-bold text-transparent">
          Nexus
        </span>
        <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
          <span className="hidden sm:inline">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 whitespace-nowrap rounded-control border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-2)]"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <aside className="hidden border-r border-[var(--border)] p-3 lg:block">
        <nav className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-control px-3 py-2.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 px-4 py-6">
        <Outlet />
      </main>

      <aside className="hidden border-l border-[var(--border)] p-3 xl:block">
        <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-2)]">
          Bạn bè đang online, gợi ý kết bạn, và nhạc đang phát sẽ nằm ở đây (giai đoạn 2).
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--surface)] lg:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-[var(--text-2)]"
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
