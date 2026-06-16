import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import NewPostScreen from './NewPostScreen'
import ProfileScreen from './ProfileScreen'

export default function InstaGrimScreen({ onBack }) {
  const { profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('feed') // 'feed' | 'new' | 'profile'
  const [likedPosts, setLikedPosts] = useState(new Set())

  useEffect(() => {
    fetchPosts()

    // Temps réel : écoute les nouveaux posts
    const channel = supabase
      .channel('posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        setPosts(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username, initials, avatar_color, location)')
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  async function toggleLike(postId, currentLikes) {
    const isLiked = likedPosts.has(postId)
    const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1

    setLikedPosts(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(postId) : next.add(postId)
      return next
    })

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p))

    await supabase.from('posts').update({ likes: newLikes }).eq('id', postId)
  }

  if (view === 'new') return <NewPostScreen onBack={() => { setView('feed'); fetchPosts() }} />
  if (view === 'profile') return <ProfileScreen onBack={() => setView('feed')} />

  return (
    <div className="phone">
      <StatusBar />

      <div className="screen">
        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">instagrim</span>
          <button className="icon-btn">✉️</button>
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : (
          <div className="feed">
            {posts.length === 0 && (
              <p style={{ textAlign: 'center', color: '#aaa', padding: '40px 20px', fontSize: 14 }}>
                Aucun post encore. Sois le premier !
              </p>
            )}
            {posts.map(post => (
              <div className="post" key={post.id}>
                <div className="post-header">
                  <div
                    className="post-avatar"
                    style={{ background: post.profiles?.avatar_color ?? '#888' }}
                  >
                    {post.profiles?.initials ?? '??'}
                  </div>
                  <div className="post-meta">
                    <p className="post-username">{post.profiles?.username ?? 'inconnu'}</p>
                    <p className="post-location">
                      {post.profiles?.location ? post.profiles.location + ' · ' : ''}
                      {timeAgo(post.created_at)}
                    </p>
                  </div>
                  <span style={{ fontSize: 18, color: '#aaa' }}>···</span>
                </div>

                <div className="post-img">
                  {post.image_url
                    ? <img src={post.image_url} alt="" />
                    : <span>🖼️</span>
                  }
                </div>

                <div className="post-actions">
                  <button
                    className={likedPosts.has(post.id) ? 'liked' : ''}
                    onClick={() => toggleLike(post.id, post.likes)}
                  >
                    {likedPosts.has(post.id) ? '❤️' : '🤍'}
                  </button>
                  <button>💬</button>
                  <button>↗️</button>
                </div>

                <p className="post-likes">{post.likes ?? 0} j'aime</p>
                <p className="post-caption">
                  <b>{post.profiles?.username}</b>{post.caption}
                </p>
                {(post.comments_count ?? 0) > 0 && (
                  <p className="post-comments">Voir les {post.comments_count} commentaires</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bottom-nav">
          <button onClick={() => setView('feed')}>🏠</button>
          <button>🔍</button>
          <button onClick={() => setView('new')}>➕</button>
          <button>🤍</button>
          <button onClick={() => setView('profile')}>
            <div
              className="avatar-mini"
              style={{ background: profile?.avatar_color ?? '#888' }}
            >
              {profile?.initials ?? '?'}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}
