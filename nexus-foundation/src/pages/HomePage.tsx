import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface PostMedia {
  type: string
  url: string
}

interface CommentRow {
  id: string
  content: string
  created_at: string
  author_id: string
  author: { display_name: string; avatar_url: string | null } | null
}

interface PostRow {
  id: string
  content: string
  created_at: string
  author_id: string
  media: PostMedia[] | null
  visibility: string
  author: { display_name: string; avatar_url: string | null } | null
  post_reactions: { user_id: string; type: string }[]
  comments: { id: string }[]
  saves: { user_id: string }[]
}

const REACTIONS = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'haha', emoji: '😆' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
  { type: 'angry', emoji: '😡' },
]

export function HomePage() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [file, setFile] = useState<File | null>(null)
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentRow[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  async function loadFeed() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, content, created_at, author_id, media, visibility, author:profiles!posts_author_id_fkey(display_name, avatar_url), post_reactions(user_id, type), comments(id), saves(user_id)'
      )
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) {
      setError('Không tải được bảng tin.')
    } else {
      setPosts((data as any) ?? [])
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFeed()
  }, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if ((!content.trim() && !file) || !user) return
    setPosting(true)

    let media: PostMedia[] = []
    if (file) {
      setUploading(true)
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('post-media').upload(path, file)
      if (!uploadError) {
        const { data } = supabase.storage.from('post-media').getPublicUrl(path)
        media = [{ type: 'image', url: data.publicUrl }]
      }
      setUploading(false)
    }

    const { error } = await supabase.from('posts').insert({ author_id: user.id, content, media, visibility })
    setPosting(false)
    if (!error) {
      setContent('')
      setFile(null)
      setVisibility('public')
      loadFeed()
    }
  }

  async function deletePost(postId: string) {
    if (!window.confirm('Xóa bài viết này? Không thể hoàn tác.')) return
    await supabase.from('posts').delete().eq('id', postId)
    loadFeed()
  }

  function startEdit(post: PostRow) {
    setEditingId(post.id)
    setEditContent(post.content)
  }

  async function saveEdit(postId: string) {
    await supabase.from('posts').update({ content: editContent }).eq('id', postId)
    setEditingId(null)
    loadFeed()
  }

  async function react(post: PostRow, type: string) {
    if (!user) return
    const mine = post.post_reactions.find((r) => r.user_id === user.id)
    if (mine && mine.type === type) {
      await supabase.from('post_reactions').delete().eq('post_id', post.id).eq('user_id', user.id)
    } else {
      await supabase.from('post_reactions').upsert(
        { post_id: post.id, user_id: user.id, type },
        { onConflict: 'post_id,user_id' }
      )
    }
    loadFeed()
  }

  async function toggleSave(post: PostRow) {
    if (!user) return
    const saved = post.saves.some((s) => s.user_id === user.id)
    if (saved) {
      await supabase.from('saves').delete().eq('post_id', post.id).eq('user_id', user.id)
    } else {
      await supabase.from('saves').insert({ post_id: post.id, user_id: user.id })
    }
    loadFeed()
  }

  async function sharePost(post: PostRow) {
    const text = `${post.content ?? ''}\n\n— chia sẻ từ Nexus`
    try {
      await navigator.clipboard.writeText(text)
      alert('Đã sao chép nội dung bài viết.')
    } catch {
      alert('Không sao chép được, trình duyệt chặn quyền clipboard.')
    }
  }

  async function reportPost(postId: string) {
    if (!user) return
    const reason = window.prompt('Lý do báo cáo bài viết này?')
    if (!reason) return
    await supabase.from('reports').insert({ reporter_id: user.id, target_type: 'post', target_id: postId, reason })
    alert('Đã gửi báo cáo, cảm ơn bạn.')
  }

  async function toggleComments(postId: string) {
    const isOpen = expanded[postId]
    setExpanded((prev) => ({ ...prev, [postId]: !isOpen }))
    if (!isOpen && !commentsByPost[postId]) {
      const { data } = await supabase
        .from('comments')
        .select('id, content, created_at, author_id, author:profiles!comments_author_id_fkey(display_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      setCommentsByPost((prev) => ({ ...prev, [postId]: (data as any) ?? [] }))
    }
  }

  async function addComment(postId: string) {
    const text = commentDrafts[postId]?.trim()
    if (!text || !user) return
    await supabase.from('comments').insert({ post_id: postId, author_id: user.id, content: text })
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, author_id, author:profiles!comments_author_id_fkey(display_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setCommentsByPost((prev) => ({ ...prev, [postId]: (data as any) ?? [] }))
    loadFeed()
  }

  function reactionCounts(reactions: { type: string }[]) {
    const counts: Record<string, number> = {}
    reactions.forEach((r) => {
      counts[r.type] = (counts[r.type] ?? 0) + 1
    })
    return counts
  }

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      <form onSubmit={handlePost} className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Bạn đang nghĩ gì?"
          rows={3}
          className="w-full resize-none rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-indigo focus:ring-2 focus:ring-nexus-indigo/25"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer text-sm text-[var(--text-2)] hover:text-nexus-indigo">
              📷 {file ? file.name : 'Thêm ảnh'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="rounded-control border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text-2)]"
            >
              <option value="public">🌍 Công khai</option>
              <option value="friends">👥 Bạn bè</option>
              <option value="private">🔒 Chỉ mình tôi</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={posting || uploading || (!content.trim() && !file)}
            className="rounded-control bg-nexus-indigo px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Đang tải ảnh…' : posting ? 'Đang đăng…' : 'Đăng'}
          </button>
        </div>
      </form>

      {loading && <p className="text-[var(--text-2)]">Đang tải…</p>}
      {error && <p className="text-nexus-coral">{error}</p>}
      {!loading && posts.length === 0 && (
        <p className="text-[var(--text-2)]">Chưa có bài viết nào — đăng bài đầu tiên đi.</p>
      )}

      {posts.map((post) => {
        const myReaction = user ? post.post_reactions.find((r) => r.user_id === user.id) : undefined
        const counts = reactionCounts(post.post_reactions)
        const totalReactions = post.post_reactions.length
        const saved = user ? post.saves.some((s) => s.user_id === user.id) : false
        const isAuthor = user?.id === post.author_id
        const isEditing = editingId === post.id

        return (
          <div key={post.id} className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {post.author?.avatar_url ? (
                  <img src={post.author.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
                    ?
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--text)]">{post.author?.display_name ?? 'Người dùng'}</p>
                  <p className="text-xs text-[var(--text-3)]">
                    {new Date(post.created_at).toLocaleString('vi-VN')} ·{' '}
                    {post.visibility === 'public' ? '🌍' : post.visibility === 'friends' ? '👥' : '🔒'}
                  </p>
                </div>
              </div>
              {isAuthor && !isEditing && (
                <div className="flex gap-2 text-sm">
                  <button onClick={() => startEdit(post)} className="text-[var(--text-2)] hover:text-nexus-indigo">
                    Sửa
                  </button>
                  <button onClick={() => deletePost(post.id)} className="text-nexus-coral hover:underline">
                    Xóa
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-control border border-[var(--border)] px-3.5 py-2.5 outline-none focus:border-nexus-indigo focus:ring-2 focus:ring-nexus-indigo/25"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(post.id)}
                    className="rounded-control bg-nexus-indigo px-4 py-1.5 text-sm text-white hover:bg-indigo-700"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-control border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-2)]"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <>
                {post.content && <p className="whitespace-pre-wrap text-[var(--text)]">{post.content}</p>}
                {post.media?.[0]?.url && (
                  <img
                    src={post.media[0].url}
                    alt=""
                    className="mt-3 max-h-[420px] w-full rounded-control object-cover"
                  />
                )}
              </>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-[var(--border)] pt-3">
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => react(post, r.type)}
                  title={r.type}
                  className={
                    myReaction?.type === r.type
                      ? 'rounded-control bg-nexus-indigo/10 px-2 py-1 text-lg'
                      : 'rounded-control px-2 py-1 text-lg opacity-70 hover:opacity-100 hover:bg-[var(--surface-2)]'
                  }
                >
                  {r.emoji}
                </button>
              ))}
              {totalReactions > 0 && (
                <span className="ml-1 text-sm text-[var(--text-2)]">
                  {Object.entries(counts)
                    .map(([type, n]) => `${REACTIONS.find((r) => r.type === type)?.emoji}${n}`)
                    .join(' ')}
                </span>
              )}
              <button
                onClick={() => toggleComments(post.id)}
                className="ml-3 rounded-control px-3 py-1.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              >
                💬 Bình luận {post.comments.length > 0 && `(${post.comments.length})`}
              </button>
              <button
                onClick={() => sharePost(post)}
                className="rounded-control px-3 py-1.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              >
                ↗ Chia sẻ
              </button>
              <button
                onClick={() => toggleSave(post)}
                className={
                  saved
                    ? 'rounded-control bg-nexus-indigo/10 px-3 py-1.5 text-sm text-nexus-indigo'
                    : 'rounded-control px-3 py-1.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]'
                }
              >
                🔖 {saved ? 'Đã lưu' : 'Lưu'}
              </button>
              {!isAuthor && (
                <button
                  onClick={() => reportPost(post.id)}
                  className="rounded-control px-3 py-1.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]"
                >
                  ⚑ Báo cáo
                </button>
              )}
            </div>

            {expanded[post.id] && (
              <div className="mt-3 space-y-3 border-t border-[var(--border)] pt-3">
                {(commentsByPost[post.id] ?? []).map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    {c.author?.avatar_url ? (
                      <img src={c.author.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs text-[var(--text-3)]">
                        ?
                      </div>
                    )}
                    <div className="rounded-control bg-[var(--surface-2)] px-3 py-1.5">
                      <p className="text-xs font-medium text-[var(--text)]">{c.author?.display_name ?? 'Người dùng'}</p>
                      <p className="text-sm text-[var(--text)]">{c.content}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={commentDrafts[post.id] ?? ''}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                    placeholder="Viết bình luận…"
                    className="flex-1 rounded-control border border-[var(--border)] px-3 py-1.5 text-sm outline-none focus:border-nexus-indigo focus:ring-2 focus:ring-nexus-indigo/25"
                  />
                  <button
                    onClick={() => addComment(post.id)}
                    className="rounded-control bg-nexus-indigo px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                  >
                    Gửi
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
