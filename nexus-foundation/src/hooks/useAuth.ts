import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/** Call once near the app root. Keeps the auth store in sync with Supabase. */
export function useAuthListener() {
  const setSession = useAuthStore((s) => s.setSession)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [setSession, setLoading])
}

export function useAuth() {
  return useAuthStore((s) => ({ session: s.session, user: s.user, loading: s.loading }))
}
