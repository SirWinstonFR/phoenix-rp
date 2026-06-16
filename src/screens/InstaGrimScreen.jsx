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
  const [view, setView] = useState('feed')
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [savedPosts, setSavedPosts] = useState(new Set())
  const [activeNav, setActiveNav] = useState('home')

  useEffect(() => {
    fetchPosts()
    const channel = supabase
      .channel('posts-realtime')
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

  function toggleSave(postId) {
    setSavedPosts(prev => {
      const next = new Set(prev)
      prev.has(postId) ? next.delete(postId) : next.add(postId)
      return next
    })
  }

  if (view === 'new')     return <NewPostScreen onBack={() => { setView('feed'); fetchPosts() }} />
  if (view === 'profile') return <ProfileScreen onBack={() => setView('feed')} />

  // Stories fictives (en attendant la vraie feature)
  const stories = [
    { id: 'me', label: 'Toi', initials: profile?.initials ?? '?', color: profile?.avatar_color ?? '#888', isMe: true },
    { id: 's1', label: 'elara_rp', initials: 'EL', color: '#7b2d8b' },
    { id: 's2', label: 'kael.off', initials: 'KO', color: '#185fa5' },
    { id: 's3', label: 'mira_nox', initials: 'MN', color: '#0d6b5e', seen: true },
    { id: 's4', label: 'the_crow', initials: 'TC', color: '#b33000', seen: true },
  ]

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">

        {/* Header */}
        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">instagrim</span>
          <button className="icon-btn">✉️</button>
        </div>

        {/* Stories */}
        <div className="stories-row">
          {stories.map(s => (
            <div className="story-item" key={s.id}>
              {s.isMe ? (
                <div className="story-add-btn" onClick={() => setView('new')}>＋</div>
              ) : (
                <div className={`story-ring ${s.seen ? 'seen' : ''}`}>
                  <div className="story-avatar" style={{ background: s.color }}>
                    {s.initials}
                  </div>
                </div>
              )}
              <span className="story-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : (
          <div className="feed">
            {posts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Aucun post encore.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Sois le premier à publier !</p>
              </div>
            )}

            {posts.map((post, i) => (
              <div className="post" key={post.id} style={{ animationDelay: `${i * 0.06}s` }}>

                {/* En-tête du post */}
                <div className="post-header">
                  <div className="post-avatar-ring">
                    <div className="post-avatar" style={{ background: post.profiles?.avatar_color ?? '#888' }}>
                      {post.profiles?.initials ?? '??'}
                    </div>
                  </div>
                  <div className="post-meta">
                    <p className="post-username">{post.profiles?.username ?? 'inconnu'}</p>
                    {(post.profiles?.location) && (
                      <p className="post-location">📍 {post.profiles.location}</p>
                    )}
                  </div>
                  <button className="post-more">···</button>
                </div>

                {/* Image */}
                <div className="post-img">
                  {post.image_url
                    ? <img src={post.image_url} alt="" onDoubleClick={() => toggleLike(post.id, post.likes)} />
                    : <span>🖼️</span>
                  }
                </div>

                {/* Actions */}
                <div className="post-actions">
                  <button
                    className={`action-btn ${likedPosts.has(post.id) ? 'liked' : ''}`}
                    onClick={() => toggleLike(post.id, post.likes)}
                  >
                    {likedPosts.has(post.id) ? '❤️' : '🤍'}
                  </button>
                  <button className="action-btn">💬</button>
                  <button className="action-btn">↗️</button>
                  <button className="action-btn save-btn" onClick={() => toggleSave(post.id)}>
                    {savedPosts.has(post.id) ? '🔖' : '🏷️'}
                  </button>
                </div>

                {/* Infos */}
                <p className="post-likes">{post.likes ?? 0} j'aime</p>
                <p className="post-caption">
                  <b>{post.profiles?.username}</b>
                  {formatCaption(post.caption)}
                </p>
                {(post.comments_count ?? 0) > 0 && (
                  <p className="post-comments">Voir les {post.comments_count} commentaires</p>
                )}
                <p className="post-time">{timeAgo(post.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Nav */}
        <div className="bottom-nav">
          <button className={`nav-btn ${activeNav === 'home' ? 'active' : ''}`} onClick={() => { setActiveNav('home'); setView('feed') }}>🏠</button>
          <button className={`nav-btn ${activeNav === 'search' ? 'active' : ''}`} onClick={() => setActiveNav('search')}>🔍</button>
          <button className="nav-btn" onClick={() => setView('new')}>➕</button>
          <button className={`nav-btn ${activeNav === 'notifs' ? 'active' : ''}`} onClick={() => setActiveNav('notifs')}>🤍</button>
          <button className="nav-btn" onClick={() => setView('profile')}>
            <div className="avatar-mini" style={{ background: profile?.avatar_color ?? '#888' }}>
              {profile?.initials ?? '?'}
            </div>
          </button>
        </div>

      </div>
    </div>
  )
}

// Colorie les hashtags en violet
function formatCaption(text) {
  if (!text) return ''
  return text.split(' ').map((word, i) =>
    word.startsWith('#')
      ? <span key={i} className="post-hashtag"> {word}</span>
      : ` ${word}`
  )
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}
