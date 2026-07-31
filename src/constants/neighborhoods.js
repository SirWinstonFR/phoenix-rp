// 4 grands quartiers fictifs de Phoenix RP, chacun avec sa propre identité
// Fichier partagé entre MapScreen (affichage carte) et CharacterReservationScreen (choix résidence)
export const NEIGHBORHOODS = [
  {
    id: 'ember-district',
    name: 'Ember District',
    category: 'gouvernance', // Le cœur administratif et financier de la ville
    color: '#7a1024',
    coords: [
      [-112.1000, 33.5000],
      [-112.0600, 33.5000],
      [-112.0600, 33.4600],
      [-112.1000, 33.4600],
      [-112.1000, 33.5000],
    ],
  },
  {
    id: 'sundown-strip',
    name: 'Sundown Strip',
    category: 'bar', // Le quartier de la vie nocturne et des divertissements
    color: '#c9963f',
    coords: [
      [-112.0600, 33.4800],
      [-112.0200, 33.4800],
      [-112.0200, 33.4400],
      [-112.0600, 33.4400],
      [-112.0600, 33.4800],
    ],
  },
  {
    id: 'ashland-row',
    name: 'Ashland Row',
    category: 'commerce', // La zone commerciale et industrielle
    color: '#22c55e',
    coords: [
      [-112.1000, 33.4400],
      [-112.0600, 33.4400],
      [-112.0600, 33.4000],
      [-112.1000, 33.4000],
      [-112.1000, 33.4400],
    ],
  },
  {
    id: 'willow-hollow',
    name: 'Willow Hollow',
    category: 'domicile', // Le grand quartier résidentiel
    color: '#4dd9ff',
    coords: [
      [-112.1400, 33.4600],
      [-112.1000, 33.4600],
      [-112.1000, 33.4200],
      [-112.1400, 33.4200],
      [-112.1400, 33.4600],
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
