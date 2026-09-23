import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface PostMedia {
  type: string
  url: string
}

interface PostRow {
  id: string
  content: string
  created_at: string
  author_id: string
  media: PostMedia[] | null
  author: { display_name: string; avatar_url: string | null } | null
  post_reactions: { user_id: string }[]
}

export function HomePage() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadFeed() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, content, created_at, author_id, media, author:profiles(display_name, avatar_url), post_reactions(user_id)'
      )
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) {
      setError('Không tải được bảng tin.')
    } else {
      setPosts((data as any) ?? [])
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

    const { error } = await supabase.from('posts').insert({ author_id: user.id, content, media })
    setPosting(false)
    if (!error) {
      setContent('')
      setFile(null)
      loadFeed()
    }
  }

  async function toggleLike(post: PostRow) {
    if (!user) return
    const liked = post.post_reactions.some((r) => r.user_id === user.id)
    if (liked) {
      await supabase.from('post_reactions').delete().eq('post_id', post.id).eq('user_id', user.id)
    } else {
      await supabase.from('post_reactions').insert({ post_id: post.id, user_id: user.id, type: 'like' })
    }
    loadFeed()
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
        <div className="mt-2 flex items-center justify-between">
          <label className="cursor-pointer text-sm text-[var(--text-2)] hover:text-nexus-indigo">
            📷 {file ? file.name : 'Thêm ảnh'}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
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
        const liked = user ? post.post_reactions.some((r) => r.user_id === user.id) : false
        return (
          <div key={post.id} className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-2 flex items-center gap-3">
              {post.author?.avatar_url ? (
                <img src={post.author.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
                  ?
                </div>
              )}
              <div>
                <p className="font-medium text-[var(--text)]">{post.author?.display_name ?? 'Người dùng'}</p>
                <p className="text-xs text-[var(--text-3)]">{new Date(post.created_at).toLocaleString('vi-VN')}</p>
              </div>
            </div>
            {post.content && <p className="whitespace-pre-wrap text-[var(--text)]">{post.content}</p>}
            {post.media?.[0]?.url && (
              <img
                src={post.media[0].url}
                alt=""
                className="mt-3 max-h-[420px] w-full rounded-control object-cover"
              />
            )}
            <button
              onClick={() => toggleLike(post)}
              className={
                liked
                  ? 'mt-3 rounded-control bg-nexus-indigo/10 px-3 py-1.5 text-sm font-medium text-nexus-indigo'
                  : 'mt-3 rounded-control border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]'
              }
            >
              👍 Thích {post.post_reactions.length > 0 && `(${post.post_reactions.length})`}
            </button>
          </div>
        )
      })}
    </div>
  )
}
