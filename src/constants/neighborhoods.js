// 5 quartiers de Phoenix RP — 4 grands quadrants + 1 quartier central
// Contours calés sur les vraies autoroutes qui structurent la ville :
//   I-17 (Black Canyon Fwy)   → limite ouest du centre-ville, ~ -112.087
//   SR-51 (Piestewa Fwy)      → limite est du centre-ville, ~ -112.040
//   I-10 (Papago Fwy)         → limite sud du centre-ville, ~ 33.4409
//   McDowell Rd               → limite nord du centre-ville, ~ 33.4696
// (Loop 101 sert de limite extérieure nord, approximative)
// Fichier partagé entre MapScreen (affichage carte) et CharacterReservationScreen (choix résidence)
export const NEIGHBORHOODS = [
  {
    id: 'ember-district',
    name: 'Ember District',
    category: 'gouvernance', // Le cœur administratif et financier de la ville
    color: '#7a1024',
    // Quart nord-ouest, borné à l'est par I-17 puis le centre-ville
    coords: [
      [-112.2500, 33.4409],
      [-112.0870, 33.4409],
      [-112.0870, 33.4696],
      [-112.0635, 33.4696],
      [-112.0635, 33.6800],
      [-112.2500, 33.6800],
      [-112.2500, 33.4409],
    ],
  },
  {
    id: 'sundown-strip',
    name: 'Sundown Strip',
    category: 'bar', // Le quartier de la vie nocturne et des divertissements
    color: '#c9963f',
    // Quart nord-est, borné à l'ouest par SR-51 puis le centre-ville
    coords: [
      [-112.0635, 33.6800],
      [-111.8500, 33.6800],
      [-111.8500, 33.4409],
      [-112.0400, 33.4409],
      [-112.0400, 33.4696],
      [-112.0635, 33.4696],
      [-112.0635, 33.6800],
    ],
  },
  {
    id: 'ashland-row',
    name: 'Ashland Row',
    category: 'commerce', // La zone commerciale et industrielle
    color: '#22c55e',
    // Quart sud-est, sous I-10
    coords: [
      [-112.0635, 33.3000],
      [-111.8500, 33.3000],
      [-111.8500, 33.4409],
      [-112.0635, 33.4409],
      [-112.0635, 33.3000],
    ],
  },
  {
    id: 'willow-hollow',
    name: 'Willow Hollow',
    category: 'domicile', // Le grand quartier résidentiel
    color: '#4dd9ff',
    // Quart sud-ouest, sous I-10
    coords: [
      [-112.2500, 33.3000],
      [-112.0635, 33.3000],
      [-112.0635, 33.4409],
      [-112.2500, 33.4409],
      [-112.2500, 33.3000],
    ],
  },
  {
    id: 'downtown-phoenix',
    name: 'Downtown Phoenix',
    category: 'travail', // Le quartier des affaires, encadré par I-17, SR-51, I-10 et McDowell Rd
    color: '#b96eff',
    coords: [
      [-112.0870, 33.4696],
      [-112.0400, 33.4696],
      [-112.0400, 33.4409],
      [-112.0870, 33.4409],
      [-112.0870, 33.4696],
    ],
  },
]

// Petites descriptions narratives, utilisées par le Wiki
export const NEIGHBORHOOD_DESCRIPTIONS = {
  'ember-district': "Le cœur administratif et financier de Phoenix. Sièges d'entreprises, tribunaux et bureaux du gouvernement local se côtoient dans ce quartier aux allures de pouvoir.",
  'sundown-strip': "Le quartier qui ne dort jamais. Bars, clubs et néons — c'est ici que la ville se retrouve une fois la nuit tombée.",
  'ashland-row': "Zone commerciale et industrielle tentaculaire. Entrepôts, boutiques et ateliers y forment l'ossature économique de la ville.",
  'willow-hollow': "Le grand quartier résidentiel de Phoenix. Pavillons, immeubles et vie de quartier tranquille, loin de l'agitation du centre.",
  'downtown-phoenix': "Le quartier des affaires, au carrefour des quatre autres. Gratte-ciels, sièges sociaux et bureaux — c'est ici que Phoenix travaille.",
}
