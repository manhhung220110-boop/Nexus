import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media: { type: string; url: string }[] | null
  created_at: string
  edited_at: string | null
  recalled_at: string | null
  sender: { display_name: string; avatar_url: string | null } | null
}

const QUICK_EMOJIS = ['😀', '😂', '😍', '👍', '🔥', '🎉', '😢', '😮', '🙏', '❤️', '👏', '🤔']

async function uploadChatMedia(userId: string, file: File) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/chat-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('post-media').upload(path, file)
  if (error) return null
  const { data } = supabase.storage.from('post-media').getPublicUrl(path)
  return { type: file.type.startsWith('video/') ? 'video' : 'image', url: data.publicUrl }
}

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [title, setTitle] = useState('Tin nhắn')
  const [subtitle, setSubtitle] = useState<string | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [reactionsByMsg, setReactionsByMsg] = useState<Record<string, { user_id: string; emoji: string }[]>>({})
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingChannelRef = useRef<any>(null)

  async function loadInfo() {
    if (!conversationId || !user) return
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('type, name')
      .eq('id', conversationId)
      .single()
    if (convErr) {
      setInfoError(convErr.message)
      return
    }
    if (conv?.type === 'group') {
      setTitle(conv.name ?? 'Nhóm')
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
      setSubtitle(`${members?.length ?? 0} thành viên`)
    } else {
      const { data: other, error: otherErr } = await supabase
        .from('conversation_members')
        .select('profiles(display_name)')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .maybeSingle()
      if (otherErr) setInfoError(otherErr.message)
      setTitle((other as any)?.profiles?.display_name ?? 'Người dùng')
      setSubtitle(null)
    }
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
  }

  async function loadMessages() {
    if (!conversationId) return
    setLoading(true)
    const { data: msgs } = await supabase
      .from('messages')
      .select(
        'id, conversation_id, sender_id, content, media, created_at, edited_at, recalled_at, sender:profiles!messages_sender_id_fkey(display_name, avatar_url)'
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages((msgs as any) ?? [])
    setLoading(false)

    const ids = ((msgs as any[]) ?? []).map((m) => m.id)
    if (ids.length > 0) {
      const { data: reacts } = await supabase.from('message_reactions').select('message_id, user_id, emoji').in('message_id', ids)
      const map: Record<string, { user_id: string; emoji: string }[]> = {}
      ;((reacts as any[]) ?? []).forEach((r) => {
        if (!map[r.message_id]) map[r.message_id] = []
        map[r.message_id].push({ user_id: r.user_id, emoji: r.emoji })
      })
      setReactionsByMsg(map)
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  useEffect(() => {
    loadInfo()
    loadMessages()
    if (!conversationId) return

    const msgChannel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          loadMessages()
        }
      )
      .subscribe()

    const typingChannel = supabase.channel(`typing:${conversationId}`)
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user_id !== user?.id) {
          setIsTyping(true)
          setTimeout(() => setIsTyping(false), 3000)
        }
      })
      .subscribe()
    typingChannelRef.current = typingChannel

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(typingChannel)
    }
  }, [conversationId])

  function broadcastTyping() {
    if (!typingChannelRef.current || !user) return
    typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id } })
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if ((!content.trim() && !file) || !user || !conversationId) return
    setSending(true)
    setSendError(null)

    let media: any[] = []
    if (file) {
      const m = await uploadChatMedia(user.id, file)
      if (m) media = [m]
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim() || null,
      media,
    })
    if (error) {
      setSendError(error.message)
    } else {
      setContent('')
      setFile(null)
    }
    setSending(false)
    loadMessages()
  }

  async function recallMessage(id: string) {
    if (!window.confirm('Thu hồi tin nhắn này cho tất cả mọi người?')) return
    const { error } = await supabase.rpc('recall_message', { p_message_id: id })
    if (error) alert('Không thu hồi được — có thể đã quá 60 phút kể từ lúc gửi. Thử "Xóa cho mình" thay thế.')
    loadMessages()
  }

  async function deleteForMe(id: string) {
    if (!user) return
    await supabase.from('message_hidden').insert({ message_id: id, user_id: user.id })
    loadMessages()
  }

  function startEdit(m: MessageRow) {
    setEditingId(m.id)
    setEditContent(m.content ?? '')
  }

  async function saveEdit(id: string) {
    await supabase.from('messages').update({ content: editContent, edited_at: new Date().toISOString() }).eq('id', id)
    setEditingId(null)
    loadMessages()
  }

  async function reactMessage(id: string, emoji: string) {
    if (!user) return
    const existing = reactionsByMsg[id]?.find((r) => r.user_id === user.id)
    if (existing?.emoji === emoji) {
      await supabase.from('message_reactions').delete().eq('message_id', id).eq('user_id', user.id)
    } else {
      await supabase
        .from('message_reactions')
        .upsert({ message_id: id, user_id: user.id, emoji }, { onConflict: 'message_id,user_id' })
    }
    loadMessages()
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col" style={{ minHeight: '70vh' }}>
      <div className="mb-3 flex items-center gap-3 border-b border-[var(--border)] pb-3">
        <Link to="/messages" className="text-[var(--text-2)] hover:text-nexus-cyan">
          ←
        </Link>
        <div>
          <p className="font-medium text-[var(--text)]">{title}</p>
          {subtitle && <p className="text-xs text-[var(--text-3)]">{subtitle}</p>}
          {isTyping && <p className="text-xs text-nexus-cyan">Đang nhập…</p>}
          {infoError && <p className="text-xs text-nexus-coral">{infoError}</p>}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {loading && <p className="text-[var(--text-2)]">Đang tải…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-[var(--text-2)]">Chưa có tin nhắn — nói lời chào nhé 👋</p>
        )}

        {messages.map((m) => {
          const isMine = m.sender_id === user?.id
          const isEditing = editingId === m.id
          const myReaction = user ? reactionsByMsg[m.id]?.find((r) => r.user_id === user.id) : undefined

          return (
            <div key={m.id} className={isMine ? 'flex justify-end' : 'flex justify-start'}>
              <div className="max-w-[75%]">
                {!isMine && (
                  <p className="mb-0.5 text-xs text-[var(--text-3)]">{m.sender?.display_name ?? 'Người dùng'}</p>
                )}

                {m.recalled_at ? (
                  <p className="rounded-control bg-[var(--surface-2)] px-3 py-1.5 text-sm italic text-[var(--text-3)]">
                    Tin nhắn đã bị thu hồi
                  </p>
                ) : isEditing ? (
                  <div className="space-y-1">
                    <input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full rounded-control border border-[var(--border)] px-2 py-1 text-sm"
                    />
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => saveEdit(m.id)} className="font-medium text-nexus-cyan">
                        Lưu
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-[var(--text-2)]">
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={
                      isMine
                        ? 'rounded-control rounded-br-sm bg-nexus-cyan px-3 py-2 text-white'
                        : 'rounded-control rounded-bl-sm bg-[var(--surface-2)] px-3 py-2 text-[var(--text)]'
                    }
                  >
                    {m.content && (
                      <p className="whitespace-pre-wrap text-sm">
                        {m.content}
                        {m.edited_at && <span className="ml-1 text-xs opacity-70">(đã sửa)</span>}
                      </p>
                    )}
                    {m.media?.[0]?.url &&
                      (m.media[0].type === 'video' ? (
                        <video src={m.media[0].url} controls className="mt-1 max-h-60 rounded-control" />
                      ) : (
                        <img src={m.media[0].url} alt="" className="mt-1 max-h-60 rounded-control object-cover" />
                      ))}
                  </div>
                )}

                {!m.recalled_at && !isEditing && (
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-3)]">
                    <span>{new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    {QUICK_EMOJIS.slice(0, 4).map((e) => (
                      <button
                        key={e}
                        onClick={() => reactMessage(m.id, e)}
                        className={myReaction?.emoji === e ? 'opacity-100' : 'opacity-40 hover:opacity-100'}
                      >
                        {e}
                      </button>
                    ))}
                    {isMine && (
                      <>
                        <button onClick={() => startEdit(m)} className="hover:text-nexus-cyan">
                          Sửa
                        </button>
                        <button onClick={() => recallMessage(m.id)} className="hover:text-nexus-coral">
                          Thu hồi
                        </button>
                      </>
                    )}
                    <button onClick={() => deleteForMe(m.id)} className="hover:text-nexus-coral">
                      Xóa cho mình
                    </button>
                  </div>
                )}

                {reactionsByMsg[m.id]?.length > 0 && (
                  <p className="mt-0.5 text-xs text-[var(--text-2)]">
                    {Object.entries(
                      reactionsByMsg[m.id].reduce((acc: Record<string, number>, r) => {
                        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
                        return acc
                      }, {})
                    )
                      .map(([e, n]) => `${e}${n}`)
                      .join(' ')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-3 border-t border-[var(--border)] pt-3">
        {emojiOpen && (
          <div className="mb-2 flex flex-wrap gap-1 rounded-control border border-[var(--border)] p-2">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setContent((c) => c + e)}
                className="rounded-control px-1.5 py-0.5 text-lg hover:bg-[var(--surface-2)]"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        {sendError && <p className="mb-2 text-xs text-nexus-coral">{sendError}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            className="rounded-control border border-[var(--border)] px-2 py-2 text-sm hover:bg-[var(--surface-2)]"
          >
            😊
          </button>
          <label className="cursor-pointer rounded-control border border-[var(--border)] px-2 py-2 text-sm hover:bg-[var(--surface-2)]">
            📎
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          <input
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              broadcastTyping()
            }}
            placeholder="Nhắn tin…"
            className="flex-1 rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-cyan focus:ring-2 focus:ring-nexus-cyan/25"
          />
          <button
            type="submit"
            disabled={sending || (!content.trim() && !file)}
            className="rounded-control bg-nexus-cyan px-4 py-2.5 font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            Gửi
          </button>
        </div>
        {file && <p className="mt-1 text-xs text-[var(--text-3)]">Đã chọn: {file.name}</p>}
      </form>
    </div>
  )
}
