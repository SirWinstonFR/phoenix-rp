import { useState } from 'react'
import { NEIGHBORHOODS, NEIGHBORHOOD_DESCRIPTIONS } from '../constants/neighborhoods'

const SECTIONS = [
  { id: 'guide',        label: 'Comment jouer',  icon: '🧭' },
  { id: 'neighborhoods', label: 'Quartiers',      icon: '🏘️' },
  { id: 'apps',          label: 'Applications',   icon: '📱' },
  { id: 'faq',           label: 'FAQ',            icon: '❓' },
]

export default function WikiPanel({ onClose }) {
  const [section, setSection] = useState('guide')

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 360, maxWidth: '92vw',
      background: 'rgba(8,6,5,0.97)', backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
      zIndex: 500, display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif', color: '#f5f2ee',
      animation: 'wikiSlideIn 0.3s cubic-bezier(0.22,1,0.36,1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,160,82,0.8)', letterSpacing: '0.12em' }}>
            AIDE
          </p>
          <p style={{ fontSize: 19, fontWeight: 800 }}>Wiki Phoenix RP</p>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', color: 'rgba(245,242,238,0.6)',
          fontSize: 15, cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Onglets de sections */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 20px 0', overflowX: 'auto' }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              padding: '8px 13px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 700,
              background: section === s.id ? '#e8752c' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${section === s.id ? '#e8752c' : 'rgba(255,255,255,0.1)'}`,
              color: section === s.id ? '#fff' : 'rgba(245,242,238,0.55)',
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {section === 'guide' && <GuideSection />}
        {section === 'neighborhoods' && <NeighborhoodsSection />}
        {section === 'apps' && <AppsSection />}
        {section === 'faq' && <FaqSection />}
      </div>

      <style>{`
        @keyframes wikiSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function GuideSection() {
  const steps = [
    { title: 'Crée ton personnage', text: "Remplis le formulaire de réservation avec prénom, nom et photo. Le MJ valide ta fiche avant qu'elle devienne jouable." },
    { title: 'Explore ton téléphone', text: "Chaque appli reflète une facette de ta vie RP : Capture pour le réseau social, Carte pour te situer, Banque pour ton argent." },
    { title: 'Écris en RP', text: "Rends-toi dans les salons Discord correspondant aux lieux de la carte. Ton personnage s'y déplace automatiquement." },
    { title: 'Progresse', text: "Chaque message RP donne de l'XP (selon sa longueur). Monte de niveau pour débloquer des personnages supplémentaires." },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 12 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(232,117,44,0.15)', border: '1px solid rgba(232,117,44,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#f5a052',
          }}>{i + 1}</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{s.title}</p>
            <p style={{ fontSize: 12, color: 'rgba(245,242,238,0.5)', lineHeight: 1.6 }}>{s.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function NeighborhoodsSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {NEIGHBORHOODS.map(n => (
        <div key={n.id} style={{
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${n.color}33`,
          borderRadius: 14, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.color }} />
            <p style={{ fontSize: 14, fontWeight: 800 }}>{n.name}</p>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(245,242,238,0.55)', lineHeight: 1.6 }}>
            {NEIGHBORHOOD_DESCRIPTIONS[n.id]}
          </p>
        </div>
      ))}
    </div>
  )
}

function AppsSection() {
  const apps = [
    { icon: '📷', name: 'Capture', text: 'Réseau social — poste, like, commente, suis d\'autres joueurs.' },
    { icon: '🗺️', name: 'Carte',   text: 'Situe-toi, découvre les quartiers, place des lieux RP.' },
    { icon: '💘', name: 'Crush',   text: 'Rencontres et messagerie type Tinder.' },
    { icon: '💳', name: 'Banque',  text: 'Solde, virements, épargne, bourse.' },
    { icon: '🪪', name: 'ID Card', text: 'Carte d\'identité officielle de ton personnage.' },
    { icon: '🛍️', name: 'Store',   text: 'Change de modèle de téléphone.' },
    { icon: '🪄', name: 'Résumé',  text: 'Fiche personnage animée avec tes statistiques.' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {apps.map(a => (
        <div key={a.name} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20 }}>{a.icon}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</p>
            <p style={{ fontSize: 12, color: 'rgba(245,242,238,0.5)', lineHeight: 1.5 }}>{a.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function FaqSection() {
  const faqs = [
    { q: 'Comment avoir un second personnage ?', a: "Monte de niveau en écrivant en RP sur Discord. Chaque palier (niveau 5, 10, 15…) débloque un slot supplémentaire." },
    { q: 'Ma réservation met du temps à être validée ?', a: 'Le MJ valide manuellement chaque personnage. Sois patient, ça arrive !' },
    { q: 'Je ne trouve plus mon personnage ?', a: "Vérifie que tu as bien sélectionné le bon via le bouton 👥 sur l'accueil." },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {faqs.map((f, i) => (
        <div key={i}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{f.q}</p>
          <p style={{ fontSize: 12, color: 'rgba(245,242,238,0.5)', lineHeight: 1.6 }}>{f.a}</p>
        </div>
      ))}
    </div>
  )
}
