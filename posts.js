/*
  ===========================================================
  DONNÉES DES POSTS INSTAGRIM
  ===========================================================
  Chaque joueur peut ajouter son propre post dans ce tableau.
  Pour ajouter un post, copie un bloc { ... } et modifie les valeurs.

  Champs disponibles :
  - username    : pseudo du personnage
  - initials    : 1 ou 2 lettres affichées dans l'avatar
  - avatarColor : couleur de fond de l'avatar (ex: "#185fa5")
  - location    : lieu RP affiché sous le pseudo
  - time        : "il y a 2h", "à l'instant", etc.
  - image       : laisser "" pour une image vide (placeholder),
                   ou mettre une URL d'image
  - likes       : nombre de likes au départ
  - caption     : texte de la légende du post
  - comments    : nombre de commentaires (juste affiché, non détaillé)
  ===========================================================
*/

const posts = [
  {
    username: "jane.doe_rp",
    initials: "JD",
    avatarColor: "#185fa5",
    location: "Île de Valoria",
    time: "il y a 2h",
    image: "",
    likes: 24,
    caption: "Une journée tranquille au port avant la tempête... #valoria",
    comments: 3
  },
  {
    username: "marc_kessler",
    initials: "MK",
    avatarColor: "#854f0b",
    location: "",
    time: "il y a 5h",
    image: "",
    likes: 12,
    caption: "Nouvelle arme forgée ce matin. Qui veut tester ?",
    comments: 0
  }
];
