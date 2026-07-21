import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'

const MJ_DISCORD_ID = '804959890291294209'

export default function BankScreen({ onBack }) {
  const { user, profile, updateProfile } = useAuth()
  const [view, setView]           = useState('home') // 'home' | 'send' | 'search' | 'mj-panel'
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [cardFlipped, setCardFlipped] = useState(false)

  // Envoi d'argent
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [recipient, setRecipient]       = useState(null)
  const [amount, setAmount]             = useState('')
  const [note, setNote]                 = useState('')
  const [sending, setSending]           = useState(false)
  const [error, setError]               = useState('')
  const [toast, setToast]               = useState(null)

  const isMJ = profile?.discord_id === MJ_DISCORD_ID
  const balance = profile?.balance ?? 0

  useEffect(() => {
    fetchTransactions()
    const channel = supabase
      .channel('bank-transactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
        // Le profil se met à jour automatiquement via le contexte
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data?.length) { setTransactions([]); setLoading(false); return }

    // Récupérer les profils concernés
    const userIds = [...new Set(data.flatMap(t => [t.from_user_id, t.to_user_id]).filter(Boolean))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, avatar_url')
      .in('id', userIds)

    const profilesMap = {}
    profilesData?.forEach(p => { profilesMap[p.id] = p })

    setTransactions(data.map(t => ({
      ...t,
      fromProfile: t.from_user_id ? profilesMap[t.from_user_id] : null,
      toProfile:   profilesMap[t.to_user_id] ?? null,
    })))
    setLoading(false)
  }

  async function searchUsers(query) {
    setSearchQuery(query)
    if (query.trim().length < 2) { setSearchResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, avatar_url')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', user.id)
      .limit(10)
    setSearchResults(data ?? [])
  }

  async function sendMoney() {
    const amt = parseInt(amount)
    if (!recipient || !amt || amt <= 0) { setError('Montant invalide.'); return }
    if (amt > balance) { setError('Solde insuffisant.'); return }

    setSending(true)
    setError('')
    try {
      // Déduire de l'expéditeur
      await updateProfile({ balance: balance - amt })

      // Créditer le destinataire
      const { data: recipProfile } = await supabase
        .from('profiles').select('balance').eq('id', recipient.id).single()
      await supabase.from('profiles')
        .update({ balance: (recipProfile?.balance ?? 0) + amt })
        .eq('id', recipient.id)

      // Enregistrer la transaction
      await supabase.from('transactions').insert({
        from_user_id: user.id,
        to_user_id:   recipient.id,
        amount:       amt,
        type:         'transfer',
        note:         note.trim(),
      })

      setToast(`✅ $${amt.toLocaleString()} envoyés à ${recipient.username}`)
      setTimeout(() => setToast(null), 3000)
      setView('home')
      setRecipient(null); setAmount(''); setNote(''); setSearchQuery(''); setSearchResults([])
      fetchTransactions()
    } catch (e) {
      setError('Erreur lors du transfert.')
    }
    setSending(false)
  }

  const cardNumber = profile?.id_number
    ? profile.id_number.replace(/[^A-Z0-9]/g, '').padEnd(16, '0').slice(0, 16).match(/.{1,4}/g).join(' ')
    : '•••• •••• •••• ••••'

  // ── VUE ENVOYER ──
  if (view === 'send') {
    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => { setView('home'); setRecipient(null); setAmount('') }}>←</button>
            <span className="app-header-title">Envoyer</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {!recipient ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg2)', borderRadius: 14, padding: '10px 14px',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 16 }}>🔍</span>
                  <input
                    autoFocus
                    placeholder="Rechercher un joueur…"
                    value={searchQuery}
                    onChange={e => searchUsers(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', color: 'var(--t1)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {searchResults.map(u => (
                  <div key={u.id} onClick={() => setRecipient(u)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 14,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}>
                    <Avatar profile={u} size={40} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{u.username}</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                {/* Destinataire choisi */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px', borderRadius: 16,
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                }}>
                  <Avatar profile={recipient} size={44} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{recipient.username}</p>
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>Destinataire</p>
                  </div>
                  <button onClick={() => setRecipient(null)} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 16, cursor: 'pointer' }}>✕</button>
                </div>

                {/* Montant */}
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Montant à envoyer</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>$</span>
                    <input
                      autoFocus
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      style={{
                        width: 160, background: 'none', border: 'none',
                        fontSize: 40, fontWeight: 800, color: 'var(--t1)',
                        textAlign: 'center', outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>
                    Solde disponible : ${balance.toLocaleString()}
                  </p>
                </div>

                <input
                  placeholder="Ajouter une note (optionnel)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '10px 14px',
                    color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />

                {error && <p className="form-error">{error}</p>}

                <button
                  onClick={sendMoney}
                  disabled={sending || !amount}
                  className="btn-primary"
                  style={{ marginTop: 'auto' }}
                >
                  {sending ? 'Envoi…' : `Envoyer $${amount || 0}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── VUE ACCUEIL BANQUE ──
  return (
    <div className="phone">
      <StatusBar />
      <div className="screen" style={{ background: 'linear-gradient(180deg, #0a0a14 0%, #050508 100%)' }}>

        <div className="app-header" style={{ background: 'transparent', border: 'none' }}>
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">💳 Banque</span>
          {isMJ ? (
            <button className="icon-btn" onClick={() => setView('mj-panel')}>⚙️</button>
          ) : <span style={{ width: 32 }} />}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

          {/* ── CARTE VIRTUELLE ── */}
          <div style={{ padding: '10px 20px 20px', display: 'flex', justifyContent: 'center' }}>
            <div
              onClick={() => setCardFlipped(f => !f)}
              style={{ width: '100%', maxWidth: 280, perspective: 1000, cursor: 'pointer' }}
            >
              <div style={{
                position: 'relative', transformStyle: 'preserve-3d',
                transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
                transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
                height: 175,
              }}>
                {/* RECTO */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                  borderRadius: 20, padding: '20px 22px',
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d18 60%, #000 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  overflow: 'hidden',
                }}>
                  {/* Motif décoratif */}
                  <div style={{
                    position: 'absolute', top: -40, right: -40, width: 160, height: 160,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(185,110,255,0.15), transparent 70%)',
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                    <p style={{
                      fontSize: 15, fontWeight: 800, letterSpacing: -0.5,
                      background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Phoenix Bank</p>
                    <span style={{ fontSize: 20 }}>💳</span>
                  </div>

                  <div style={{ zIndex: 1 }}>
                    <p style={{
                      fontSize: 15, fontFamily: 'monospace', letterSpacing: 2,
                      color: 'rgba(255,255,255,0.85)', marginBottom: 10,
                    }}>{showBalance ? cardNumber : '•••• •••• •••• ••••'}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 2 }}>CARD HOLDER</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>
                          {profile?.username?.toUpperCase() ?? '—'}
                        </p>
                      </div>
                      <p style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>VISA</p>
                    </div>
                  </div>
                </div>

                {/* VERSO */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d18 60%, #000 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ height: 36, background: '#111', marginTop: 18 }} />
                  <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{
                      height: 28, background: 'rgba(255,255,255,0.9)', borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px',
                    }}>
                      <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#111', fontWeight: 700 }}>
                        {profile?.id_number?.slice(-3) ?? '000'}
                      </p>
                    </div>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                      This card is property of Phoenix Bank. Use of this card is subject to the terms of the cardholder agreement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SOLDE ── */}
          <div style={{ textAlign: 'center', padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 12, color: 'var(--t3)' }}>Solde disponible</p>
              <button onClick={() => setShowBalance(!showBalance)} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}>
                {showBalance ? '👁️' : '🙈'}
              </button>
            </div>
            <p style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>
              {showBalance ? `$${balance.toLocaleString()}` : '••••••'}
            </p>
          </div>

          {/* ── ACTIONS ── */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '0 20px 24px' }}>
            {[
              { icon: '↗️', label: 'Envoyer', action: () => setView('send') },
              { icon: '↙️', label: 'Recevoir', action: () => setToast('📋 Ton ID a été copié !') },
              { icon: '📊', label: 'Activité', action: () => {} },
            ].map(a => (
              <button key={a.label} onClick={a.action} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, transition: 'background 0.15s',
                }}>{a.icon}</div>
                <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 600 }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* ── HISTORIQUE ── */}
          <div style={{ padding: '0 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, paddingLeft: 4 }}>
              Transactions récentes
            </p>

            {loading ? (
              <div className="spinner-wrap" style={{ padding: '20px 0' }}><div className="spinner" /></div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--t3)' }}>
                <p style={{ fontSize: 13 }}>Aucune transaction pour l'instant</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {transactions.map(t => {
                  const isSender = t.from_user_id === user.id
                  const other = isSender ? t.toProfile : t.fromProfile
                  const isCredit = !isSender

                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 8px', borderRadius: 12,
                    }}>
                      {other
                        ? <Avatar profile={other} size={38} />
                        : <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                          }}>🏦</div>
                      }
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                          {t.type === 'mj_credit' ? 'Banque Centrale' : other?.username ?? 'Inconnu'}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--t3)' }}>
                          {t.note || (isCredit ? 'Reçu' : 'Envoyé')} · {timeAgo(t.created_at)}
                        </p>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: isCredit ? '#22c55e' : '#ef4444' }}>
                        {isCredit ? '+' : '-'}${t.amount.toLocaleString()}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {toast && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '10px 18px',
            fontSize: 13, fontWeight: 700, color: 'var(--t1)',
            zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            whiteSpace: 'nowrap',
          }}>{toast}</div>
        )}
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
