import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Supabase's client picks the OAuth code out of the URL automatically
 * (detectSessionInUrl: true in lib/supabase.ts). We just wait for the
 * session to land in the store, then move on.
 */
export function OAuthCallbackPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) navigate(session ? '/home' : '/auth/signin', { replace: true })
  }, [loading, session, navigate])

  return (
    <div className="flex h-screen items-center justify-center text-[var(--text-2)]">
      Đang hoàn tất đăng nhập…
    </div>
  )
}
