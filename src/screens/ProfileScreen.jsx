import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'

export default function ProfileScreen({ onBack, userId = null, onOpenProfile }) {
  const { profile: myProfile, user, updateProfile } = useAuth()

  // Si userId fourni → profil public, sinon → mon profil
  const isOwnProfile = !userId || userId === user?.id
  const targetId = userId ?? user?.id

  const [profile, setProfile]       = useState(isOwnProfile ? myProfile : null)
  const [posts, setPosts]           = useState([])
  const [stats, setStats]           = useState({ posts: 0, followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [editing, setEditing]       = useState(false)
  const [loading, setLoading]       = useState(!isOwnProfile)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [selectedPost, setSelectedPost] = useState(null)

  // Champs d'édition
  const [editUsername, setEditUsername] = useState(myProfile?.username ?? '')
  const [editBio, setEditBio]           = useState(myProfile?.bio ?? '')
  const [editLocation, setEditLocation] = useState(myProfile?.location ?? '')

  useEffect(() => {
    if (targetId) {
      if (!isOwnProfile) fetchPublicProfile()
      fetchPosts()
      fetchStats()
      if (!isOwnProfile) checkFollowing()
    }
  }, [targetId])

  async function fetchPublicProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .maybeSingle()
    setProfile(data)
    setLoading(false)
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('id, image_url, likes, caption, created_at')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
  }

  async function fetchStats() {
    const [{ count: postsCount }, { count: followersCount }, { count: followingCount }] =
      await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', targetId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
      ])
    setStats({ posts: postsCount ?? 0, followers: followersCount ?? 0, following: followingCount ?? 0 })
  }

  async function checkFollowing() {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetId)
      .maybeSingle()
    setIsFollowing(!!data)
  }

  async function toggleFollow() {
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', user.id).eq('following_id', targetId)
      setIsFollowing(false)
      setStats(prev => ({ ...prev, followers: prev.followers - 1 }))
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId })
      setIsFollowing(true)
      setStats(prev => ({ ...prev, followers: prev.followers + 1 }))
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await updateProfile({
        username: editUsername.trim(),
        bio: editBio.trim(),
        location: editLocation.trim(),
        initials: editUsername.trim().slice(0, 2).toUpperCase(),
      })
      setEditing(false)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const displayProfile = isOwnProfile ? myProfile : profile

  if (loading) return (
    <div className="phone">
      <StatusBar />
      <div className="spinner-wrap"><div className="spinner" /></div>
    </div>
  )

  // Vue d'un post sélectionné
  if (selectedPost) return (
    <div className="phone">
      <StatusBar />
      <div className="screen">
        <div className="app-header">
          <button className="icon-btn" onClick={() => setSelectedPost(null)}>←</button>
          <span className="app-header-title">Post</span>
          <span />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg2)', overflow: 'hidden' }}>
            {selectedPost.image_url
              ? <img src={selectedPost.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🖼️</div>
            }
          </div>
          <div style={{ padding: '12px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>{displayProfile?.username}</p>
            {selectedPost.caption && <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>{selectedPost.caption}</p>}
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>{selectedPost.likes ?? 0} j'aime · {timeAgo(selectedPost.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">{displayProfile?.username ?? 'Profil'}</span>
          {isOwnProfile && (
            <button className="icon-btn" onClick={() => {
              setEditUsername(myProfile?.username ?? '')
              setEditBio(myProfile?.bio ?? '')
              setEditLocation(myProfile?.location ?? '')
              setEditing(!editing)
            }}>
              {editing ? '✕' : '✏️'}
            </button>
          )}
          {!isOwnProfile && <span style={{ width: 32 }} />}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Header profil */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>

              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                padding: 2.5,
                background: 'linear-gradient(135deg, #ff6eb4, #b96eff, #7b9fff)',
                boxShadow: '0 0 20px rgba(185,110,255,0.3)',
                flexShrink: 0,
              }}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: displayProfile?.avatar_color ?? '#333',
                  border: '3px solid var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 800, color: '#fff',
                }}>
                  {displayProfile?.initials ?? '?'}
                </div>
              </div>

              {/* Stats */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
                {[
                  { n: stats.posts,     label: 'Posts' },
                  { n: stats.followers, label: 'Abonnés' },
                  { n: stats.following, label: 'Abonnements' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)' }}>{s.n}</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio */}
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>
              {displayProfile?.username}
            </p>
            {displayProfile?.location && (
              <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>📍 {displayProfile.location}</p>
            )}
            <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
              {displayProfile?.bio || (isOwnProfile ? "Aucune bio — appuie sur ✏️ pour en ajouter une." : "Aucune bio.")}
            </p>

            {/* Boutons */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {isOwnProfile ? (
                <button className="btn-outline" style={{ flex: 1, padding: '8px' }}
                  onClick={() => { setEditUsername(myProfile?.username ?? ''); setEditBio(myProfile?.bio ?? ''); setEditLocation(myProfile?.location ?? ''); setEditing(true) }}>
                  Modifier le profil
                </button>
              ) : (
                <button
                  onClick={toggleFollow}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: 10,
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    background: isFollowing ? 'var(--bg4)' : 'linear-gradient(135deg, #b96eff, #7b9fff)',
                    color: '#fff',
                  }}
                >
                  {isFollowing ? 'Abonné ✓' : 'Suivre'}
                </button>
              )}
            </div>
          </div>

          {/* Formulaire d'édition */}
          {editing && isOwnProfile && (
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label>Pseudo</label>
                <input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="ton_pseudo" />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Décris ton personnage..." style={{ height: 70 }} />
              </div>
              <div className="form-group">
                <label>Lieu RP</label>
                <input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="ex: Île de Valoria" />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          )}

          {/* Grille de posts */}
          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📷</div>
              <p className="empty-title">Aucun post</p>
              <p className="empty-sub">{isOwnProfile ? 'Publie ton premier post sur Instagrim !' : 'Ce joueur n\'a pas encore posté.'}</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
            }}>
              {posts.map(post => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  style={{
                    aspectRatio: '1',
                    background: 'var(--bg2)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {post.image_url
                    ? <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--t3)' }}>🖼️</div>
                  }
                  {/* Overlay au hover */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: '#fff', fontWeight: 700,
                    transition: 'background 0.2s',
                  }}>
                    ❤️ {post.likes ?? 0}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bouton déconnexion (mon profil uniquement) */}
          {isOwnProfile && !editing && (
            <div style={{ padding: '20px 16px' }}>
              <SignOutButton />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function SignOutButton() {
  const { signOut } = useAuth()
  return (
    <button className="btn-outline" style={{ width: '100%' }} onClick={signOut}>
      Se déconnecter
    </button>
  )
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}
