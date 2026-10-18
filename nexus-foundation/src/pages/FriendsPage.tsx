import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface ProfileResult {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
}

interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: string
  requester: ProfileResult | null
  addressee: ProfileResult | null
}

export function FriendsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ProfileResult[]>([])
  const [searching, setSearching] = useState(false)
  const [friendships, setFriendships] = useState<FriendshipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  async function loadFriendships() {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('friendships')
      .select(
        'id, requester_id, addressee_id, status, requester:profiles!friendships_requester_id_fkey(id, display_name, username, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, display_name, username, avatar_url)'
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    if (error) setActionError(error.message)
    setFriendships((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadFriendships()
  }, [user])

  async function searchUsers(q: string) {
    setSearch(q)
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq('id', user?.id ?? '')
      .limit(10)
    setResults((data as any) ?? [])
    setSearching(false)
  }

  function statusFor(otherId: string) {
    return friendships.find((f) => f.requester_id === otherId || f.addressee_id === otherId)
  }

  async function sendRequest(otherId: string) {
    if (!user) return
    setActionError(null)
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: otherId, status: 'pending' })
    if (error) setActionError(error.message)
    loadFriendships()
  }

  async function acceptRequest(id: string) {
    setActionError(null)
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id)
    if (error) setActionError(error.message)
    loadFriendships()
  }

  async function removeFriendship(id: string) {
    setActionError(null)
    const { error } = await supabase.from('friendships').delete().eq('id', id)
    if (error) setActionError(error.message)
    loadFriendships()
  }

  async function messageFriend(otherId: string) {
    const { data, error } = await supabase.rpc('create_dm_conversation', { other_user_id: otherId })
    if (!error && data) navigate(`/messages/${data}`)
  }

  const incoming = friendships.filter((f) => f.status === 'pending' && f.addressee_id === user?.id)
  const outgoing = friendships.filter((f) => f.status === 'pending' && f.requester_id === user?.id)
  const friends = friendships.filter((f) => f.status === 'accepted')

  function otherOf(f: FriendshipRow): ProfileResult | null {
    return f.requester_id === user?.id ? f.addressee : f.requester
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-6">
      <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4">
        <input
          value={search}
          onChange={(e) => searchUsers(e.target.value)}
          placeholder="Tìm người để kết bạn…"
          className="w-full rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-indigo focus:ring-2 focus:ring-nexus-indigo/25"
        />
        {searching && <p className="mt-2 text-sm text-[var(--text-2)]">Đang tìm…</p>}

        <div className="mt-2 space-y-1">
          {results.map((r) => {
            const f = statusFor(r.id)
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-control px-2 py-2 hover:bg-[var(--surface-2)]">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
                    ?
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text)]">{r.display_name}</p>
                  <p className="truncate text-xs text-[var(--text-3)]">@{r.username}</p>
                </div>
                {!f && (
                  <button
                    onClick={() => sendRequest(r.id)}
                    className="rounded-control bg-nexus-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Kết bạn
                  </button>
                )}
                {f?.status === 'pending' && f.requester_id === user?.id && (
                  <span className="text-xs text-[var(--text-3)]">Đã gửi lời mời</span>
                )}
                {f?.status === 'pending' && f.addressee_id === user?.id && (
                  <span className="text-xs text-[var(--text-3)]">Họ đã mời bạn</span>
                )}
                {f?.status === 'accepted' && <span className="text-xs text-nexus-indigo">Bạn bè</span>}
              </div>
            )
          })}
        </div>
      </div>

      {actionError && <p className="text-sm text-nexus-coral">{actionError}</p>}
      {loading && <p className="text-[var(--text-2)]">Đang tải…</p>}

      {incoming.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-[var(--text)]">Lời mời kết bạn</h2>
          <div className="space-y-2">
            {incoming.map((f) => {
              const other = otherOf(f)
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-card border border-[var(--border)] bg-[var(--surface)] p-3">
                  {other?.avatar_url ? (
                    <img src={other.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
                      ?
                    </div>
                  )}
                  <p className="flex-1 text-sm font-medium text-[var(--text)]">{other?.display_name ?? 'Người dùng'}</p>
                  <button
                    onClick={() => acceptRequest(f.id)}
                    className="rounded-control bg-nexus-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Đồng ý
                  </button>
                  <button
                    onClick={() => removeFriendship(f.id)}
                    className="rounded-control border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-2)] hover:bg-[var(--surface-2)]"
                  >
                    Từ chối
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-[var(--text)]">Đã gửi lời mời</h2>
          <div className="space-y-2">
            {outgoing.map((f) => {
              const other = otherOf(f)
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-card border border-[var(--border)] bg-[var(--surface)] p-3">
                  {other?.avatar_url ? (
                    <img src={other.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
                      ?
                    </div>
                  )}
                  <p className="flex-1 text-sm font-medium text-[var(--text)]">{other?.display_name ?? 'Người dùng'}</p>
                  <button
                    onClick={() => removeFriendship(f.id)}
                    className="rounded-control border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-2)] hover:bg-[var(--surface-2)]"
                  >
                    Hủy lời mời
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold text-[var(--text)]">Bạn bè ({friends.length})</h2>
        {friends.length === 0 && <p className="text-sm text-[var(--text-2)]">Chưa có bạn bè nào.</p>}
        <div className="space-y-2">
          {friends.map((f) => {
            const other = otherOf(f)
            return (
              <div key={f.id} className="flex items-center gap-3 rounded-card border border-[var(--border)] bg-[var(--surface)] p-3">
                {other?.avatar_url ? (
                  <img src={other.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
                    ?
                  </div>
                )}
                <p className="flex-1 text-sm font-medium text-[var(--text)]">{other?.display_name ?? 'Người dùng'}</p>
                <button
                  onClick={() => other && messageFriend(other.id)}
                  className="rounded-control border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-2)] hover:bg-[var(--surface-2)]"
                >
                  Nhắn tin
                </button>
                <button
                  onClick={() => removeFriendship(f.id)}
                  className="rounded-control border border-[var(--border)] px-3 py-1.5 text-xs text-nexus-coral hover:bg-[var(--surface-2)]"
                >
                  Hủy kết bạn
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
