import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function SignUpForm() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setError('Tên người dùng: 3–20 ký tự, chữ thường/số/gạch dưới.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-sm space-y-2 text-center">
        <h1 className="text-xl font-semibold">Kiểm tra email của bạn</h1>
        <p className="text-[var(--text-2)]">
          Chúng tôi đã gửi một liên kết xác nhận đến {email}.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Tạo tài khoản Nexus</h1>

      <input
        required
        placeholder="Họ và tên"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-blue focus:ring-2 focus:ring-nexus-blue/25"
      />
      <input
        required
        placeholder="tenkhoản (chữ thường, không dấu cách)"
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase())}
        className="w-full rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-blue focus:ring-2 focus:ring-nexus-blue/25"
      />
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
        minLength={8}
        placeholder="Mật khẩu (tối thiểu 8 ký tự)"
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
        {submitting ? 'Đang tạo…' : 'Đăng ký'}
      </button>

      <p className="text-center text-sm text-[var(--text-2)]">
        Đã có tài khoản?{' '}
        <Link to="/auth/signin" className="text-nexus-blue hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  )
}
