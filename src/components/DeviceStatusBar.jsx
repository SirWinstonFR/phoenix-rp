import Avatar from './Avatar'

export default function DeviceStatusBar({ profile, characters, switchCharacter, onOpenWiki, onSwitchToDesktop, signOut }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', width: 300,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, backdropFilter: 'blur(12px)',
      fontFamily: 'Inter, sans-serif',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <Avatar profile={profile} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f2ee', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {profile?.username ?? 'Joueur'}
        </p>
        {profile?.location && (
          <p style={{ fontSize: 11, color: 'rgba(245,242,238,0.5)' }}>📍 {profile.location}</p>
        )}
      </div>

      {characters.length > 1 && (
        <button onClick={switchCharacter} title="Changer de personnage" style={{
          background: 'rgba(123,159,255,0.1)', border: '1px solid rgba(123,159,255,0.2)',
          borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700,
          color: '#7b9fff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}>👥</button>
      )}
      {onOpenWiki && (
        <button onClick={onOpenWiki} title="Aide / Wiki" style={{
          background: 'rgba(232,117,44,0.1)', border: '1px solid rgba(232,117,44,0.2)',
          borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700,
          color: '#f5a052', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}>❓</button>
      )}
      {onSwitchToDesktop && (
        <button onClick={onSwitchToDesktop} title="Mode Bureau" style={{
          background: 'rgba(185,110,255,0.1)', border: '1px solid rgba(185,110,255,0.2)',
          borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700,
          color: '#b96eff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}>🖥️</button>
      )}
      <button onClick={signOut} title="Se déconnecter" style={{
        background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.2)',
        borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700,
        color: '#ff5252', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
      }}>🔒</button>
    </div>
  )
}
