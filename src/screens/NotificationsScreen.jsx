import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'

export default function NotificationsScreen({ onBack, onOpenProfile }) {
  const { user } = useAuth()
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifs()

    const channel = supabase
      .channel('notifs-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => fetchNotifs())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchNotifs() {
    const { data: notifsData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!notifsData?.length) { setNotifs([]); setLoading(false); return }

    // Fetch profils des expéditeurs
    const fromIds = [...new Set(notifsData.map(n => n.from_user_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, avatar_url')
      .in('id', fromIds)

    const profilesMap = {}
    profilesData?.forEach(p => { profilesMap[p.id] = p })

    // Fetch images des posts concernés
    const postIds = notifsData.filter(n => n.post_id).map(n => n.post_id)
    let postsMap = {}
    if (postIds.length > 0) {
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, image_url')
        .in('id', postIds)
      postsData?.forEach(p => { postsMap[p.id] = p })
    }

    const enriched = notifsData.map(n => ({
      ...n,
      fromProfile: profilesMap[n.from_user_id] ?? null,
      post: n.post_id ? postsMap[n.post_id] ?? null : null,
    }))

    setNotifs(enriched)
    setLoading(false)

    // Marquer tout comme lu
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  function notifText(notif) {
    switch (notif.type) {
      case 'like':    return 'a aimé votre photo.'
      case 'comment': return 'a commenté votre photo.'
      case 'follow':  return 'a commencé à vous suivre.'
      default:        return 'a interagi avec vous.'
    }
  }

  function notifIcon(type) {
    switch (type) {
      case 'like':    return '❤️'
      case 'comment': return '💬'
      case 'follow':  return '👤'
      default:        return '🔔'
    }
  }

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">Notifications</span>
          <span style={{ width: 32 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div className="spinner-wrap"><div className="spinner" /></div>}

          {!loading && notifs.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🤍</div>
              <p className="empty-title">Aucune notification</p>
              <p className="empty-sub">Quand quelqu'un like ou commente tes posts, tu le verras ici.</p>
            </div>
          )}

          {!loading && notifs.map(notif => (
            <div
              key={notif.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                background: notif.read ? 'transparent' : 'rgba(185,110,255,0.05)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => notif.fromProfile && onOpenProfile(notif.from_user_id)}
            >
              {/* Avatar avec badge */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar profile={notif.fromProfile} size={42} />
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  fontSize: 14, lineHeight: 1,
                }}>
                  {notifIcon(notif.type)}
                </div>
              </div>

              {/* Texte */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.4 }}>
                  <b>{notif.fromProfile?.username ?? 'Quelqu\'un'}</b>
                  {' '}{notifText(notif)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                  {timeAgo(notif.created_at)}
                </p>
              </div>

              {/* Miniature du post */}
              {notif.post?.image_url && (
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  overflow: 'hidden', flexShrink: 0,
                  background: 'var(--bg2)',
                }}>
                  <img
                    src={notif.post.image_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}
