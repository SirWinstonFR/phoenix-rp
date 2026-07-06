import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import NewPostScreen from './NewPostScreen'
import ProfileScreen from './ProfileScreen'
import SearchScreen from './SearchScreen'

export default function InstaGrimScreen({ onBack }) {
  const { profile, user } = useAuth()
  const [posts, setPosts]                 = useState([])
  const [loading, setLoading]             = useState(true)
  const [view, setView]                   = useState('feed')
  const [viewedUserId, setViewedUserId]   = useState(null)
  const [likedPosts, setLikedPosts]       = useState(new Set())
  const [savedPosts, setSavedPosts]       = useState(new Set())
  const [openComments, setOpenComments]   = useState(null)
  const [commentInputs, setCommentInputs] = useState({})
  const [activeNav, setActiveNav]         = useState('home')
  const [burstPost, setBurstPost]         = useState(null)
  const lastTap = useRef({})

  useEffect(() => {
    fetchPosts()
    const channel = supabase
      .channel('instagrim-v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchPosts())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchPosts() {
    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !postsData?.length) {
      setPosts([])
      setLoading(false)
      return
    }

    const userIds = [...new Set(postsData.map(p => p.user_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, location')
      .in('id', userIds)

    const profilesMap = {}
    profilesData?.forEach(p => { profilesMap[p.id] = p })

    const postIds = postsData.map(p => p.id)
    const { data: commentsData } = await supabase
      .from('comments')
      .select('id, post_id, content, created_at, user_id')
      .in('post_id', postIds)
      .order('created_at', { ascending: true })

    const commentUserIds = [...new Set(commentsData?.map(c => c.user_id) ?? [])]
    let commentProfilesMap = {}
    if (commentUserIds.length > 0) {
      const { data: cProfiles } = await supabase
        .from('profiles')
        .select('id, username, initials, avatar_color')
        .in('id', commentUserIds)
      cProfiles?.forEach(p => { commentProfilesMap[p.id] = p })
    }

    const enriched = postsData.map(post => ({
      ...post,
      profiles: profilesMap[post.user_id] ?? null,
      comments: (commentsData ?? [])
        .filter(c => c.post_id === post.id)
        .map(c => ({ ...c, profiles: commentProfilesMap[c.user_id] ?? null }))
    }))

    setPosts(enriched)
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

  function handleTap(postId, currentLikes) {
    const now = Date.now()
    const last = lastTap.current[postId] ?? 0
    if (now - last < 350) {
      if (!likedPosts.has(postId)) toggleLike(postId, currentLikes)
      setBurstPost(postId)
      setTimeout(() => setBurstPost(null), 700)
    }
    lastTap.current[postId] = now
  }

  async function sendComment(postId) {
    const content = commentInputs[postId]?.trim()
    if (!content || !user) return
    setCommentInputs(prev => ({ ...prev, [postId]: '' }))
    await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content })
    fetchPosts()
  }

  function openProfile(uid) {
    setViewedUserId(uid)
    setView('public-profile')
  }

  // Routing des vues
  if (view === 'new') return (
    <NewPostScreen onBack={() => { setView('feed'); fetchPosts() }} />
  )
  if (view === 'profile') return (
    <ProfileScreen onBack={() => setView('feed')} onOpenProfile={openProfile} />
  )
  if (view === 'public-profile') return (
    <ProfileScreen
      userId={viewedUserId}
      onBack={() => setView('feed')}
      onOpenProfile={openProfile}
    />
  )
  if (view === 'search') return (
    <SearchScreen onBack={() => setView('feed')} onOpenProfile={uid => { openProfile(uid) }} />
  )

  const stories = [
    { id: 'me', label: 'Toi', initials: profile?.initials ?? '?', color: profile?.avatar_color ?? '#555', isMe: true },
    { id: 's1', label: 'elara_rp', initials: 'EL', color: '#7c3aed' },
    { id: 's2', label: 'kael.off', initials: 'KO', color: '#2563eb' },
    { id: 's3', label: 'mira_nox', initials: 'MN', color: '#059669', seen: true },
    { id: 's4', label: 'the_crow', initials: 'TC', color: '#dc2626', seen: true },
  ]

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">instagrim</span>
          <button className="icon-btn">✉️</button>
        </div>

        <div className="stories-row">
          {stories.map(s => (
            <div className="story-item" key={s.id}>
              {s.isMe
                ? <div className="story-add" onClick={() => setView('new')}>＋</div>
                : <div className={`story-ring ${s.seen ? 'seen' : ''}`}>
                    <div className="story-inner" style={{ background: s.color }}>{s.initials}</div>
                  </div>
              }
              <span className="story-label">{s.label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="feed">
            {[1, 2].map(i => (
              <div className="skeleton-post" key={i}>
                <div className="skel-row">
                  <div className="skel skel-avatar" />
                  <div className="skel-text">
                    <div className="skel skel-line w60" />
                    <div className="skel skel-line w40" />
                  </div>
                </div>
                <div className="skel skel-img" />
              </div>
            ))}
          </div>
        ) : (
          <div className="feed">
            {posts.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📸</div>
                <p className="empty-title">Aucun post encore</p>
                <p className="empty-sub">Appuie sur ＋ pour être le premier à publier !</p>
              </div>
            )}

            {posts.map((post, i) => (
              <div className="post" key={post.id} style={{ animationDelay: `${i * 0.05}s` }}>

                <div className="post-header">
                  <div className="post-avatar-ring">
                    <div className="post-avatar" style={{ background: post.profiles?.avatar_color ?? '#555' }}>
                      {post.profiles?.initials ?? '??'}
                    </div>
                  </div>
                  <div className="post-meta" onClick={() => openProfile(post.user_id)} style={{ cursor: 'pointer' }}>
                    <p className="post-username">{post.profiles?.username ?? 'inconnu'}</p>
                    {post.profiles?.location && (
                      <p className="post-location">📍 {post.profiles.location}</p>
                    )}
                  </div>
                  <button className="post-more">···</button>
                </div>

                <div className="post-img-wrap" onClick={() => handleTap(post.id, post.likes)}>
                  <div className="post-img">
                    {post.image_url ? <img src={post.image_url} alt="" /> : <span>🖼️</span>}
                  </div>
                  {burstPost === post.id && <div className="like-burst">❤️</div>}
                </div>

                <div className="post-actions">
                  <button
                    className={`action-btn ${likedPosts.has(post.id) ? 'liked' : ''}`}
                    onClick={() => toggleLike(post.id, post.likes)}
                  >
                    {likedPosts.has(post.id) ? '❤️' : '🤍'}
                  </button>
                  <button className="action-btn" onClick={() => setOpenComments(openComments === post.id ? null : post.id)}>
                    💬
                  </button>
                  <button className="action-btn">↗️</button>
                  <button className="action-btn save-btn" onClick={() => {
                    setSavedPosts(prev => {
                      const next = new Set(prev)
                      prev.has(post.id) ? next.delete(post.id) : next.add(post.id)
                      return next
                    })
                  }}>
                    {savedPosts.has(post.id) ? '🔖' : '🏷️'}
                  </button>
                </div>

                <p className="post-likes">{post.likes ?? 0} j'aime</p>

                {post.caption ? (
                  <p className="post-caption">
                    <b style={{ cursor: 'pointer' }} onClick={() => openProfile(post.user_id)}>
                      {post.profiles?.username}
                    </b>
                    {formatCaption(post.caption)}
                  </p>
                ) : null}

                {post.comments?.length > 0 && openComments !== post.id && (
                  <p className="post-comments-link" onClick={() => setOpenComments(post.id)}>
                    Voir les {post.comments.length} commentaire{post.comments.length > 1 ? 's' : ''}
                  </p>
                )}

                {openComments === post.id && (
                  <div className="comments-section">
                    {post.comments.map(c => (
                      <div className="comment-item" key={c.id}>
                        <div
                          className="comment-avatar"
                          style={{ background: c.profiles?.avatar_color ?? '#555', color: '#fff', cursor: 'pointer' }}
                          onClick={() => openProfile(c.user_id)}
                        >
                          {c.profiles?.initials ?? '?'}
                        </div>
                        <p className="comment-text">
                          <b style={{ cursor: 'pointer' }} onClick={() => openProfile(c.user_id)}>
                            {c.profiles?.username ?? 'inconnu'}
                          </b>{' '}{c.content}
                        </p>
                      </div>
                    ))}
                    <div className="comment-input-row">
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: profile?.avatar_color ?? '#555',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0
                      }}>
                        {profile?.initials ?? '?'}
                      </div>
                      <input
                        className="comment-input"
                        placeholder="Ajouter un commentaire…"
                        value={commentInputs[post.id] ?? ''}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && sendComment(post.id)}
                      />
                      <button className="comment-send" onClick={() => sendComment(post.id)}>➤</button>
                    </div>
                  </div>
                )}

                <p className="post-time">{timeAgo(post.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bottom-nav">
          {[
            { id: 'home',   icon: '🏠', action: () => { setActiveNav('home'); setView('feed') } },
            { id: 'search', icon: '🔍', action: () => { setActiveNav('search'); setView('search') } },
            { id: 'new',    icon: '➕', action: () => setView('new') },
            { id: 'notifs', icon: '🤍', action: () => setActiveNav('notifs') },
          ].map(btn => (
            <button key={btn.id} className={`nav-btn ${activeNav === btn.id ? 'active' : ''}`} onClick={btn.action}>
              {btn.icon}
              <div className="nav-dot" />
            </button>
          ))}
          <button className="nav-btn" onClick={() => { setActiveNav('profile'); setView('profile') }}>
            <div className="avatar-mini" style={{ background: profile?.avatar_color ?? '#555' }}>
              {profile?.initials ?? '?'}
            </div>
            <div className="nav-dot" />
          </button>
        </div>

      </div>
    </div>
  )
}

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
