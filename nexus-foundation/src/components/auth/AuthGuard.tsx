import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-[var(--text-2)]">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth/signin" replace />
  }

  return <>{children}</>
}
