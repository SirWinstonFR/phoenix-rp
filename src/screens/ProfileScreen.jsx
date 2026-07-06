import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'

export default function ProfileScreen({ onBack, userId = null, onOpenProfile }) {
  const { profile: myProfile, user, updateProfile } = useAuth()

  const isOwnProfile = !userId || userId === user?.id
  const targetId = userId ?? user?.id

  const [profile, setProfile]         = useState(isOwnProfile ? myProfile : null)
  const [posts, setPosts]             = useState([])
  const [stats, setStats]             = useState({ posts: 0, followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [editing, setEditing]         = useState(false)
  const [loading, setLoading]         = useState(!isOwnProfile)
  const [saving, setSaving]           = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError]             = useState('')
  const [selectedPost, setSelectedPost] = useState(null)

  const [editUsername, setEditUsername] = useState(myProfile?.username ?? '')
  const [editBio, setEditBio]           = useState(myProfile?.bio ?? '')
  const [editLocation, setEditLocation] = useState(myProfile?.location ?? '')

  const avatarInputRef = useRef()

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
    const [{ count: p }, { count: fr }, { count: fg }] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', targetId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
    ])
    setStats({ posts: p ?? 0, followers: fr ?? 0, following: fg ?? 0 })
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

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = urlData.publicUrl + '?t=' + Date.now()
      await updateProfile({ avatar_url: avatarUrl })
    } catch (e) {
      setError('Erreur upload avatar : ' + e.message)
    }
    setUploadingAvatar(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await updateProfile({
        username: editUsername.trim(),
        bio:      editBio.trim(),
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

  // Vue post sélectionné
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
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar profile={displayProfile} size={32} />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{displayProfile?.username}</p>
            </div>
            {selectedPost.caption && <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>{selectedPost.caption}</p>}
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>
              ❤️ {selectedPost.likes ?? 0} · {timeAgo(selectedPost.created_at)}
            </p>
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
          {isOwnProfile
            ? <button className="icon-btn" onClick={() => {
                setEditUsername(myProfile?.username ?? '')
                setEditBio(myProfile?.bio ?? '')
                setEditLocation(myProfile?.location ?? '')
                setEditing(!editing)
              }}>{editing ? '✕' : '✏️'}</button>
            : <span style={{ width: 32 }} />
          }
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Header profil */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>

              {/* Avatar cliquable si mon profil */}
              <div style={{ position: 'relative' }}>
                <Avatar profile={displayProfile} size={76} />
                {isOwnProfile && (
                  <>
                    <div
                      onClick={() => avatarInputRef.current.click()}
                      style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, cursor: 'pointer',
                        border: '2px solid var(--bg)',
                      }}
                    >
                      {uploadingAvatar ? '⏳' : '📷'}
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file" accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                    />
                  </>
                )}
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

            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>
              {displayProfile?.username}
            </p>
            {displayProfile?.location && (
              <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>📍 {displayProfile.location}</p>
            )}
            <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
              {displayProfile?.bio || (isOwnProfile ? 'Appuie sur ✏️ pour ajouter une bio.' : 'Aucune bio.')}
            </p>

            <div style={{ marginTop: 12 }}>
              {isOwnProfile ? (
                <button className="btn-outline" style={{ width: '100%', padding: '8px' }}
                  onClick={() => {
                    setEditUsername(myProfile?.username ?? '')
                    setEditBio(myProfile?.bio ?? '')
                    setEditLocation(myProfile?.location ?? '')
                    setEditing(true)
                  }}>
                  Modifier le profil
                </button>
              ) : (
                <button onClick={toggleFollow} style={{
                  width: '100%', padding: '10px', border: 'none',
                  borderRadius: 12, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: isFollowing
                    ? 'var(--bg4)'
                    : 'linear-gradient(135deg, #b96eff, #7b9fff)',
                  color: '#fff',
                  transition: 'opacity 0.15s',
                }}>
                  {isFollowing ? '✓ Abonné' : '+ Suivre'}
                </button>
              )}
            </div>
          </div>

          {/* Formulaire édition */}
          {editing && isOwnProfile && (
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg2)' }}>
              <div className="form-group">
                <label>Pseudo</label>
                <input value={editUsername} onChange={e => setEditUsername(e.target.value)} />
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
              <p className="empty-sub">
                {isOwnProfile ? 'Publie ton premier post sur Instagrim !' : 'Ce joueur n\'a pas encore posté.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {posts.map(post => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  style={{
                    aspectRatio: '1', background: 'var(--bg2)',
                    overflow: 'hidden', cursor: 'pointer', position: 'relative',
                  }}
                >
                  {post.image_url
                    ? <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--t3)' }}>🖼️</div>
                  }
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.2s',
                    fontSize: 12, color: '#fff', fontWeight: 700, gap: 6,
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                  >
                    ❤️ {post.likes ?? 0}
                  </div>
                </div>
              ))}
            </div>
          )}

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
