// Liste des applis du téléphone — icône, libellé, dégradé de fond
// Fichier partagé entre HomeScreen (grille d'accueil) et App (écran de chargement)
export const ALL_APPS = [
  { id: 'messages',  label: 'Messages',           icon: '💬', bg: 'linear-gradient(135deg,#1a1a3e,#0d1a2e)', badge: 2 },
  { id: 'phone',     label: 'Téléphone',          icon: '📞', bg: 'linear-gradient(135deg,#0d2818,#0a1f12)' },
  { id: 'instagrim', label: 'Capture',            icon: null, img: '/capture.png', bg: 'transparent', badge: 1 },
  { id: 'map',       label: 'Maps',               icon: null, img: '/maps.png', bg: 'transparent' },
  { id: 'crush',     label: 'Crush',              icon: null, img: '/crush.png', bg: 'transparent' },
  { id: 'id',        label: 'Mon Identité',       icon: null, img: '/monidentite.png', bg: 'transparent' },
  { id: 'store',     label: 'Store',              icon: '🛍️', bg: 'linear-gradient(135deg,#1a2e1a,#0a1f0a)' },
  { id: 'bank',      label: 'Desert Valley Bank', icon: null, img: '/desertvalleybank.png', bg: 'transparent' },
  { id: 'darkweb',   label: 'The Hollow',         icon: '🧅', bg: 'linear-gradient(135deg,#1a0a2e,#0a0510)' },
  { id: 'card',      label: 'Résumé',             icon: '🪄', bg: 'linear-gradient(135deg,#2a1a3e,#160a24)' },
  { id: 'notes',     label: 'Notes',              icon: '📝', bg: 'linear-gradient(135deg,#1f1a0a,#2a2210)' },
  { id: 'settings',  label: 'Réglages',           icon: '⚙️', bg: 'linear-gradient(135deg,#1a1a1a,#222)' },
  { id: 'mjpanel',   label: 'Panel MJ',           icon: '👑', bg: 'linear-gradient(135deg,#3e2a0a,#241a05)' },
]

export function getAppMeta(id) {
  return ALL_APPS.find(a => a.id === id)
}
