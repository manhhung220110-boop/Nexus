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
  media: PostMedia[] | null
  author: { display_name: string; avatar_url: string | null } | null
}

interface PostRow {
  id: string
  content: string
  created_at: string
  author_id: string
  media: PostMedia[] | null
  visibility: string
  youtube_id: string | null
  spotify_uri: string | null
  author: { display_name: string; avatar_url: string | null } | null
  post_reactions: { user_id: string; type: string }[]
  comments: { id: string }[]
  saves: { user_id: string }[]
  post_views: { viewer_id: string }[]
}

const REACTIONS = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'haha', emoji: '😆' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
  { type: 'angry', emoji: '😡' },
]

const QUICK_EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤔', '😎',
  '😢', '😭', '😡', '😱', '🥳', '😴', '🤗', '🙄', '😇', '🥰',
  '👍', '👎', '👏', '🙏', '💪', '✌️', '🤝', '👋', '🤞', '👌',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💕', '💖',
  '🔥', '✨', '🎉', '🎂', '🎁', '⭐', '🌟', '☀️', '🌙', '🌈',
  '🐶', '🐱', '🐼', '🦄', '🐸', '🍕', '🍔', '☕', '🍰', '⚽',
]

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  )
  return m ? m[1] : null
}

function extractSpotifyTrackId(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    part.match(/^https?:\/\//) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-nexus-blue underline break-all">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

async function uploadMedia(userId: string, file: File): Promise<PostMedia[]> {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('post-media').upload(path, file)
  if (error) return []
  const { data } = supabase.storage.from('post-media').getPublicUrl(path)
  const type = file.type.startsWith('video/') ? 'video' : 'image'
  return [{ type, url: data.publicUrl }]
}

function deleteMediaFromUrl(url?: string | null) {
  if (!url) return
  const marker = '/object/public/post-media/'
  const idx = url.indexOf(marker)
  if (idx !== -1) {
    const path = url.substring(idx + marker.length)
    supabase.storage.from('post-media').remove([path])
  }
}

export function HomePage() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [file, setFile] = useState<File | null>(null)
  const [youtubeLink, setYoutubeLink] = useState('')
  const [spotifyLink, setSpotifyLink] = useState('')
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [postEmojiOpen, setPostEmojiOpen] = useState(false)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentRow[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [commentFiles, setCommentFiles] = useState<Record<string, File | null>>({})
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<Record<string, boolean>>({})
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState('')

  async function loadFeed() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, content, created_at, author_id, media, visibility, youtube_id, spotify_uri, author:profiles!posts_author_id_fkey(display_name, avatar_url), post_reactions(user_id, type), comments(id), saves(user_id), post_views(viewer_id)'
      )
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) {
      setError('Không tải được bảng tin.')
    } else {
      const rows: PostRow[] = (data as any) ?? []
      setPosts(rows)
      setError(null)
      if (user) {
        rows.forEach((p) => {
          supabase
            .from('post_views')
            .upsert({ post_id: p.id, viewer_id: user.id }, { onConflict: 'post_id,viewer_id', ignoreDuplicates: true })
        })
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFeed()
  }, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if ((!content.trim() && !file && !youtubeLink.trim() && !spotifyLink.trim()) || !user) return
    setPosting(true)

    let media: PostMedia[] = []
    if (file) {
      setUploading(true)
      media = await uploadMedia(user.id, file)
      setUploading(false)
    }

    const youtube_id = youtubeLink.trim() ? extractYouTubeId(youtubeLink.trim()) : null
    const spotify_uri = spotifyLink.trim() ? extractSpotifyTrackId(spotifyLink.trim()) : null

    const { error } = await supabase
      .from('posts')
      .insert({ author_id: user.id, content, media, visibility, youtube_id, spotify_uri })
    setPosting(false)
    if (!error) {
      setContent('')
      setFile(null)
      setYoutubeLink('')
      setSpotifyLink('')
      setVisibility('public')
      loadFeed()
    }
  }

  async function deletePost(post: PostRow) {
    if (!window.confirm('Xóa bài viết này? Không thể hoàn tác.')) return
    deleteMediaFromUrl(post.media?.[0]?.url)
    await supabase.from('posts').delete().eq('id', post.id)
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

  async function refreshComments(postId: string) {
    const { data } = await supabase
      .from('comments')
      .select(
        'id, content, created_at, author_id, media, author:profiles!comments_author_id_fkey(display_name, avatar_url)'
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setCommentsByPost((prev) => ({ ...prev, [postId]: (data as any) ?? [] }))
  }

  async function toggleComments(postId: string) {
    const isOpen = expanded[postId]
    setExpanded((prev) => ({ ...prev, [postId]: !isOpen }))
    if (!isOpen && !commentsByPost[postId]) {
      await refreshComments(postId)
    }
  }

  async function addComment(postId: string) {
    const text = commentDrafts[postId]?.trim()
    const cfile = commentFiles[postId]
    if ((!text && !cfile) || !user) return

    let media: PostMedia[] = []
    if (cfile) {
      media = await uploadMedia(user.id, cfile)
    }

    await supabase.from('comments').insert({ post_id: postId, author_id: user.id, content: text || '📷', media })
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
    setCommentFiles((prev) => ({ ...prev, [postId]: null }))
    await refreshComments(postId)
    loadFeed()
  }

  function startEditComment(c: CommentRow) {
    setEditingCommentId(c.id)
    setEditCommentContent(c.content)
  }

  async function saveEditComment(postId: string, commentId: string) {
    await supabase.from('comments').update({ content: editCommentContent }).eq('id', commentId)
    setEditingCommentId(null)
    await refreshComments(postId)
  }

  async function deleteComment(postId: string, commentId: string) {
    if (!window.confirm('Xóa bình luận này?')) return
    const c = commentsByPost[postId]?.find((x) => x.id === commentId)
    deleteMediaFromUrl(c?.media?.[0]?.url)
    await supabase.from('comments').delete().eq('id', commentId)
    await refreshComments(postId)
    loadFeed()
  }

  function toggleEmojiPicker(postId: string) {
    setEmojiPickerOpen((prev) => ({ ...prev, [postId]: !prev[postId] }))
  }

  function addEmoji(postId: string, emoji: string) {
    setCommentDrafts((prev) => ({ ...prev, [postId]: (prev[postId] ?? '') + emoji }))
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

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPostEmojiOpen((o) => !o)}
            className="rounded-control border border-[var(--border)] px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
          >
            😊
          </button>
          <span className="text-xs text-[var(--text-3)]">Thêm emoji</span>
        </div>

        {postEmojiOpen && (
          <div className="mt-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-control border border-[var(--border)] p-2">
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

        <input
          value={youtubeLink}
          onChange={(e) => setYoutubeLink(e.target.value)}
          placeholder="Dán link YouTube (không bắt buộc)"
          className="mt-2 w-full rounded-control border border-[var(--border)] px-3.5 py-2 text-sm outline-none focus:border-nexus-coral focus:ring-2 focus:ring-nexus-coral/25"
        />
        <input
          value={spotifyLink}
          onChange={(e) => setSpotifyLink(e.target.value)}
          placeholder="Dán link bài hát Spotify (không bắt buộc)"
          className="mt-2 w-full rounded-control border border-[var(--border)] px-3.5 py-2 text-sm outline-none focus:border-nexus-green focus:ring-2 focus:ring-nexus-green/25"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer text-sm text-[var(--text-2)] hover:text-nexus-indigo">
              📎 {file ? file.name : 'Ảnh / GIF / Video'}
              <input
                type="file"
                accept="image/*,video/*"
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
            disabled={posting || uploading || (!content.trim() && !file && !youtubeLink.trim() && !spotifyLink.trim())}
            className="rounded-control bg-nexus-indigo px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Đang tải lên…' : posting ? 'Đang đăng…' : 'Đăng'}
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
                    {post.visibility === 'public' ? '🌍' : post.visibility === 'friends' ? '👥' : '🔒'} · 👁{' '}
                    {post.post_views.length}
                  </p>
                </div>
              </div>
              {isAuthor && !isEditing && (
                <div className="flex gap-2 text-sm">
                  <button onClick={() => startEdit(post)} className="text-[var(--text-2)] hover:text-nexus-indigo">
                    Sửa
                  </button>
                  <button onClick={() => deletePost(post)} className="text-nexus-coral hover:underline">
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
                {post.content && (
                  <p className="whitespace-pre-wrap text-[var(--text)]">{linkify(post.content)}</p>
                )}
                {post.media?.[0]?.url &&
                  (post.media[0].type === 'video' ? (
                    <video
                      src={post.media[0].url}
                      controls
                      className="mt-3 max-h-[420px] w-full rounded-control bg-black"
                    />
                  ) : (
                    <img
                      src={post.media[0].url}
                      alt=""
                      className="mt-3 max-h-[420px] w-full rounded-control object-cover"
                    />
                  ))}
                {post.youtube_id && (
                  <div className="mt-3 aspect-video w-full overflow-hidden rounded-control bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${post.youtube_id}`}
                      title="YouTube video"
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {post.spotify_uri && (
                  <iframe
                    title="Spotify track"
                    src={`https://open.spotify.com/embed/track/${post.spotify_uri}`}
                    width="100%"
                    height="152"
                    className="mt-3"
                    style={{ borderRadius: 12 }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
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
                {(commentsByPost[post.id] ?? []).map((c) => {
                  const isCommentAuthor = user?.id === c.author_id
                  const isEditingComment = editingCommentId === c.id
                  return (
                    <div key={c.id} className="flex items-start gap-2">
                      {c.author?.avatar_url ? (
                        <img src={c.author.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs text-[var(--text-3)]">
                          ?
                        </div>
                      )}
                      <div className="flex-1">
                        {isEditingComment ? (
                          <div className="space-y-1">
                            <input
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              className="w-full rounded-control border border-[var(--border)] px-2 py-1 text-sm outline-none focus:border-nexus-indigo"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEditComment(post.id, c.id)}
                                className="text-xs font-medium text-nexus-indigo"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="text-xs text-[var(--text-2)]"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-control bg-[var(--surface-2)] px-3 py-1.5">
                            <p className="text-xs font-medium text-[var(--text)]">
                              {c.author?.display_name ?? 'Người dùng'}
                            </p>
                            <p className="text-sm text-[var(--text)]">{linkify(c.content)}</p>
                            {c.media?.[0]?.url && (
                              <img
                                src={c.media[0].url}
                                alt=""
                                className="mt-1 max-h-52 rounded-control object-cover"
                              />
                            )}
                          </div>
                        )}
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-3)]">
                          <span>{new Date(c.created_at).toLocaleString('vi-VN')}</span>
                          {isCommentAuthor && !isEditingComment && (
                            <>
                              <button onClick={() => startEditComment(c)} className="hover:text-nexus-indigo">
                                Sửa
                              </button>
                              <button
                                onClick={() => deleteComment(post.id, c.id)}
                                className="hover:text-nexus-coral"
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {emojiPickerOpen[post.id] && (
                  <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-control border border-[var(--border)] p-2">
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => addEmoji(post.id, e)}
                        className="rounded-control px-1.5 py-0.5 text-lg hover:bg-[var(--surface-2)]"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEmojiPicker(post.id)}
                    className="rounded-control border border-[var(--border)] px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                  >
                    😊
                  </button>
                  <label className="cursor-pointer rounded-control border border-[var(--border)] px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]">
                    📎
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setCommentFiles((prev) => ({ ...prev, [post.id]: e.target.files?.[0] ?? null }))
                      }
                      className="hidden"
                    />
                  </label>
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
                {commentFiles[post.id] && (
                  <p className="text-xs text-[var(--text-3)]">Đã chọn: {commentFiles[post.id]?.name}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
