import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LandingPage() {
  const { session, loading } = useAuth()

  if (!loading && session) return <Navigate to="/home" replace />

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="bg-gradient-to-br from-nexus-blue to-nexus-purple bg-clip-text text-5xl font-bold text-transparent">
        Nexus
      </h1>
      <p className="max-w-md text-[var(--text-2)]">
        Bảng tin, tin nhắn, âm nhạc và video — tất cả trong một tài khoản.
      </p>
      <div className="flex gap-3">
        <Link
          to="/auth/signin"
          className="rounded-control border border-[var(--border)] px-5 py-2.5 font-medium hover:bg-[var(--surface-2)]"
        >
          Đăng nhập
        </Link>
        <Link
          to="/auth/signup"
          className="rounded-control bg-nexus-blue px-5 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          Bắt đầu
        </Link>
      </div>
    </div>
  )
}
