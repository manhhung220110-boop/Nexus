import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      setError(
        error.message.includes('Invalid login')
          ? 'Email hoặc mật khẩu không đúng.'
          : error.message
      )
      return
    }
    navigate('/home')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold text-[var(--text)]">Đăng nhập Nexus</h1>

      <button
        type="button"
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-control border border-[var(--border)] bg-[var(--surface)] py-2.5 font-medium hover:bg-[var(--surface-2)]"
      >
        <GoogleIcon /> Tiếp tục với Google
      </button>

      <div className="flex items-center gap-3 text-xs text-[var(--text-3)]">
        <div className="h-px flex-1 bg-[var(--border)]" />
        hoặc
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-blue focus:ring-2 focus:ring-nexus-blue/25"
      />
      <input
        type="password"
        required
        placeholder="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-blue focus:ring-2 focus:ring-nexus-blue/25"
      />

      {error && <p className="text-sm text-nexus-coral">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-control bg-nexus-blue py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>

      <p className="text-center text-sm text-[var(--text-2)]">
        Chưa có tài khoản?{' '}
        <Link to="/auth/signup" className="text-nexus-blue hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  )
}
