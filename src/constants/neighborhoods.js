// 4 grands quartiers fictifs de Phoenix RP, chacun avec sa propre identité
// Fichier partagé entre MapScreen (affichage carte) et CharacterReservationScreen (choix résidence)
export const NEIGHBORHOODS = [
  {
    id: 'ember-district',
    name: 'Ember District',
    category: 'gouvernance', // Le cœur administratif et financier de la ville
    color: '#7a1024',
    // Quadrant nord-ouest — Glendale / Alhambra jusqu'au centre
    coords: [
      [-112.2500, 33.6200],
      [-112.0500, 33.6200],
      [-112.0500, 33.4600],
      [-112.2500, 33.4600],
      [-112.2500, 33.6200],
    ],
  },
  {
    id: 'sundown-strip',
    name: 'Sundown Strip',
    category: 'bar', // Le quartier de la vie nocturne et des divertissements
    color: '#c9963f',
    // Quadrant nord-est — du centre jusqu'à Paradise Valley / Scottsdale
    coords: [
      [-112.0500, 33.6200],
      [-111.8500, 33.6200],
      [-111.8500, 33.4600],
      [-112.0500, 33.4600],
      [-112.0500, 33.6200],
    ],
  },
  {
    id: 'ashland-row',
    name: 'Ashland Row',
    category: 'commerce', // La zone commerciale et industrielle
    color: '#22c55e',
    // Quadrant sud-est — South Mountain jusqu'à Tempe
    coords: [
      [-112.0500, 33.4600],
      [-111.8500, 33.4600],
      [-111.8500, 33.3000],
      [-112.0500, 33.3000],
      [-112.0500, 33.4600],
    ],
  },
  {
    id: 'willow-hollow',
    name: 'Willow Hollow',
    category: 'domicile', // Le grand quartier résidentiel
    color: '#4dd9ff',
    // Quadrant sud-ouest — Estrella / Laveen
    coords: [
      [-112.2500, 33.4600],
      [-112.0500, 33.4600],
      [-112.0500, 33.3000],
      [-112.2500, 33.3000],
      [-112.2500, 33.4600],
    ],
  },
]

// Petites descriptions narratives, utilisées par le Wiki
export const NEIGHBORHOOD_DESCRIPTIONS = {
  'ember-district': "Le cœur administratif et financier de Phoenix. Sièges d'entreprises, tribunaux et bureaux du gouvernement local se côtoient dans ce quartier aux allures de pouvoir.",
  'sundown-strip': "Le quartier qui ne dort jamais. Bars, clubs et néons — c'est ici que la ville se retrouve une fois la nuit tombée.",
  'ashland-row': "Zone commerciale et industrielle tentaculaire. Entrepôts, boutiques et ateliers y forment l'ossature économique de la ville.",
  'willow-hollow': "Le grand quartier résidentiel de Phoenix. Pavillons, immeubles et vie de quartier tranquille, loin de l'agitation du centre.",
}
