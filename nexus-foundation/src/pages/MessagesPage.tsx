import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface ConvListItem {
  id: string
  type: string
  name: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unread: boolean
  otherName: string | null
  otherAvatar: string | null
}

interface ProfileResult {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
}

export function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ConvListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ProfileResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState<ProfileResult[]>([])

  async function loadConversations() {
    if (!user) return
    setLoading(true)

    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at, conversations(id, type, name, last_message_at)')
      .eq('user_id', user.id)
      .is('deleted_at', null)

    const rows = (memberships as any) ?? []
    const convIds = rows.map((r: any) => r.conversation_id)

    if (convIds.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    const { data: others } = await supabase
      .from('conversation_members')
      .select('conversation_id, user_id, profiles(display_name, avatar_url)')
      .in('conversation_id', convIds)
      .neq('user_id', user.id)

    const othersMap: Record<string, any> = {}
    ;((others as any[]) ?? []).forEach((o) => {
      othersMap[o.conversation_id] = o.profiles
    })

    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at, sender_id')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    const lastMsgMap: Record<string, any> = {}
    ;((msgs as any[]) ?? []).forEach((m) => {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m
    })

    const list: ConvListItem[] = rows.map((r: any) => {
      const conv = r.conversations
      const last = lastMsgMap[r.conversation_id]
      const other = othersMap[r.conversation_id]
      const unread =
        last &&
        last.sender_id !== user.id &&
        (!r.last_read_at || new Date(last.created_at) > new Date(r.last_read_at))
      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        lastMessage: last?.content ?? null,
        lastMessageAt: last?.created_at ?? conv.last_message_at,
        unread: !!unread,
        otherName: other?.display_name ?? null,
        otherAvatar: other?.avatar_url ?? null,
      }
    })

    list.sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime())
    setConversations(list)
    setLoading(false)
  }

  useEffect(() => {
    loadConversations()
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

  async function startDM(otherUserId: string) {
    const { data, error } = await supabase.rpc('create_dm_conversation', { other_user_id: otherUserId })
    if (error) {
      alert(error.message)
      return
    }
    if (!error && data) navigate(`/messages/${data}`)
  }

  function toggleGroupMember(p: ProfileResult) {
    setGroupMembers((prev) => (prev.some((m) => m.id === p.id) ? prev.filter((m) => m.id !== p.id) : [...prev, p]))
  }

  async function createGroup() {
    if (!groupName.trim() || groupMembers.length === 0) return
    const { data, error } = await supabase.rpc('create_group_conversation', {
      group_name: groupName.trim(),
      member_ids: groupMembers.map((m) => m.id),
    })
    if (error) {
      alert(error.message)
      return
    }
    if (!error && data) navigate(`/messages/${data}`)
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4">
        <input
          value={search}
          onChange={(e) => searchUsers(e.target.value)}
          placeholder="Tìm người để nhắn tin…"
          className="w-full rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-cyan focus:ring-2 focus:ring-nexus-cyan/25"
        />
        {searching && <p className="mt-2 text-sm text-[var(--text-2)]">Đang tìm…</p>}

        {results.length > 0 && (
          <div className="mt-2 space-y-1">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => startDM(r.id)}
                className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left hover:bg-[var(--surface-2)]"
              >
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
                    ?
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{r.display_name}</p>
                  <p className="text-xs text-[var(--text-3)]">@{r.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowNewGroup((s) => !s)}
          className="mt-3 text-sm font-medium text-nexus-cyan hover:underline"
        >
          {showNewGroup ? 'Đóng tạo nhóm' : '+ Tạo nhóm chat'}
        </button>

        {showNewGroup && (
          <div className="mt-2 space-y-2 border-t border-[var(--border)] pt-2">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Tên nhóm"
              className="w-full rounded-control border border-[var(--border)] px-3.5 py-2 text-sm outline-none focus:border-nexus-cyan"
            />
            {groupMembers.length > 0 && (
              <p className="text-xs text-[var(--text-2)]">
                Thành viên: {groupMembers.map((m) => m.display_name).join(', ')}
              </p>
            )}
            <p className="text-xs text-[var(--text-3)]">Tìm tên ở ô phía trên, bấm vào người để thêm vào nhóm:</p>
            <div className="flex flex-wrap gap-1">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => toggleGroupMember(r)}
                  className={
                    groupMembers.some((m) => m.id === r.id)
                      ? 'rounded-control bg-nexus-cyan/10 px-2 py-1 text-xs text-nexus-cyan'
                      : 'rounded-control border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-2)]'
                  }
                >
                  {r.display_name}
                </button>
              ))}
            </div>
            <button
              onClick={createGroup}
              disabled={!groupName.trim() || groupMembers.length === 0}
              className="rounded-control bg-nexus-cyan px-4 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              Tạo nhóm
            </button>
          </div>
        )}
      </div>

      {loading && <p className="text-[var(--text-2)]">Đang tải…</p>}
      {!loading && conversations.length === 0 && (
        <p className="text-[var(--text-2)]">Chưa có cuộc trò chuyện nào — tìm người ở trên để bắt đầu.</p>
      )}

      <div className="space-y-1">
        {conversations.map((c) => (
          <Link
            key={c.id}
            to={`/messages/${c.id}`}
            className="flex items-center gap-3 rounded-card border border-[var(--border)] bg-[var(--surface)] p-3 hover:bg-[var(--surface-2)]"
          >
            {c.type === 'dm' ? (
              c.otherAvatar ? (
                <img src={c.otherAvatar} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
                  ?
                </div>
              )
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-nexus-cyan/10 text-nexus-cyan">
                👥
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p
                className={
                  c.unread ? 'truncate font-semibold text-[var(--text)]' : 'truncate font-medium text-[var(--text)]'
                }
              >
                {c.type === 'dm' ? c.otherName ?? 'Người dùng' : c.name ?? 'Nhóm'}
              </p>
              <p className="truncate text-sm text-[var(--text-2)]">{c.lastMessage ?? 'Chưa có tin nhắn'}</p>
            </div>
            {c.unread && <span className="h-2.5 w-2.5 rounded-full bg-nexus-cyan" />}
          </Link>
        ))}
      </div>
    </div>
  )
}
