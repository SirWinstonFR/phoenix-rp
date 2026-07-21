import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'

const MJ_DISCORD_ID = '804959890291294209'
const BANK_NAME = 'Desert Valley Bank'

export default function BankScreen({ onBack }) {
  const { user, profile, updateProfile } = useAuth()
  const [view, setView]           = useState('home') // 'home' | 'send' | 'savings'
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [cardFlipped, setCardFlipped] = useState(false)

  const [savings, setSavings]     = useState(0)
  const [savingsAmount, setSavingsAmount] = useState('')
  const [savingsLoading, setSavingsLoading] = useState(false)
  const [savingsMode, setSavingsMode] = useState('deposit') // 'deposit' | 'withdraw'

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
    fetchSavings()
    const channel = supabase
      .channel('bank-transactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => fetchTransactions())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchSavings() {
    const { data } = await supabase.from('savings').select('balance').eq('user_id', user.id).maybeSingle()
    if (data) setSavings(data.balance)
    else {
      await supabase.from('savings').insert({ user_id: user.id, balance: 0 })
      setSavings(0)
    }
  }

  async function fetchTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data?.length) { setTransactions([]); setLoading(false); return }

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
      await updateProfile({ balance: balance - amt })
      const { data: recipProfile } = await supabase.from('profiles').select('balance').eq('id', recipient.id).single()
      await supabase.from('profiles').update({ balance: (recipProfile?.balance ?? 0) + amt }).eq('id', recipient.id)
      await supabase.from('transactions').insert({
        from_user_id: user.id, to_user_id: recipient.id, amount: amt, type: 'transfer', note: note.trim(),
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

  async function handleSavingsAction() {
    const amt = parseInt(savingsAmount)
    if (!amt || amt <= 0) return
    setSavingsLoading(true)

    if (savingsMode === 'deposit') {
      if (amt > balance) { setToast('❌ Solde insuffisant'); setTimeout(() => setToast(null), 2500); setSavingsLoading(false); return }
      await updateProfile({ balance: balance - amt })
      await supabase.from('savings').update({ balance: savings + amt }).eq('user_id', user.id)
      setSavings(prev => prev + amt)
      setToast(`💰 $${amt.toLocaleString()} déposés en épargne`)
    } else {
      if (amt > savings) { setToast('❌ Épargne insuffisante'); setTimeout(() => setToast(null), 2500); setSavingsLoading(false); return }
      await updateProfile({ balance: balance + amt })
      await supabase.from('savings').update({ balance: savings - amt }).eq('user_id', user.id)
      setSavings(prev => prev - amt)
      setToast(`✅ $${amt.toLocaleString()} retirés de l'épargne`)
    }
    setTimeout(() => setToast(null), 2500)
    setSavingsAmount('')
    setSavingsLoading(false)
  }

  // Numéro de carte 100% numérique généré depuis l'user id
  const cardDigits = (user?.id ?? '0000000000000000').replace(/[^0-9]/g, '').padEnd(16, '4').slice(0, 16)
  const cardNumber = cardDigits.match(/.{1,4}/g).join(' ')

  // ── VUE ÉPARGNE ──
  if (view === 'savings') {
    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => setView('home')}>←</button>
            <span className="app-header-title">Épargne</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Coffre visuel */}
            <div style={{
              background: 'linear-gradient(150deg, #0d2818 0%, #051208 100%)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 22, padding: '28px 20px',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.12), transparent 70%)' }} />
              <p style={{ fontSize: 32, marginBottom: 8 }}>🏦</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 6 }}>ÉPARGNE TOTALE</p>
              <p style={{ fontSize: 34, fontWeight: 900, color: '#4ade80', letterSpacing: -1 }}>
                ${savings.toLocaleString()}
              </p>
            </div>

            {/* Toggle deposit/withdraw */}
            <div style={{ display: 'flex', gap: 8, background: 'var(--bg2)', padding: 4, borderRadius: 14 }}>
              {[['deposit', '↓ Déposer'], ['withdraw', '↑ Retirer']].map(([val, label]) => (
                <button key={val} onClick={() => setSavingsMode(val)} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: savingsMode === val ? (val === 'deposit' ? '#22c55e' : '#f59e0b') : 'transparent',
                  color: savingsMode === val ? '#fff' : 'var(--t3)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}>{label}</button>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>
                {savingsMode === 'deposit' ? 'Montant à déposer' : 'Montant à retirer'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: savingsMode === 'deposit' ? '#22c55e' : '#f59e0b' }}>$</span>
                <input
                  type="number"
                  value={savingsAmount}
                  onChange={e => setSavingsAmount(e.target.value)}
                  placeholder="0"
                  style={{
                    width: 140, background: 'none', border: 'none',
                    fontSize: 36, fontWeight: 800, color: 'var(--t1)',
                    textAlign: 'center', outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                Disponible : ${(savingsMode === 'deposit' ? balance : savings).toLocaleString()}
              </p>
            </div>

            <button
              onClick={handleSavingsAction}
              disabled={savingsLoading || !savingsAmount}
              style={{
                padding: '14px', borderRadius: 14, border: 'none',
                background: savingsMode === 'deposit'
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: savingsMode === 'deposit' ? '0 8px 24px rgba(34,197,94,0.35)' : '0 8px 24px rgba(245,158,11,0.35)',
                opacity: savingsAmount ? 1 : 0.5,
              }}
            >
              {savingsLoading ? 'Traitement…' : savingsMode === 'deposit' ? 'Déposer en épargne' : 'Retirer de l\'épargne'}
            </button>
          </div>

          {toast && <Toast msg={toast} />}
        </div>
      </div>
    )
  }

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

                <button onClick={sendMoney} disabled={sending || !amount} className="btn-primary" style={{ marginTop: 'auto' }}>
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
          <span className="app-header-title">💳 {BANK_NAME}</span>
          {isMJ ? <button className="icon-btn">⚙️</button> : <span style={{ width: 32 }} />}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

          {/* CARTE */}
          <div style={{ padding: '10px 20px 20px', display: 'flex', justifyContent: 'center' }}>
            <div onClick={() => setCardFlipped(f => !f)} style={{ width: '100%', maxWidth: 280, perspective: 1000, cursor: 'pointer' }}>
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
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,110,255,0.15), transparent 70%)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 800, letterSpacing: -0.3,
                      background: 'linear-gradient(135deg, #b96eff, #7b9fff)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>{BANK_NAME}</p>
                    <span style={{ fontSize: 20 }}>💳</span>
                  </div>

                  <div style={{ zIndex: 1 }}>
                    <p style={{
                      fontSize: 16, fontFamily: 'monospace', letterSpacing: 2,
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
                        {cardDigits.slice(-3)}
                      </p>
                    </div>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                      This card is property of {BANK_NAME}. Use of this card is subject to the terms of the cardholder agreement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SOLDE */}
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
            {savings > 0 && (
              <p style={{ fontSize: 12, color: '#4ade80', marginTop: 4, fontWeight: 600 }}>
                + ${savings.toLocaleString()} en épargne
              </p>
            )}
          </div>

          {/* ACTIONS — design premium */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: '0 20px 28px' }}>
            {[
              { icon: '↗️', label: 'Envoyer',  action: () => setView('send'), grad: 'linear-gradient(135deg, #b96eff, #7b9fff)' },
              { icon: '🏦', label: 'Épargne',  action: () => setView('savings'), grad: 'linear-gradient(135deg, #22c55e, #16a34a)' },
              { icon: '📋', label: 'Copier ID', action: () => { navigator.clipboard?.writeText(user.id); setToast('📋 ID copié !'); setTimeout(() => setToast(null), 2000) }, grad: 'linear-gradient(135deg, #4dd9ff, #2563eb)' },
            ].map(a => (
              <button key={a.label} onClick={a.action} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                flex: 1,
              }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 18,
                  background: a.grad,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)' }}
                >{a.icon}</div>
                <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 700 }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* HISTORIQUE */}
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
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12 }}>
                      {other
                        ? <Avatar profile={other} size={38} />
                        : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #b96eff, #7b9fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏦</div>
                      }
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                          {t.type === 'mj_credit' ? BANK_NAME : other?.username ?? 'Inconnu'}
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

        {toast && <Toast msg={toast} />}
      </div>
    </div>
  )
}

function Toast({ msg }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '10px 18px',
      fontSize: 13, fontWeight: 700, color: 'var(--t1)',
      zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      whiteSpace: 'nowrap', animation: 'fadeDown 0.2s ease',
    }}>{msg}</div>
  )
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}
