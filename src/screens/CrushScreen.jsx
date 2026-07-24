import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'

export default function CrushScreen({ onBack }) {
  const { user, profile } = useAuth()
  const [view, setView]           = useState('cards') // 'cards' | 'matches' | 'chat'
  const [cards, setCards]         = useState([])
  const [matches, setMatches]     = useState([])
  const [activeMatch, setActiveMatch] = useState(null)
  const [messages, setMessages]   = useState([])
  const [msgInput, setMsgInput]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [swipeDir, setSwipeDir]   = useState(null) // 'left' | 'right'
  const [unreadMatches, setUnreadMatches] = useState(0)
  const [showMatch, setShowMatch] = useState(null) // profil du match
  const msgEndRef = useRef(null)

  // Swipe touch
  const touchStart = useRef(null)
  const touchCurrent = useRef(null)
  const cardRef = useRef(null)

  useEffect(() => {
    fetchCards()
    fetchMatches()
  }, [])

  useEffect(() => {
    if (activeMatch) {
      fetchMessages(activeMatch.id)
      const channel = supabase
        .channel(`crush-chat-${activeMatch.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crush_messages', filter: `match_id=eq.${activeMatch.id}` },
          () => fetchMessages(activeMatch.id))
        .subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [activeMatch])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchCards() {
    // Récupérer tous les profils sauf soi-même
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', profile.id)

    // Récupérer les profils déjà swipés
    const { data: alreadySwiped } = await supabase
      .from('crush_likes')
      .select('to_user_id')
      .eq('from_user_id', profile.id)

    const swipedIds = new Set(alreadySwiped?.map(l => l.to_user_id) ?? [])
    const filtered = (allProfiles ?? []).filter(p => !swipedIds.has(p.id))

    // Mélanger
    setCards(filtered.sort(() => Math.random() - 0.5))
    setLoading(false)
  }

  async function fetchMatches() {
    const { data } = await supabase
      .from('crush_matches')
      .select('*, user1:user1_id(id,username,initials,avatar_color,avatar_url,bio,location), user2:user2_id(id,username,initials,avatar_color,avatar_url,bio,location)')
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
      .order('created_at', { ascending: false })

    // Formater pour afficher l'autre joueur
    const formatted = (data ?? []).map(m => ({
      ...m,
      otherProfile: m.user1_id === profile.id ? m.user2 : m.user1,
    }))

    setMatches(formatted)

    // Compter les messages non lus
    let unread = 0
    for (const m of formatted) {
      const { count } = await supabase
        .from('crush_messages')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', m.id)
        .eq('read', false)
        .neq('sender_id', profile.id)
      unread += count ?? 0
    }
    setUnreadMatches(unread)
  }

  async function fetchMessages(matchId) {
    const { data } = await supabase
      .from('crush_messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])

    // Marquer comme lus
    await supabase.from('crush_messages')
      .update({ read: true })
      .eq('match_id', matchId)
      .eq('read', false)
      .neq('sender_id', profile.id)
  }

  async function swipe(liked) {
    const card = cards[currentIdx]
    if (!card) return

    // Animation
    setSwipeDir(liked ? 'right' : 'left')
    await new Promise(r => setTimeout(r, 350))
    setSwipeDir(null)

    // Enregistrer le like/pass
    await supabase.from('crush_likes').insert({
      from_user_id: profile.id,
      to_user_id:   card.id,
      liked,
    })

    if (liked) {
      // Vérifier si l'autre a aussi liké
      const { data: mutual } = await supabase
        .from('crush_likes')
        .select('id')
        .eq('from_user_id', card.id)
        .eq('to_user_id', profile.id)
        .eq('liked', true)
        .maybeSingle()

      if (mutual) {
        // C'est un match !
        const u1 = profile.id < card.id ? profile.id : card.id
        const u2 = profile.id < card.id ? card.id : profile.id
        await supabase.from('crush_matches').insert({ user1_id: u1, user2_id: u2 })
        setShowMatch(card)
        fetchMatches()
      }
    }

    setCurrentIdx(prev => prev + 1)
  }

  async function sendMessage() {
    if (!msgInput.trim() || !activeMatch) return
    const content = msgInput.trim()
    setMsgInput('')
    await supabase.from('crush_messages').insert({
      match_id:  activeMatch.id,
      sender_id: profile.id,
      content,
    })
    fetchMessages(activeMatch.id)
  }

  // Touch handlers pour swipe mobile
  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX
    touchCurrent.current = e.touches[0].clientX
  }

  function onTouchMove(e) {
    touchCurrent.current = e.touches[0].clientX
    const delta = touchCurrent.current - touchStart.current
    if (cardRef.current) {
      const rotate = delta * 0.08
      cardRef.current.style.transform = `translateX(${delta}px) rotate(${rotate}deg)`
      cardRef.current.style.transition = 'none'
    }
  }

  function onTouchEnd() {
    const delta = (touchCurrent.current ?? 0) - (touchStart.current ?? 0)
    if (cardRef.current) {
      cardRef.current.style.transform = ''
      cardRef.current.style.transition = 'transform 0.3s ease'
    }
    if (Math.abs(delta) > 80) {
      swipe(delta > 0)
    }
    touchStart.current = null
  }

  const currentCard = cards[currentIdx]

  // ── VUE CHAT ──
  if (view === 'chat' && activeMatch) {
    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => { setView('matches'); setActiveMatch(null) }}>←</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar profile={activeMatch.otherProfile} size={28} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{activeMatch.otherProfile?.username}</span>
            </div>
            <span style={{ width: 32 }} />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, scrollbarWidth: 'none' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💝</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>C'est un match !</p>
                <p style={{ fontSize: 12, color: 'var(--t3)' }}>Envoie le premier message à {activeMatch.otherProfile?.username}</p>
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_id === profile.id
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && <Avatar profile={activeMatch.otherProfile} size={24} style={{ marginRight: 6, alignSelf: 'flex-end', flexShrink: 0 }} />}
                  <div style={{
                    maxWidth: '72%', padding: '9px 13px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMe
                      ? 'linear-gradient(135deg, #e91e8c, #ff6b6b)'
                      : 'rgba(255,255,255,0.08)',
                    border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    fontSize: 13, color: '#fff', lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </div>
                </div>
              )
            })}
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <div style={{
            display: 'flex', gap: 8, padding: '10px 12px 14px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>
            <input
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Message…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: '9px 14px',
                color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button onClick={sendMessage} style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, #e91e8c, #ff6b6b)',
              border: 'none', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>➤</button>
          </div>
        </div>
      </div>
    )
  }

  // ── VUE MATCHES ──
  if (view === 'matches') {
    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => setView('cards')}>←</button>
            <span className="app-header-title" style={{ background: 'linear-gradient(135deg,#e91e8c,#ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Matches</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {matches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💔</div>
                <p className="empty-title">Aucun match pour l'instant</p>
                <p className="empty-sub">Continue de swiper pour trouver ton crush RP !</p>
              </div>
            ) : (
              matches.map(m => (
                <div
                  key={m.id}
                  onClick={() => { setActiveMatch(m); setView('chat') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar profile={m.otherProfile} size={46} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{m.otherProfile?.username}</p>
                    {m.otherProfile?.location && (
                      <p style={{ fontSize: 11, color: 'var(--t3)' }}>📍 {m.otherProfile.location}</p>
                    )}
                    <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                      {m.otherProfile?.bio || 'Aucune bio'}
                    </p>
                  </div>
                  <span style={{ color: 'var(--t3)', fontSize: 18 }}>›</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── VUE CARTES ──
  return (
    <div className="phone">
      <StatusBar />
      <div className="screen" style={{ background: '#0a0008' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', flexShrink: 0,
        }}>
          <button className="icon-btn" onClick={onBack}>←</button>
          <p style={{
            fontSize: 22, fontWeight: 800, letterSpacing: -0.5,
            background: 'linear-gradient(135deg, #e91e8c, #ff6b6b)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>💘 Crush</p>
          <button
            className="icon-btn"
            style={{ position: 'relative' }}
            onClick={() => { setView('matches'); fetchMatches() }}
          >
            💬
            {unreadMatches > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                width: 14, height: 14, borderRadius: '50%',
                background: '#e91e8c', color: '#fff',
                fontSize: 8, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid #0a0008',
              }}>{unreadMatches}</span>
            )}
          </button>
        </div>

        {/* Cartes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px', position: 'relative' }}>

          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : !currentCard ? (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <p className="empty-title">Tu as tout vu !</p>
              <p className="empty-sub">Reviens plus tard pour de nouveaux profils.</p>
            </div>
          ) : (
            <>
              {/* Carte suivante (fond) */}
              {cards[currentIdx + 1] && (
                <div style={{
                  position: 'absolute', width: '100%', maxWidth: 280,
                  height: 380, borderRadius: 20,
                  background: 'var(--bg3)', transform: 'scale(0.95) translateY(10px)',
                  zIndex: 1,
                }}>
                  <CardContent profile={cards[currentIdx + 1]} />
                </div>
              )}

              {/* Carte active */}
              <div
                ref={cardRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{
                  position: 'relative', width: '100%', maxWidth: 280,
                  height: 380, borderRadius: 20, overflow: 'hidden',
                  zIndex: 2, cursor: 'grab',
                  transition: 'transform 0.3s ease',
                  animation: swipeDir
                    ? `swipe${swipeDir === 'right' ? 'Right' : 'Left'} 0.35s ease forwards`
                    : 'none',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                }}
              >
                <CardContent profile={currentCard} />

                {/* Indicateurs de swipe */}
                <div style={{
                  position: 'absolute', top: 20, left: 20,
                  background: '#22c55e', color: '#fff',
                  fontSize: 18, fontWeight: 800, padding: '6px 14px',
                  borderRadius: 10, border: '3px solid #22c55e',
                  opacity: swipeDir === 'right' ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}>LIKE 💚</div>
                <div style={{
                  position: 'absolute', top: 20, right: 20,
                  background: '#ef4444', color: '#fff',
                  fontSize: 18, fontWeight: 800, padding: '6px 14px',
                  borderRadius: 10, border: '3px solid #ef4444',
                  opacity: swipeDir === 'left' ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}>PASS ❌</div>
              </div>
            </>
          )}
        </div>

        {/* Boutons */}
        {currentCard && !loading && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 24,
            padding: '16px 0 24px', flexShrink: 0,
          }}>
            <button onClick={() => swipe(false)} style={{
              width: 58, height: 58, borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)',
              fontSize: 26, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.15s, background 0.15s',
              boxShadow: '0 4px 20px rgba(239,68,68,0.2)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
            >✕</button>

            <button onClick={() => swipe(true)} style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'linear-gradient(135deg, #e91e8c, #ff6b6b)',
              border: 'none', fontSize: 30, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(233,30,140,0.5)',
              transition: 'transform 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >💘</button>

            <button onClick={() => swipe(false)} style={{
              width: 58, height: 58, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)',
              fontSize: 22, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >⭐</button>
          </div>
        )}

      </div>

      {/* Popup match */}
      {showMatch && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: 24,
          animation: 'screenIn 0.4s ease',
        }}>
          <p style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg,#e91e8c,#ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            C'est un Match ! 💘
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <Avatar profile={profile} size={80} style={{ zIndex: 2 }} />
            <div style={{ fontSize: 28, marginLeft: -10, marginRight: -10, zIndex: 3 }}>💝</div>
            <Avatar profile={showMatch} size={80} style={{ zIndex: 2 }} />
          </div>

          <p style={{ fontSize: 14, color: 'var(--t2)', textAlign: 'center', lineHeight: 1.6 }}>
            Toi et <b style={{ color: '#fff' }}>{showMatch.username}</b> vous vous êtes likés mutuellement !
          </p>

          <button
            onClick={() => {
              const m = matches.find(m => m.otherProfile?.id === showMatch.id)
              setShowMatch(null)
              if (m) { setActiveMatch(m); setView('chat') }
              else { fetchMatches().then(() => setView('matches')) }
            }}
            style={{
              padding: '14px 32px', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #e91e8c, #ff6b6b)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 24px rgba(233,30,140,0.4)',
            }}
          >
            💬 Envoyer un message
          </button>

          <button onClick={() => setShowMatch(null)} style={{
            background: 'none', border: 'none', color: 'var(--t3)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Continuer à swiper
          </button>
        </div>
      )}
    </div>
  )
}

// Composant carte de profil
function CardContent({ profile }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Fond / photo */}
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${profile.avatar_color ?? '#e91e8c'}88, #0a0008)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: profile.avatar_color ?? '#e91e8c',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, fontWeight: 800, color: '#fff',
            }}>
              {profile.initials ?? '?'}
            </div>
          </div>
      }

      {/* Dégradé bas */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, transparent 100%)',
      }} />

      {/* Infos */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          {profile.username}
        </p>
        {profile.location && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
            📍 {profile.location}
          </p>
        )}
        {profile.bio && (
          <p style={{
            fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {profile.bio}
          </p>
        )}
      </div>
    </div>
  )
}
