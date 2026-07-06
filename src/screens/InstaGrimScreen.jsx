import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'
import NewPostScreen from './NewPostScreen'
import NewStoryScreen from './NewStoryScreen'
import ProfileScreen from './ProfileScreen'
import SearchScreen from './SearchScreen'
import NotificationsScreen from './NotificationsScreen'
import StoryViewer from './StoryViewer'

export default function InstaGrimScreen({ onBack }) {
  const { profile, user } = useAuth()
  const [posts, setPosts]                   = useState([])
  const [stories, setStories]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [view, setView]                     = useState('feed')
  const [viewedUserId, setViewedUserId]     = useState(null)
  const [likedPosts, setLikedPosts]         = useState(new Set())
  const [savedPosts, setSavedPosts]         = useState(new Set())
  const [openComments, setOpenComments]     = useState(null)
  const [commentInputs, setCommentInputs]   = useState({})
  const [activeNav, setActiveNav]           = useState('home')
  const [burstPost, setBurstPost]           = useState(null)
  const [unreadNotifs, setUnreadNotifs]     = useState(0)
  const [viewingStories, setViewingStories] = useState(null)
  const [postMenu, setPostMenu]             = useState(null) // postId du menu ouvert
  const [commentMenu, setCommentMenu]       = useState(null) // commentId du menu ouvert
  const lastTap = useRef({})

  useEffect(() => {
    fetchPosts()
    fetchStories()
    fetchUnreadNotifs()

    const channel = supabase
      .channel('instagrim-v7')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => fetchStories())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => fetchUnreadNotifs())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchUnreadNotifs() {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setUnreadNotifs(count ?? 0)
  }

  async function fetchStories() {
    const { data: storiesData } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })

    if (!storiesData?.length) { setStories([]); return }

    const userIds = [...new Set(storiesData.map(s => s.user_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, avatar_url')
      .in('id', userIds)

    const profilesMap = {}
    profilesData?.forEach(p => { profilesMap[p.id] = p })

    // Grouper les stories par utilisateur
    const grouped = {}
    storiesData.forEach(s => {
      const uid = s.user_id
      if (!grouped[uid]) grouped[uid] = { profile: profilesMap[uid], stories: [] }
      grouped[uid].stories.push({ ...s, profiles: profilesMap[uid] })
    })

    setStories(Object.values(grouped))
  }

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
      .select('id, username, initials, avatar_color, avatar_url, location')
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
        .select('id, username, initials, avatar_color, avatar_url')
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

  async function toggleLike(postId, currentLikes, postOwnerId) {
    const isLiked = likedPosts.has(postId)
    const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1

    setLikedPosts(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(postId) : next.add(postId)
      return next
    })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p))
    await supabase.from('posts').update({ likes: newLikes }).eq('id', postId)

    // Envoyer une notification si ce n'est pas son propre post
    if (!isLiked && postOwnerId !== user.id) {
      await supabase.from('notifications').insert({
        user_id:      postOwnerId,
        from_user_id: user.id,
        type:         'like',
        post_id:      postId,
      })
    }
  }

  async function sendComment(postId, postOwnerId) {
    const content = commentInputs[postId]?.trim()
    if (!content || !user) return
    setCommentInputs(prev => ({ ...prev, [postId]: '' }))
    await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content })

    // Notification si ce n'est pas son propre post
    if (postOwnerId !== user.id) {
      await supabase.from('notifications').insert({
        user_id:      postOwnerId,
        from_user_id: user.id,
        type:         'comment',
        post_id:      postId,
      })
    }
    fetchPosts()
  }

  function handleTap(postId, currentLikes, postOwnerId) {
    const now = Date.now()
    const last = lastTap.current[postId] ?? 0
    if (now - last < 350) {
      if (!likedPosts.has(postId)) toggleLike(postId, currentLikes, postOwnerId)
      setBurstPost(postId)
      setTimeout(() => setBurstPost(null), 700)
    }
    lastTap.current[postId] = now
  }

  async function deletePost(postId) {
    if (!window.confirm('Supprimer ce post ?')) return
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setPostMenu(null)
  }

  async function deleteComment(commentId, postId) {
    await supabase.from('comments').delete().eq('id', commentId)
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: p.comments.filter(c => c.id !== commentId) }
        : p
    ))
    setCommentMenu(null)
  }

  function openProfile(uid) {
    setViewedUserId(uid)
    setView('public-profile')
  }

  // Routing
  if (view === 'new')          return <NewPostScreen onBack={() => { setView('feed'); fetchPosts() }} />
  if (view === 'new-story')    return <NewStoryScreen onBack={() => { setView('feed'); fetchStories() }} />
  if (view === 'profile')      return <ProfileScreen onBack={() => setView('feed')} onOpenProfile={openProfile} />
  if (view === 'public-profile') return <ProfileScreen userId={viewedUserId} onBack={() => setView('feed')} onOpenProfile={openProfile} />
  if (view === 'search')       return <SearchScreen onBack={() => setView('feed')} onOpenProfile={openProfile} />
  if (view === 'notifications') return <NotificationsScreen onBack={() => { setView('feed'); setUnreadNotifs(0); setActiveNav('home') }} onOpenProfile={openProfile} />

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">

        {/* Story viewer (overlay) */}
        {viewingStories && (
          <StoryViewer
            stories={viewingStories.stories}
            startIndex={viewingStories.startIndex}
            onClose={() => setViewingStories(null)}
          />
        )}

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">instagrim</span>
          <button className="icon-btn">✉️</button>
        </div>

        {/* Stories */}
        <div className="stories-row">
          {/* Mon story (bouton ajouter) */}
          <div className="story-item">
            <div className="story-add" onClick={() => setView('new-story')}>＋</div>
            <span className="story-label">Ma story</span>
          </div>

          {/* Stories des autres */}
          {stories.map((group, i) => {
            const isMe = group.profile?.id === user.id
            return (
              <div
                className="story-item" key={group.profile?.id ?? i}
                onClick={() => setViewingStories({ stories: group.stories, startIndex: 0 })}
              >
                <div className="story-ring">
                  {group.profile?.avatar_url
                    ? <div className="story-inner">
                        <img src={group.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      </div>
                    : <div className="story-inner" style={{ background: group.profile?.avatar_color ?? '#555' }}>
                        {group.profile?.initials ?? '?'}
                      </div>
                  }
                </div>
                <span className="story-label">{isMe ? 'Toi' : group.profile?.username ?? 'Joueur'}</span>
              </div>
            )
          })}
        </div>

        {/* Feed */}
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
                <p className="empty-sub">Appuie sur ＋ pour publier !</p>
              </div>
            )}

            {posts.map((post, i) => (
              <div className="post" key={post.id} style={{ animationDelay: `${i * 0.05}s` }}>

                <div className="post-header">
                  <Avatar profile={post.profiles} size={38} />
                  <div className="post-meta" onClick={() => openProfile(post.user_id)} style={{ cursor: 'pointer' }}>
                    <p className="post-username">{post.profiles?.username ?? 'Joueur'}</p>
                    {post.profiles?.location && (
                      <p className="post-location">📍 {post.profiles.location}</p>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button className="post-more" onClick={() => setPostMenu(postMenu === post.id ? null : post.id)}>···</button>
                    {postMenu === post.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%',
                        background: 'var(--bg3)', border: '1px solid var(--border)',
                        borderRadius: 12, overflow: 'hidden', zIndex: 50,
                        minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        animation: 'fadeDown 0.15s ease',
                      }}>
                        {post.user_id === user.id && (
                          <button
                            onClick={() => deletePost(post.id)}
                            style={{
                              width: '100%', padding: '12px 16px',
                              background: 'none', border: 'none',
                              color: 'var(--danger)', fontSize: 13,
                              fontWeight: 600, cursor: 'pointer',
                              textAlign: 'left', fontFamily: 'inherit',
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            🗑️ Supprimer le post
                          </button>
                        )}
                        <button
                          onClick={() => setPostMenu(null)}
                          style={{
                            width: '100%', padding: '12px 16px',
                            background: 'none', border: 'none',
                            color: 'var(--t2)', fontSize: 13,
                            cursor: 'pointer', textAlign: 'left',
                            fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          ✕ Fermer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="post-img-wrap" onClick={() => handleTap(post.id, post.likes, post.user_id)}>
                  <div className="post-img">
                    {post.image_url ? <img src={post.image_url} alt="" /> : <span>🖼️</span>}
                  </div>
                  {burstPost === post.id && <div className="like-burst">❤️</div>}
                </div>

                <div className="post-actions">
                  <button
                    className={`action-btn ${likedPosts.has(post.id) ? 'liked' : ''}`}
                    onClick={() => toggleLike(post.id, post.likes, post.user_id)}
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
                      {post.profiles?.username ?? 'Joueur'}
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
                      <div className="comment-item" key={c.id} style={{ position: 'relative' }}>
                        <Avatar profile={c.profiles} size={26} style={{ cursor: 'pointer' }} />
                        <p className="comment-text" style={{ flex: 1 }}>
                          <b style={{ cursor: 'pointer' }} onClick={() => openProfile(c.user_id)}>
                            {c.profiles?.username ?? 'Joueur'}
                          </b>{' '}{c.content}
                        </p>
                        {(c.user_id === user.id || post.user_id === user.id) && (
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => setCommentMenu(commentMenu === c.id ? null : c.id)}
                              style={{
                                background: 'none', border: 'none',
                                color: 'var(--t3)', fontSize: 14,
                                cursor: 'pointer', padding: '0 4px',
                                lineHeight: 1,
                              }}
                            >···</button>
                            {commentMenu === c.id && (
                              <div style={{
                                position: 'absolute', right: 0, top: '100%',
                                background: 'var(--bg3)', border: '1px solid var(--border)',
                                borderRadius: 10, overflow: 'hidden', zIndex: 50,
                                minWidth: 130, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                              }}>
                                <button
                                  onClick={() => deleteComment(c.id, post.id)}
                                  style={{
                                    width: '100%', padding: '10px 14px',
                                    background: 'none', border: 'none',
                                    color: 'var(--danger)', fontSize: 12,
                                    fontWeight: 600, cursor: 'pointer',
                                    textAlign: 'left', fontFamily: 'inherit',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                  }}
                                >
                                  🗑️ Supprimer
                                </button>
                                <button
                                  onClick={() => setCommentMenu(null)}
                                  style={{
                                    width: '100%', padding: '10px 14px',
                                    background: 'none', border: 'none',
                                    color: 'var(--t2)', fontSize: 12,
                                    cursor: 'pointer', textAlign: 'left',
                                    fontFamily: 'inherit',
                                  }}
                                >✕ Fermer</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="comment-input-row">
                      <Avatar profile={profile} size={28} />
                      <input
                        className="comment-input"
                        placeholder="Ajouter un commentaire…"
                        value={commentInputs[post.id] ?? ''}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && sendComment(post.id, post.user_id)}
                      />
                      <button className="comment-send" onClick={() => sendComment(post.id, post.user_id)}>➤</button>
                    </div>
                  </div>
                )}

                <p className="post-time">{timeAgo(post.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Nav */}
        <div className="bottom-nav">
          <button className={`nav-btn ${activeNav === 'home' ? 'active' : ''}`} onClick={() => { setActiveNav('home'); setView('feed') }}>
            🏠<div className="nav-dot" />
          </button>
          <button className={`nav-btn ${activeNav === 'search' ? 'active' : ''}`} onClick={() => { setActiveNav('search'); setView('search') }}>
            🔍<div className="nav-dot" />
          </button>
          <button className="nav-btn" onClick={() => setView('new')}>
            ➕<div className="nav-dot" />
          </button>
          <button
            className={`nav-btn ${activeNav === 'notifs' ? 'active' : ''}`}
            onClick={() => { setActiveNav('notifs'); setView('notifications') }}
            style={{ position: 'relative' }}
          >
            🤍
            {unreadNotifs > 0 && (
              <div style={{
                position: 'absolute', top: 0, right: 4,
                background: 'var(--danger)', color: '#fff',
                fontSize: 8, fontWeight: 800,
                borderRadius: '50%', width: 14, height: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--bg)',
              }}>
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </div>
            )}
            <div className="nav-dot" />
          </button>
          <button className="nav-btn" onClick={() => { setActiveNav('profile'); setView('profile') }}>
            <Avatar profile={profile} size={26} style={{ border: 'none', padding: 0 }} />
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
