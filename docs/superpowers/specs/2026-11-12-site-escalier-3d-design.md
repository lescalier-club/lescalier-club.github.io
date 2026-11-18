# Site L'Escalier en 3D : le patio en colimaçon

Date : 12/11/2026. Auteur de la vision : Adam. Rédaction : Claude, d'après la séance de brainstorming du 12/11.
Les décisions marquées **(Adam)** viennent de lui ; celles marquées **(choix de Claude)** sont des choix techniques qu'Adam peut contester.

## Pourquoi

Le site actuel est une longue page qu'on fait défiler vers le bas. Adam pense que peu de gens la lisent jusqu'au bout et que ses gros défauts sont pratiques : la barre orange du haut cache les onglets (Contact, etc.), la vidéo du fondateur ne lui convient pas et le Discord, réservé aux membres, apparaît sur le site public.
Il veut un site qui ait un effet « waouh », qu'on ait envie de parcourir, et qui **montre toute sa direction artistique**. Inspiration : le Reel « Can you believe Claude did this? » (DYaHSTusnaK), une visite 3D de type Cartier « Watches & Wonders », où l'on avance dans des salles lumineuses et chaque alcôve révèle un objet.

**L'idée (Adam) :** le visiteur ne descend pas, **il monte**. Un escalier littéral, en 3D, avec de la profondeur. On part du bas, chaque palier révèle une partie du club, et tout en haut on arrive à « l'image du bonheur » d'Adam : une vue incroyable, des gens autour qui applaudissent et te félicitent. C'est là qu'on trouve l'offre.

## Le lieu (Adam)

Mélange des pistes A (villa face à la mer) et B (colimaçon sous la verrière), choix « 1, le patio en colimaçon » :
- une villa méditerranéenne blanche, avec un **patio à ciel ouvert** ;
- un **olivier** au centre et des bougainvilliers sur les murs ;
- le **soleil tombe d'en haut**, et la lumière méditerranéenne est très présente ;
- un **escalier en pierre claire en colimaçon** qui tourne autour du patio ;
- tout en haut, on sort sur le **toit-terrasse face à la mer, au coucher du soleil**, avec des gens qui applaudissent.

Proposition de Claude, validée avec le reste (« c'est ça ») : la lumière part d'une fin d'après-midi en bas et devient le coucher doré en haut. On sent la montée aussi par la lumière.

## La montée (Adam, ordre validé)

Le site d'accueil tient sur **une seule page**. Faire défiler fait monter la caméra quelques marches en tournant autour du patio. Chaque palier affiche une partie du contenu actuel (`index.html`), **avec le texte gardé tel quel** (Adam : « au niveau du contenu, on est bon ») :

| Étage | Contenu (section actuelle) | Altitude affichée aujourd'hui |
|---|---|---|
| Rez-de-chaussée, sous l'olivier | Le club des entrepreneurs qui montent, 18-30 ans, Montpellier | 0 m |
| 1er tour | Pourquoi ce club, **qui est Adam**, avec une **photo d'Adam à la place de la vidéo** | 120 m |
| 2e tour | Ton entrée : l'appel de 20 min | 180 m |
| 3e tour | Comment on monte : les grades prouvés, la semaine type | 240 m |
| 4e tour | Ce qu'on partage : le mental, le corps, le business | 360 m |
| 5e tour | Ce qu'on vit : les événements (la Montée, la Table…) | 450 m |
| 6e tour | Une famille : le parrain, personne ne reste seul | 540 m |
| 7e tour | La différence avec les autres clubs | 610 m |
| Toit-terrasse | La mer, les gens qui applaudissent, l'offre, les 10 places de membres fondateurs, « Réserve ton appel » | 658 m, Pic Saint-Loup |

La FAQ (« Tes questions ») sort de la montée et passe dans le menu, en page texte.
Le compteur d'altitude (0 m vers 658 m) existe déjà dans le site : il peut rester affiché pendant la montée *(choix de Claude, à confirmer en voyant le prototype)*.

## Ce qui reste en texte classique (Adam)

- Une **barre de menu simple, qui ne cache plus rien** : Le club, Rendez-vous, Fondateur, Journal, Questions, Contact, Rejoindre. Ces pages restent en texte, lisibles par Google (SEO), avec `llms.txt` et `sitemap.xml` gardés.
- **Plus de Discord sur le site public** : il est réservé aux membres. Il faut donc reformuler la dernière étape « Entre sur le Discord » du sommet.
- **Plus de vidéo** du fondateur pour l'instant, une **photo d'Adam** à la place. Adam tournera la vidéo plus tard, quand il se sentira prêt.

## Le rendu (Adam, sur proposition de Claude)

- **La montée est en 3D épurée, façon Cartier** : des formes douces, de la pierre claire, une belle lumière et une vraie caméra qui se déplace. L'olivier et les bougainvilliers sont stylisés, pas photoréalistes.
- **Au sommet, une vraie image réaliste générée par IA** : la terrasse face à la mer au coucher du soleil, avec les gens qui applaudissent. Faire de vrais personnages en 3D serait trop lourd et risquerait de faire bizarre.
- Adam veut **« la meilleure qualité »** pour l'image du sommet. Il propose Higgsfield (« Icefield »), via un skill gratuit si besoin. Tout skill passe par SkillSpector avant installation, et tout crédit payant demande d'abord le oui d'Adam.

## Direction artistique (charte existante, `branding/charte-escalier.md`)

- Couleurs : noir `#15120E`, crème `#F4F1E9`, orange `#D76634` (le roi), aube `#F3B36B`.
- Polices du site actuel : Instrument Serif pour les titres, Archivo pour le texte.
- Signature : le logo est un escalier avec **le roi des échecs** sur la dernière marche. *(Idée de Claude, à valider : une sculpture du roi sur le toit-terrasse, et des touches d'orange dans le patio, comme des pots en terre cuite ou une marche orange à chaque palier, plutôt que du rose bougainvillier partout.)*
- Ce qui donne l'effet « Méditerranée » : la lumière dorée, la pierre claire, la mer. Ça rejoint l'étalonnage « Méditerranée » des Reels et le moodboard du QG et du village.

## Technique (choix de Claude)

- Three.js, sans framework lourd. La page reste statique (le site actuel est statique, avec un `CNAME`).
- Le scroll pilote une caméra sur une trajectoire en spirale. Le texte de chaque palier est du vrai HTML par-dessus la 3D : il reste lisible, sélectionnable et indexable.
- Il faut toujours un repli :
  - sans WebGL ou avec « réduire les animations », la page s'affiche comme un site texte classique, dans le même ordre ;
  - sur téléphone, la scène est allégée (moins de géométrie, ombres précalculées) pour rester fluide.
- L'image du sommet est optimisée (AVIF ou WebP, plusieurs tailles).
- Les pages texte du menu gardent `pages.css` et leur structure.

## Objectifs

- Un visiteur a envie de monter jusqu'en haut.
- La DA d'Adam se voit dès la première seconde.
- Le menu est clair, et toutes les pages restent accessibles en un clic.
- Le référencement est au moins aussi bon qu'aujourd'hui.

## Hors périmètre (pour cette version)

- La vidéo du fondateur, qu'Adam tournera plus tard.
- Les personnages 3D animés.
- Le changement du contenu des textes.

## Ce qui ferait un échec, même si « ça marche »

- Un site lent ou saccadé sur téléphone : la plupart des visites viendront d'Instagram.
- Une 3D qui fait « jeu vidéo bon marché » au lieu d'élégante et méditerranéenne.
- Un visiteur perdu, qui ne trouve ni le contact ni « Rejoindre ».
- Des pages qui disparaissent de Google.
- Le Discord encore visible publiquement.

## Laissé au constructeur

- La forme exacte de la spirale (nombre de tours, rayon) et le rythme de la caméra.
- Le placement et le style des panneaux de texte à chaque palier.
- La transition vers l'image du sommet.

## Décisions du 12/11 après relecture

- **Timing (Adam)** : on lance tout de suite, en parallèle des Reels.
- **Mise en ligne (choix de Claude, Adam n'a pas tranché)** : le nouveau site se construit et se montre sur une adresse de test. Le site actuel reste en ligne jusqu'au feu vert d'Adam.
- **Le sommet sans Discord (choix de Claude)** : l'étape « Entre sur le Discord » devient « Après l'appel, je t'envoie ton accès ».
- **La photo d'Adam** : il n'a pas encore de photo qui le représente. Proposition : 5 photos prises par Victor au Belaroïa le 12/11 (en train de bosser, lumière naturelle, pas posées). En attendant, le site garde un emplacement réservé, et la photo se glisse en dernier.
- **Nouvelle DA « Lumière dorée » (Adam, 12/11)** : elle remplace les couleurs de la charte sur le nouveau site. Marbre crème `#F2EBDD`, brun pierre `#3A3128` pour le texte et les marches du logo, jaune doré `#F4C247` pour le roi et les boutons (texte des boutons en `#2A231C`). L'orange `#D76634` ne reste qu'en touche dans le patio (pots en terre cuite). Les polices ne changent pas.
