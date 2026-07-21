import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'

const MJ_DISCORD_ID = '804959890291294209'
const BANK_NAME = 'Desert Valley Bank'

export default function BankScreen({ onBack }) {
  const { user, profile, updateProfile } = useAuth()
  const [view, setView]           = useState('home') // 'home' | 'send' | 'savings' | 'mj-panel' | 'request' | 'receive'
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all') // 'all' | 'sent' | 'received'
  const [selectedTx, setSelectedTx] = useState(null)
  const [confirmSend, setConfirmSend] = useState(false)

  // Demandes d'argent
  const [pendingRequests, setPendingRequests] = useState([])
  const [reqSearch, setReqSearch]     = useState('')
  const [reqResults, setReqResults]   = useState([])
  const [reqTarget, setReqTarget]     = useState(null)
  const [reqAmount, setReqAmount]     = useState('')
  const [reqNote, setReqNote]         = useState('')
  const [reqSending, setReqSending]   = useState(false)

  // Panel MJ
  const [mjSearch, setMjSearch]     = useState('')
  const [mjResults, setMjResults]   = useState([])
  const [mjTarget, setMjTarget]     = useState(null)
  const [mjAmount, setMjAmount]     = useState('')
  const [mjNote, setMjNote]         = useState('')
  const [mjMode, setMjMode]         = useState('credit') // 'credit' | 'debit'
  const [mjLoading, setMjLoading]   = useState(false)

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
    fetchPendingRequests()
    const channel = supabase
      .channel('bank-transactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => fetchTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'money_requests' }, () => fetchPendingRequests())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchPendingRequests() {
    const { data } = await supabase
      .from('money_requests')
      .select('*')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (!data?.length) { setPendingRequests([]); return }
    const fromIds = [...new Set(data.map(r => r.from_user_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, avatar_url')
      .in('id', fromIds)
    const profilesMap = {}
    profilesData?.forEach(p => { profilesMap[p.id] = p })
    setPendingRequests(data.map(r => ({ ...r, fromProfile: profilesMap[r.from_user_id] })))
  }

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
      setRecipient(null); setAmount(''); setNote(''); setSearchQuery(''); setSearchResults([]); setConfirmSend(false)
      fetchTransactions()
    } catch (e) {
      setError('Erreur lors du transfert.')
    }
    setSending(false)
  }

  async function reqSearchUsers(query) {
    setReqSearch(query)
    if (query.trim().length < 2) { setReqResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, avatar_url')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', user.id)
      .limit(10)
    setReqResults(data ?? [])
  }

  async function sendRequest() {
    const amt = parseInt(reqAmount)
    if (!reqTarget || !amt || amt <= 0) return
    setReqSending(true)
    await supabase.from('money_requests').insert({
      from_user_id: user.id,
      to_user_id:   reqTarget.id,
      amount:       amt,
      note:         reqNote.trim(),
    })
    setToast(`✅ Demande de $${amt.toLocaleString()} envoyée à ${reqTarget.username}`)
    setTimeout(() => setToast(null), 3000)
    setReqTarget(null); setReqAmount(''); setReqNote(''); setReqSearch(''); setReqResults([])
    setView('home')
    setReqSending(false)
  }

  async function payRequest(request) {
    if (request.amount > balance) {
      setToast('❌ Solde insuffisant pour payer cette demande')
      setTimeout(() => setToast(null), 3000)
      return
    }
    await updateProfile({ balance: balance - request.amount })
    const { data: recipProfile } = await supabase.from('profiles').select('balance').eq('id', request.from_user_id).single()
    await supabase.from('profiles').update({ balance: (recipProfile?.balance ?? 0) + request.amount }).eq('id', request.from_user_id)
    await supabase.from('transactions').insert({
      from_user_id: user.id, to_user_id: request.from_user_id,
      amount: request.amount, type: 'transfer',
      note: request.note || 'Paiement de demande',
    })
    await supabase.from('money_requests').update({ status: 'paid' }).eq('id', request.id)
    setToast(`✅ $${request.amount.toLocaleString()} payés à ${request.fromProfile?.username}`)
    setTimeout(() => setToast(null), 3000)
    fetchTransactions()
    fetchPendingRequests()
  }

  async function declineRequest(request) {
    await supabase.from('money_requests').update({ status: 'declined' }).eq('id', request.id)
    fetchPendingRequests()
  }

  async function mjSearchUsers(query) {
    setMjSearch(query)
    if (query.trim().length < 2) { setMjResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, initials, avatar_color, avatar_url, balance')
      .ilike('username', `%${query.trim()}%`)
      .limit(10)
    setMjResults(data ?? [])
  }

  async function mjExecute() {
    const amt = parseInt(mjAmount)
    if (!mjTarget || !amt || amt <= 0) return
    setMjLoading(true)
    try {
      const currentBalance = mjTarget.balance ?? 0
      const newBalance = mjMode === 'credit' ? currentBalance + amt : Math.max(0, currentBalance - amt)

      await supabase.from('profiles').update({ balance: newBalance }).eq('id', mjTarget.id)
      await supabase.from('transactions').insert({
        from_user_id: mjMode === 'debit' ? mjTarget.id : null,
        to_user_id:   mjTarget.id,
        amount:       amt,
        type:         mjMode === 'credit' ? 'mj_credit' : 'mj_debit',
        note:         mjNote.trim() || (mjMode === 'credit' ? 'Crédit banque centrale' : 'Débit banque centrale'),
      })

      setToast(`✅ ${mjMode === 'credit' ? 'Crédité' : 'Débité'} : $${amt.toLocaleString()} pour ${mjTarget.username}`)
      setTimeout(() => setToast(null), 3000)
      setMjTarget(null); setMjAmount(''); setMjNote(''); setMjSearch(''); setMjResults([])
      fetchTransactions()
    } catch (e) {
      setToast('❌ Erreur MJ')
    }
    setMjLoading(false)
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

  // ── VUE PANEL MJ ──
  if (view === 'mj-panel') {
    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => { setView('home'); setMjTarget(null) }}>←</button>
            <span className="app-header-title" style={{ color: '#f59e0b' }}>⚙️ Panel MJ</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {!mjTarget ? (
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
                    value={mjSearch}
                    onChange={e => mjSearchUsers(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', color: 'var(--t1)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {mjResults.map(u => (
                  <div key={u.id} onClick={() => setMjTarget(u)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 14,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}>
                    <Avatar profile={u} size={40} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{u.username}</p>
                      <p style={{ fontSize: 11, color: 'var(--t3)' }}>Solde : ${(u.balance ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px', borderRadius: 16,
                  background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
                }}>
                  <Avatar profile={mjTarget} size={44} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{mjTarget.username}</p>
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>Solde actuel : ${(mjTarget.balance ?? 0).toLocaleString()}</p>
                  </div>
                  <button onClick={() => setMjTarget(null)} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 16, cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: 8, background: 'var(--bg2)', padding: 4, borderRadius: 14 }}>
                  {[['credit', '+ Créditer'], ['debit', '− Débiter']].map(([val, label]) => (
                    <button key={val} onClick={() => setMjMode(val)} style={{
                      flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                      background: mjMode === val ? (val === 'credit' ? '#22c55e' : '#ef4444') : 'transparent',
                      color: mjMode === val ? '#fff' : 'var(--t3)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{label}</button>
                  ))}
                </div>

                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: mjMode === 'credit' ? '#22c55e' : '#ef4444' }}>$</span>
                    <input
                      autoFocus
                      type="number"
                      value={mjAmount}
                      onChange={e => setMjAmount(e.target.value)}
                      placeholder="0"
                      style={{
                        width: 140, background: 'none', border: 'none',
                        fontSize: 36, fontWeight: 800, color: 'var(--t1)',
                        textAlign: 'center', outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>

                <input
                  placeholder="Raison (optionnel) — ex: Salaire, Amende…"
                  value={mjNote}
                  onChange={e => setMjNote(e.target.value)}
                  style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '10px 14px',
                    color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />

                <button
                  onClick={mjExecute}
                  disabled={mjLoading || !mjAmount}
                  style={{
                    padding: '14px', borderRadius: 14, border: 'none',
                    background: mjMode === 'credit'
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff', fontSize: 15, fontWeight: 800,
                    cursor: 'pointer', fontFamily: 'inherit',
                    opacity: mjAmount ? 1 : 0.5,
                  }}
                >
                  {mjLoading ? 'Traitement…' : `${mjMode === 'credit' ? 'Créditer' : 'Débiter'} $${mjAmount || 0}`}
                </button>
              </>
            )}
          </div>
          {toast && <Toast msg={toast} />}
        </div>
      </div>
    )
  }

  // ── VUE DÉTAIL TRANSACTION ──
  if (selectedTx) {
    const isSender = selectedTx.from_user_id === user.id
    const other = isSender ? selectedTx.toProfile : selectedTx.fromProfile
    const isCredit = !isSender

    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => setSelectedTx(null)}>←</button>
            <span className="app-header-title">Détail</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: isCredit ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `2px solid ${isCredit ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>
              {isCredit ? '↙️' : '↗️'}
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 34, fontWeight: 900, color: isCredit ? '#22c55e' : '#ef4444' }}>
                {isCredit ? '+' : '-'}${selectedTx.amount.toLocaleString()}
              </p>
              <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
                {new Date(selectedTx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DetailRow label={isCredit ? 'De' : 'Vers'} value={other?.username ?? ((selectedTx.type === 'mj_credit' || selectedTx.type === 'mj_debit') ? BANK_NAME : 'Inconnu')} />
              {selectedTx.note && <DetailRow label="Note" value={selectedTx.note} />}
              <DetailRow label="Type" value={
                selectedTx.type === 'transfer' ? 'Transfert entre joueurs' :
                selectedTx.type === 'mj_credit' ? 'Crédit banque centrale' :
                selectedTx.type === 'mj_debit' ? 'Débit banque centrale' : 'Achat'
              } />
              <DetailRow label="ID Transaction" value={selectedTx.id.slice(0, 8).toUpperCase()} mono />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── VUE DEMANDER ──
  if (view === 'request') {
    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => { setView('home'); setReqTarget(null) }}>←</button>
            <span className="app-header-title">Demander</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!reqTarget ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg2)', borderRadius: 14, padding: '10px 14px',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 16 }}>🔍</span>
                  <input
                    autoFocus
                    placeholder="Qui doit te payer ?"
                    value={reqSearch}
                    onChange={e => reqSearchUsers(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', color: 'var(--t1)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                {reqResults.map(u => (
                  <div key={u.id} onClick={() => setReqTarget(u)} style={{
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
                  background: 'rgba(77,217,255,0.06)', border: '1px solid rgba(77,217,255,0.15)',
                }}>
                  <Avatar profile={reqTarget} size={44} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{reqTarget.username}</p>
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>Va recevoir la demande</p>
                  </div>
                  <button onClick={() => setReqTarget(null)} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 16, cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Montant demandé</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: '#4dd9ff' }}>$</span>
                    <input
                      autoFocus type="number" value={reqAmount} onChange={e => setReqAmount(e.target.value)}
                      placeholder="0"
                      style={{ width: 160, background: 'none', border: 'none', fontSize: 40, fontWeight: 800, color: 'var(--t1)', textAlign: 'center', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                <input
                  placeholder="Pour quoi ? (optionnel)"
                  value={reqNote} onChange={e => setReqNote(e.target.value)}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                />

                <button onClick={sendRequest} disabled={reqSending || !reqAmount} style={{
                  marginTop: 'auto', padding: '14px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #4dd9ff, #2563eb)',
                  color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  opacity: reqAmount ? 1 : 0.5,
                }}>
                  {reqSending ? 'Envoi…' : `Demander $${reqAmount || 0}`}
                </button>
              </>
            )}
          </div>
          {toast && <Toast msg={toast} />}
        </div>
      </div>
    )
  }

  // ── VUE RECEVOIR (QR CODE) ──
  if (view === 'receive') {
    const idShort = user.id.slice(0, 8).toUpperCase()
    return (
      <div className="phone">
        <StatusBar />
        <div className="screen">
          <div className="app-header">
            <button className="icon-btn" onClick={() => setView('home')}>←</button>
            <span className="app-header-title">Recevoir</span>
            <span style={{ width: 32 }} />
          </div>

          <div style={{ flex: 1, padding: '30px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

            <Avatar profile={profile} size={64} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)' }}>{profile?.username}</p>
              <p style={{ fontSize: 12, color: 'var(--t3)' }}>Scanne pour envoyer de l'argent</p>
            </div>

            {/* QR Code visuel */}
            <div style={{
              width: 180, height: 180, background: '#fff', borderRadius: 20, padding: 12,
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 2,
            }}>
              {Array.from({ length: 144 }).map((_, i) => {
                // Motif pseudo-aléatoire mais stable basé sur l'user id
                const seed = (user.id.charCodeAt(i % user.id.length) + i * 7) % 3
                const isCorner = (i < 3 || i > 141 || i % 12 < 3 || i % 12 > 8) && (i < 39 || i > 105)
                return (
                  <div key={i} style={{
                    background: seed === 0 || isCorner && seed !== 2 ? '#000' : '#fff',
                    borderRadius: 1,
                  }} />
                )
              })}
            </div>

            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <p style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--t2)', letterSpacing: 1 }}>{idShort}</p>
              <button
                onClick={() => { navigator.clipboard?.writeText(user.id); setToast('📋 ID copié !'); setTimeout(() => setToast(null), 2000) }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer' }}
              >📋</button>
            </div>

            <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', lineHeight: 1.6 }}>
              Les autres joueurs peuvent te trouver en recherchant ton pseudo dans l'onglet Envoyer.
            </p>
          </div>
          {toast && <Toast msg={toast} />}
        </div>
      </div>
    )
  }

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
            <button className="icon-btn" onClick={() => { setView('home'); setRecipient(null); setAmount(''); setConfirmSend(false) }}>←</button>
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
                  <button onClick={() => { setRecipient(null); setConfirmSend(false) }} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 16, cursor: 'pointer' }}>✕</button>
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

                {!confirmSend ? (
                  <button
                    onClick={() => { if (amount && parseInt(amount) > 0) setConfirmSend(true) }}
                    disabled={!amount}
                    className="btn-primary"
                    style={{ marginTop: 'auto' }}
                  >
                    Continuer
                  </button>
                ) : (
                  <div style={{
                    marginTop: 'auto', background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', textAlign: 'center' }}>
                      Confirmer l'envoi de <span style={{ color: 'var(--accent)' }}>${parseInt(amount).toLocaleString()}</span> à <b>{recipient.username}</b> ?
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setConfirmSend(false)} style={{
                        flex: 1, padding: '12px', borderRadius: 12,
                        background: 'var(--glass)', border: '1px solid var(--border)',
                        color: 'var(--t2)', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>Annuler</button>
                      <button onClick={sendMoney} disabled={sending} className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                        {sending ? 'Envoi…' : 'Confirmer ✓'}
                      </button>
                    </div>
                  </div>
                )}
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
          {isMJ ? <button className="icon-btn" onClick={() => setView('mj-panel')}>⚙️</button> : <span style={{ width: 32 }} />}
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
          <div style={{ textAlign: 'center', padding: '0 20px 8px' }}>
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

          {/* Sparkline évolution */}
          <div style={{ padding: '0 20px 20px' }}>
            <Sparkline transactions={transactions} currentBalance={balance} userId={user.id} />
          </div>

          {/* ACTIONS — design premium */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: '0 20px 20px' }}>
            {[
              { icon: '↗️', label: 'Envoyer',  action: () => setView('send'), grad: 'linear-gradient(135deg, #b96eff, #7b9fff)' },
              { icon: '📷', label: 'Recevoir', action: () => setView('receive'), grad: 'linear-gradient(135deg, #4dd9ff, #2563eb)' },
              { icon: '🙋', label: 'Demander', action: () => setView('request'), grad: 'linear-gradient(135deg, #f59e0b, #d97706)' },
              { icon: '🏦', label: 'Épargne',  action: () => setView('savings'), grad: 'linear-gradient(135deg, #22c55e, #16a34a)' },
            ].map(a => (
              <button key={a.label} onClick={a.action} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                flex: 1,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16,
                  background: a.grad,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)' }}
                >{a.icon}</div>
                <span style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 700 }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Demandes en attente */}
          {pendingRequests.length > 0 && (
            <div style={{ padding: '0 16px 20px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, paddingLeft: 4 }}>
                🙋 Demandes en attente ({pendingRequests.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingRequests.map(r => (
                  <div key={r.id} style={{
                    background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 14, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <Avatar profile={r.fromProfile} size={36} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                        {r.fromProfile?.username} demande <span style={{ color: '#f59e0b' }}>${r.amount.toLocaleString()}</span>
                      </p>
                      {r.note && <p style={{ fontSize: 11, color: 'var(--t3)' }}>{r.note}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => declineRequest(r)} style={{
                        width: 30, height: 30, borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--glass)', color: 'var(--t3)', fontSize: 13, cursor: 'pointer',
                      }}>✕</button>
                      <button onClick={() => payRequest(r)} style={{
                        width: 30, height: 30, borderRadius: 10, border: 'none',
                        background: '#22c55e', color: '#fff', fontSize: 13, cursor: 'pointer',
                      }}>✓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HISTORIQUE */}
          <div style={{ padding: '0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingLeft: 4 }}>
                Transactions
              </p>
              <div style={{ display: 'flex', gap: 4 }}>
                {[['all','Tout'],['received','Reçu'],['sent','Envoyé']].map(([val, label]) => (
                  <button key={val} onClick={() => setHistoryFilter(val)} style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                    background: historyFilter === val ? 'var(--accent)' : 'var(--glass)',
                    color: historyFilter === val ? '#fff' : 'var(--t3)',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="spinner-wrap" style={{ padding: '20px 0' }}><div className="spinner" /></div>
            ) : (() => {
              const filteredTx = transactions.filter(t => {
                if (historyFilter === 'all') return true
                const isSender = t.from_user_id === user.id
                return historyFilter === 'sent' ? isSender : !isSender
              })
              if (filteredTx.length === 0) return (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--t3)' }}>
                  <p style={{ fontSize: 13 }}>Aucune transaction</p>
                </div>
              )
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredTx.map(t => {
                    const isSender = t.from_user_id === user.id
                    const other = isSender ? t.toProfile : t.fromProfile
                    const isCredit = !isSender

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTx(t)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {other
                          ? <Avatar profile={other} size={38} />
                          : <div style={{
                              width: 38, height: 38, borderRadius: '50%',
                              background: t.type === 'mj_credit' || t.type === 'mj_debit'
                                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                : 'linear-gradient(135deg, #b96eff, #7b9fff)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                            }}>{txIcon(t.type)}</div>
                        }
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                              {t.type === 'mj_credit' || t.type === 'mj_debit' ? BANK_NAME : other?.username ?? 'Inconnu'}
                            </p>
                            {(t.type === 'mj_credit' || t.type === 'mj_debit') && (
                              <span style={{
                                fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                                background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                              }}>BANQUE</span>
                            )}
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--t3)' }}>
                            {t.note || (isCredit ? 'Reçu' : 'Envoyé')} · {timeAgo(t.created_at)}
                          </p>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 800, color: isCredit ? '#22c55e' : '#ef4444' }}>
                          {isCredit ? '+' : '-'}${t.amount.toLocaleString()}
                        </p>
                        <span style={{ color: 'var(--t3)', fontSize: 14 }}>›</span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

        </div>

        {toast && <Toast msg={toast} />}
      </div>
    </div>
  )
}

function txIcon(type) {
  switch (type) {
    case 'mj_credit': return '💰'
    case 'mj_debit':  return '⚠️'
    case 'transfer':  return '🔄'
    case 'purchase':  return '🛍️'
    default:          return '🏦'
  }
}

// Petit graphique d'évolution du solde basé sur l'historique
function Sparkline({ transactions, currentBalance, userId }) {
  if (!transactions.length) return null

  // Reconstruire l'évolution du solde en remontant dans le temps
  const sorted = [...transactions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  let running = currentBalance
  const points = [running]
  // On recalcule à rebours depuis maintenant
  for (let i = sorted.length - 1; i >= 0; i--) {
    const t = sorted[i]
    const isCredit = t.to_user_id === userId
    running = isCredit ? running - t.amount : running + t.amount
    points.unshift(running)
  }

  const last7 = points.slice(-8)
  const max = Math.max(...last7, 1)
  const min = Math.min(...last7, 0)
  const range = max - min || 1

  const w = 260, h = 50
  const step = w / (last7.length - 1 || 1)
  const coords = last7.map((v, i) => [i * step, h - ((v - min) / range) * h])
  const pathD = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const areaD = `${pathD} L${w},${h} L0,${h} Z`

  const trending = last7[last7.length - 1] >= last7[0]

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <p style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Évolution récente
        </p>
        <p style={{ fontSize: 11, fontWeight: 700, color: trending ? '#22c55e' : '#ef4444' }}>
          {trending ? '↗' : '↘'} {trending ? 'En hausse' : 'En baisse'}
        </p>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trending ? '#22c55e' : '#ef4444'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trending ? '#22c55e' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#sparkGrad)" />
        <path d={pathD} fill="none" stroke={trending ? '#22c55e' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function DetailRow({ label, value, mono }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 14px', background: 'var(--bg2)', borderRadius: 12,
      border: '1px solid var(--border)',
    }}>
      <p style={{ fontSize: 12, color: 'var(--t3)' }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</p>
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
