import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import StatusBar from '../components/StatusBar'
import Avatar from '../components/Avatar'

export default function MJDashboardScreen({ onBack }) {
  const { profile } = useAuth()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchPending()
    const channel = supabase
      .channel('mj-reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchPending())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchPending() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('character_status', 'pending')
      .order('created_at', { ascending: true })
    setPending(data ?? [])
    setLoading(false)
  }

  async function approve(char) {
    setProcessingId(char.id)
    await supabase
      .from('profiles')
      .update({ character_status: 'active', setup_complete: true })
      .eq('id', char.id)
    setToast(`✅ ${char.username} approuvé`)
    setTimeout(() => setToast(null), 2500)
    setProcessingId(null)
  }

  async function reject(char) {
    setProcessingId(char.id)
    await supabase
      .from('profiles')
      .update({ character_status: 'rejected' })
      .eq('id', char.id)
    setToast(`🗑️ ${char.username} refusé`)
    setTimeout(() => setToast(null), 2500)
    setProcessingId(null)
  }

  return (
    <div className="phone">
      <StatusBar />
      <div className="screen" style={{ background: 'var(--bg)' }}>

        <div className="app-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <span className="app-header-title">⚙️ Panel MJ</span>
          <span style={{ width: 32 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          <p style={{
            fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 12,
          }}>
            Réservations en attente {pending.length > 0 && `(${pending.length})`}
          </p>

          {loading ? (
            <div className="spinner-wrap" style={{ padding: '30px 0' }}><div className="spinner" /></div>
          ) : pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--t3)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <p style={{ fontSize: 13 }}>Aucune réservation en attente</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map(char => (
                <div key={char.id} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '14px 16px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar profile={char} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{char.username}</p>
                      <p style={{ fontSize: 11, color: 'var(--t3)' }}>
                        {char.first_name} {char.last_name}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--bg3)', borderRadius: 10, padding: '8px 12px',
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>Souhait de job</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>
                      {char.job_wish || '—'}
                    </span>
                  </div>

                  <p style={{ fontSize: 10, color: 'var(--t3)' }}>
                    Demandé {timeAgo(char.created_at)}
                  </p>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => reject(char)}
                      disabled={processingId === char.id}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 12,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#f87171', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      ✕ Refuser
                    </button>
                    <button
                      onClick={() => approve(char)}
                      disabled={processingId === char.id}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        color: '#fff', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {processingId === char.id ? '…' : '✓ Approuver'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
