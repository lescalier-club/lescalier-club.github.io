# Site L'Escalier 3D (patio en colimaçon) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** une nouvelle page d'accueil où l'on monte un escalier en colimaçon autour d'un patio méditerranéen en 3D, avec un palier par section du site actuel et l'offre au sommet.

**Architecture:** la page est construite à côté du site actuel, dans `montee/` (adresse de test, `noindex`), sans toucher à `index.html`. Le HTML porte tout le texte, lisible sans JavaScript. Three.js dessine le patio derrière, et le défilement pilote une caméra sur une spirale. Les maths de la spirale sont des fonctions pures testées sous Node, et le comportement de la page est testé avec Playwright.

**Tech Stack:** HTML/CSS statiques, Three.js `0.170.0` en module ES, hébergé dans `vendor/` (la CSP interdit les scripts externes), `node --test`, `@playwright/test` (en dépendance de développement uniquement).

**Spec:** `docs/superpowers/specs/2026-11-12-site-escalier-3d-design.md`

## Global Constraints

- Ne pas modifier `index.html`, `pages.css` ni les sous-pages. Le site actuel reste en ligne jusqu'au feu vert d'Adam.
- La CSP actuelle est recopiée telle quelle dans `montee/index.html` : `script-src 'self' 'unsafe-inline'`, donc aucun CDN.
- Couleurs : `--nuit:#15120E`, `--creme:#F4F1E9`, `--orange:#D76634`, `--aube:#F3B36B`, `--trait:#3A332A`. Polices : `"Instrument Serif"` pour les titres, `"Archivo"` pour le texte (Google Fonts, déjà autorisé par la CSP).
- Le texte des paliers est recopié **mot pour mot** depuis les `<section>` de `index.html`. Il n'y a que deux exceptions :
  - l'étape 2 du sommet devient « **Après l'appel, je t'envoie ton accès** » ;
  - la vidéo `media/adam.mp4` est remplacée par `<img src="../media/adam.jpg">`, un emplacement réservé en attendant les photos de Victor.
- Le mot « Discord » n'apparaît nulle part dans `montee/`.
- `montee/index.html` porte `<meta name="robots" content="noindex">` tant que c'est une page de test.
- Le menu est celui des sous-pages : Le club, Rejoindre, Les rendez-vous, Questions, Le fondateur, Le journal. Il est toujours visible et ne recouvre jamais le texte.
- Ordre des 9 paliers (l'altitude s'affiche à chacun) :
  - 0 : départ, 0 m
  - 1 : pourquoi ce club et Adam, 120 m
  - 2 : ton entrée, 180 m
  - 3 : comment on monte, 240 m
  - 4 : ce qu'on partage, 360 m
  - 5 : ce qu'on vit, 450 m
  - 6 : une famille, 540 m
  - 7 : la différence, 610 m
  - 8 : le sommet, 658 m
- La FAQ n'est pas un palier : elle est accessible par le lien « Questions » du menu.
- Avec `prefers-reduced-motion: reduce`, sans WebGL ou après une perte de contexte WebGL, la page reste lisible en texte, dans le même ordre (classe `sans-3d` sur `<html>`).
- Mobile (largeur < 768 px) : qualité « légère » (pixel ratio ≤ 1,5, sans ombres temps réel, moitié des marches décoratives).

## Review Focus

1. Redescendre (scroll vers le haut) : la caméra et le palier actif reviennent en arrière sans saut. Test : `redescendre-revient-au-palier-0` (Task 4).
2. Lien direct `montee/#sommet` : la page s'ouvre au sommet, avec la caméra en haut. Test : `ancre-sommet` (Task 4).
3. Rotation ou redimensionnement de l'écran : rien ne se déforme et le palier actif reste le même. Test : `redimensionner-garde-le-palier` (Task 4).
4. Perte du contexte WebGL sur un téléphone faible : bascule en `sans-3d`, le texte reste lisible. Test : `contexte-perdu-bascule-texte` (Task 3).
5. Navigation au clavier : Tab atteint le menu puis le bouton « Réserve ton appel », et un lien « Aller au sommet » est le premier élément focalisable. Test : `clavier-premier-lien-sommet` (Task 2).

---

### Task 1: Les maths de la spirale

**Files:**
- Create: `montee/spirale.js`
- Test: `tests/spirale.test.mjs`

**Interfaces:**
- Produces (exports ES) :
  - `CONFIG = { etages: 9, tours: 3.5, rayon: 6, hauteur: 30 }`
  - `ALTITUDES = [0,120,180,240,360,450,540,610,658]`
  - `pointSpirale(t: number) -> {x,y,z}` : `t` dans [0,1] ; angle = `t*tours*2π` ; y = `t*hauteur`
  - `camera(t: number) -> { position:{x,y,z}, cible:{x,y,z} }` : la caméra est à `rayon*1.9` du centre, 2 unités au-dessus de la marche, et regarde le point de la spirale situé à `t+0.04`, borné à 1
  - `etageA(t: number) -> 0..8` : `Math.round(t*8)`, borné
  - `altitudeA(t: number) -> number` : interpolation linéaire entre `ALTITUDES` voisines, arrondie à l'entier

- [ ] **Step 1: Écrire les tests qui échouent**

```js
import test from 'node:test'; import assert from 'node:assert/strict';
import { pointSpirale, camera, etageA, altitudeA, CONFIG } from '../montee/spirale.js';
test('bas et haut de la spirale', () => {
  assert.equal(pointSpirale(0).y, 0); assert.equal(pointSpirale(1).y, CONFIG.hauteur);
});
test('etages', () => { assert.equal(etageA(0), 0); assert.equal(etageA(0.5), 4); assert.equal(etageA(1), 8); assert.equal(etageA(1.3), 8); assert.equal(etageA(-0.2), 0); });
test('altitudes', () => { assert.equal(altitudeA(0), 0); assert.equal(altitudeA(1), 658); assert.equal(altitudeA(1/16), 60); });
test('la camera regarde plus haut qu’elle', () => { const c = camera(0.3); assert.ok(c.cible.y > c.position.y - 2); });
```

- [ ] **Step 2: Lancer et vérifier l'échec**
Run: `node --test tests/spirale.test.mjs` → Expected: FAIL (`Cannot find module`).

- [ ] **Step 3: Implémenter `montee/spirale.js` selon les signatures ci-dessus.**

- [ ] **Step 4: Lancer et vérifier le succès**
Run: `node --test tests/spirale.test.mjs` → Expected: 4 tests pass.

- [ ] **Step 5: Commit** — `git add montee/spirale.js tests/spirale.test.mjs && git commit -m "Montée : maths de la spirale"`

### Task 2: La page en texte (sans 3D)

**Files:**
- Create: `montee/index.html`, `montee/montee.css`, `package.json` (devDependencies : `@playwright/test`), `playwright.config.mjs` (serveur `npx http-server -p 4173 .` ; projets : desktop 1440×900 et mobile 390×844)
- Test: `tests/montee.spec.mjs`

**Interfaces:**
- Produces (DOM utilisé par les tâches 3 et 4) :
  - `<html class="avec-3d">`
  - `<canvas id="scene" aria-hidden="true">`
  - `<nav id="menu">`
  - `<a id="aller-sommet" href="#sommet">Aller au sommet</a>`, premier élément focalisable
  - `<main id="montee">` contenant 9 `<section class="palier" data-etage="N" id=…>`, avec `id="depart"` pour l'étage 0 et `id="sommet"` pour l'étage 8
  - `<div id="altitude" aria-live="polite">0 m</div>`

- [ ] **Step 1: Écrire les tests qui échouent** (`tests/montee.spec.mjs`, page `/montee/`)
  - `neuf-paliers-dans-l-ordre` : `.palier` count = 9, `data-etage` vaut 0 à 8 dans l'ordre, et le premier titre contient « Le club des entrepreneurs qui ».
  - `pas-de-discord` : `page.content()` ne contient pas `/discord/i`.
  - `sommet-sans-discord` : `#sommet` contient « Après l'appel, je t'envoie ton accès ».
  - `photo-pas-video` : aucun `video` ; `#palier-adam img[src$="adam.jpg"]` est visible (palier 1, `id="palier-adam"`).
  - `menu-complet-et-visible` : `#menu a` donne les 6 libellés exacts des Global Constraints, et la boîte du menu ne recouvre pas le premier titre (`boundingBox` sans intersection).
  - `noindex` : `meta[name=robots]` vaut `noindex`.
  - `clavier-premier-lien-sommet` : le premier Tab donne le focus à `#aller-sommet`.
- [ ] **Step 2: Lancer et vérifier l'échec** — Run: `npx playwright test tests/montee.spec.mjs` → Expected: FAIL (404).
- [ ] **Step 3: Écrire `montee/index.html`**
  - Le `<head>` reprend celui de `index.html` (CSP, polices, favicon), plus `noindex` et `canonical` vers `https://lescalierclub.fr/`.
  - Le JSON-LD est recopié tel quel.
  - Le texte des sections est recopié mot pour mot, avec les deux exceptions des Global Constraints.
  - Le script inline `LIENS` est repris sans la clé `discord`.
- [ ] **Step 4: Écrire `montee/montee.css`**
  - Menu fixe en haut, compact, fond `--nuit` à 85 %, hauteur 56 px. La page commence avec un `padding-top` de 56 px pour qu'il ne recouvre rien.
  - En mode `.sans-3d`, les paliers s'empilent comme un site classique.
  - En mode `.avec-3d`, chaque palier est un panneau crème translucide, et seul le palier `.actif` est visible.
- [ ] **Step 5: Lancer et vérifier le succès** — Expected: 7 tests pass (desktop et mobile).
- [ ] **Step 6: Commit** — `git commit -m "Montée : page texte, menu, paliers"`

### Task 3: Le patio en 3D

**Files:**
- Create: `vendor/three.module.min.js` (three@0.170.0, `build/three.module.min.js`, licence MIT gardée en tête), `montee/scene.js`
- Test: `tests/montee.spec.mjs` (ajouts)

**Interfaces:**
- Consumes : `pointSpirale`, `CONFIG` (Task 1) ; `#scene` (Task 2)
- Produces : `creerScene(canvas: HTMLCanvasElement, { qualite: 'pleine'|'legere' }) -> { rendre(t:number):void, redimensionner(l:number,h:number):void, detruire():void }`. La fonction expose aussi `window.__montee = { pret: true, qualite }` quand la première image est rendue. `rendre(t)` place la caméra avec `camera(t)` et fait passer la lumière de `#F7E4C3` (blanc chaud, en bas) à `#F3B36B` (aube, en haut).

Contenu de la scène :
- un patio cylindrique ouvert, avec des murs crème `#F4F1E9`, sans toit et un ciel en dégradé au-dessus ;
- les marches en pierre claire en `InstancedMesh`, posées le long de `pointSpirale` (72 marches, 36 en qualité légère), avec une marche orange `#D76634` à chaque palier ;
- un olivier stylisé au centre (tronc et 3 masses vertes `#7D8F5C`) ;
- des grappes de bougainvilliers sur les murs, des pots en terre cuite orange ;
- le roi des échecs, en pierre, sur la plateforme du sommet (tour lathe, reprenant la silhouette du logo).
- un `DirectionalLight` pour le soleil venu d'en haut, avec des ombres seulement en qualité pleine, et un `HemisphereLight`.

- [ ] **Step 1: Écrire les tests qui échouent**
  - `scene-prete-sans-erreur` : attendre `window.__montee?.pret === true` (10 s max), 0 erreur dans la console.
  - `qualite-mobile-legere` : sur le projet mobile, `window.__montee.qualite === 'legere'`.
  - `contexte-perdu-bascule-texte` : `canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`, puis `html` reçoit la classe `sans-3d` et `#sommet` est visible après scroll.
- [ ] **Step 2: Lancer et vérifier l'échec.**
- [ ] **Step 3: Implémenter `montee/scene.js`** (import `../vendor/three.module.min.js`). Sur `webglcontextlost` : `document.documentElement.classList.replace('avec-3d','sans-3d')`.
- [ ] **Step 4: Lancer et vérifier le succès, puis faire une capture desktop et une capture mobile** (`npx playwright screenshot`) pour vérifier à l'œil : lumineux, méditerranéen, sans effet « jeu vidéo ».
- [ ] **Step 5: Commit** — `git commit -m "Montée : patio 3D"`

### Task 4: Le défilement qui fait monter

**Files:**
- Create: `montee/montee.js` (module chargé par `montee/index.html`)
- Test: `tests/montee.spec.mjs` (ajouts)

**Interfaces:**
- Consumes : `creerScene` (Task 3), `etageA`, `altitudeA` (Task 1), le DOM de la Task 2.
- Produces : `progression() -> number`, soit `scrollY / (scrollHeight - innerHeight)`, borné à [0,1]. Le palier `etageA(t)` reçoit `.actif`, et `#altitude` affiche `altitudeA(t) + " m"`.
- Le choix de la qualité : `'legere'` si `innerWidth < 768`. Pas de 3D si `matchMedia('(prefers-reduced-motion: reduce)')` ou sans WebGL2 : la classe `sans-3d` est alors posée et la scène n'est pas créée.
- `requestAnimationFrame` avec un lissage de `t`, d'un facteur 0,12 par image.

- [ ] **Step 1: Écrire les tests qui échouent**
  - `monter-jusqu-au-sommet` : scroll en bas, puis `#sommet.actif` et `#altitude` = « 658 m ».
  - `redescendre-revient-au-palier-0` : scroll en bas, puis en haut, puis `#depart.actif` et « 0 m ».
  - `ancre-sommet` : `goto('/montee/#sommet')`, puis `#sommet.actif`.
  - `redimensionner-garde-le-palier` : scroll à 50 %, `setViewportSize(800,600)`, puis le même `data-etage` reste actif.
  - `mouvement-reduit` : `emulateMedia({reducedMotion:'reduce'})`, puis `html.sans-3d` et `#scene` caché.
- [ ] **Step 2: Lancer et vérifier l'échec.**
- [ ] **Step 3: Implémenter `montee/montee.js`.**
- [ ] **Step 4: Lancer toute la suite et vérifier le succès.** Run: `node --test tests/ && npx playwright test` → Expected: all pass.
- [ ] **Step 5: Commit** — `git commit -m "Montée : le scroll fait monter"`

### Task 5: L'image du sommet

**Files:**
- Create: `media/sommet.webp` et `media/sommet.avif` (largeur 1920, plus une version 900 pour le mobile), `media/sommet-prompt.txt`
- Modify: `montee/index.html` (`<picture>` en fond du palier 8), `montee/montee.css`
- Test: `tests/montee.spec.mjs` (ajout)

L'image représente un toit-terrasse méditerranéen blanc au coucher du soleil, face à la mer, avec un groupe de 6 à 8 jeunes entrepreneurs qui applaudissent et félicitent la personne qui arrive (de face, vers le spectateur), dans une lumière dorée, avec la pierre claire du patio et quelques pots en terre cuite orange. Le prompt exact va dans `sommet-prompt.txt`.

**Avant de générer : demander à Adam quel outil utiliser** (Higgsfield, après scan SkillSpector, ou Canva), et obtenir son oui si l'outil coûte des crédits. Pas d'image tant qu'il n'a pas validé.

- [ ] **Step 1: Test** `image-sommet-legere` : `#sommet picture img` est chargé, et les fichiers font moins de 450 Ko (webp) et moins de 300 Ko (avif).
- [ ] **Step 2: Générer 3 propositions, les montrer à Adam et garder celle qu'il choisit.**
- [ ] **Step 3: Encoder** — `ffmpeg -i choix.png -vf scale=1920:-2 -c:v libwebp -quality 80 media/sommet.webp` (même chose pour l'avif avec `libaom-av1 -crf 32`, et pour la largeur 900).
- [ ] **Step 4: Intégrer le `<picture>`, puis faire un fondu de la 3D vers l'image entre t = 0,92 et 1.**
- [ ] **Step 5: Lancer la suite et vérifier le succès, puis commit.**

### Task 6: Montrer la page de test à Adam

- [ ] **Step 1:** captures desktop et mobile des paliers 0, 4 et 8, et une courte vidéo de la montée (`page.video` de Playwright), à envoyer à Adam.
- [ ] **Step 2:** **mise en ligne de test seulement avec le oui d'Adam** : `git push` publie `lescalierclub.fr/montee/` (en noindex). Ensuite, le remplacement de la page d'accueil est une décision séparée d'Adam : déplacer `montee/` vers `/`, retirer `noindex`, et ajuster les chemins `../`.
