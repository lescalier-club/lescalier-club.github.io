// Point d'entrée de la montée : le défilement fait monter la caméra, allume le palier courant et l'altitude.
// Sans 3D (mouvement réduit, pas de WebGL, contexte perdu) : la page reste un site texte, l'altitude suit quand même.
import { creerScene } from './scene.js';
import { altitudeA } from './spirale.js';

const racine = document.documentElement;
const paliers = [...document.querySelectorAll('.palier')];
const altitude = document.getElementById('altitude');
const DERNIER = paliers.length - 1;

// Le palier courant est celui qui occupe le milieu de l'écran ; t avance de façon continue d'un palier au suivant.
export function progression() {
  const max = racine.scrollHeight - innerHeight;
  if (max > 0 && scrollY >= max - 2) return { t: 1, etage: DERNIER };
  if (scrollY <= 2) return { t: 0, etage: 0 };
  const milieu = scrollY + innerHeight / 2;
  let i = 0;
  while (i < DERNIER && paliers[i + 1].offsetTop <= milieu) i++;
  const haut = paliers[i].offsetTop, suivant = i < DERNIER ? paliers[i + 1].offsetTop : haut + paliers[i].offsetHeight;
  const frac = Math.min(1, Math.max(0, (milieu - haut) / Math.max(1, suivant - haut)));
  return { t: Math.min(1, (i + frac * 0.999) / DERNIER), etage: i };
}

let etageAffiche = -1;
function afficher({ t, etage }) {
  if (etage !== etageAffiche) {
    paliers.forEach((p, k) => p.classList.toggle('actif', k === etage));
    etageAffiche = etage;
  }
  altitude.textContent = altitudeA(t) + ' m';
}

let scene = null, tVise = 0, tCamera = 0, boucle = 0;
function animer() {
  boucle = 0;
  tCamera += (tVise - tCamera) * 0.12;
  if (Math.abs(tVise - tCamera) < 0.0005) tCamera = tVise;
  scene?.rendre(tCamera);
  if (tCamera !== tVise) boucle = requestAnimationFrame(animer);
}
let derniere = { t: 0, etage: 0 }, enRedimension = false;
function maj() {
  if (enRedimension) return;
  const p = progression(); derniere = p;
  tVise = p.t; afficher(p);
  if (scene && !boucle) boucle = requestAnimationFrame(animer);
}

const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const webgl = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
if (calme || !webgl) racine.classList.replace('avec-3d', 'sans-3d');
else {
  // La mise en page 3D s'affiche tout de suite, sur une image du premier plan (#scene a l'image en fond) :
  // le visiteur ne voit plus de page vide pendant que le patio se télécharge
  try { scene = creerScene(document.getElementById('scene'), { qualite: innerWidth < 768 ? 'legere' : 'pleine' }); racine.classList.add('scene-prete'); }
  catch (e) { console.warn('Montée : 3D indisponible, passage en mode texte', e); racine.classList.replace('avec-3d', 'sans-3d'); }
}
// Si le contexte WebGL est perdu, la scène ne dessine plus : on arrête de lui demander.
document.getElementById('scene').addEventListener('webglcontextlost', () => { scene = null; });

addEventListener('scroll', maj, { passive: true });

// Redimensionner (rotation du téléphone…) : on garde le même palier et la même position dans ce palier.
let avant = null, minuteur = 0;
addEventListener('resize', () => {
  if (!avant) { avant = derniere; enRedimension = true; }
  scene?.redimensionner(innerWidth, innerHeight);
  clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    const p = paliers[avant.etage], frac = avant.t * DERNIER - avant.etage;
    const suivant = avant.etage < DERNIER ? paliers[avant.etage + 1].offsetTop : p.offsetTop + p.offsetHeight;
    scrollTo(0, p.offsetTop + frac * (suivant - p.offsetTop) - innerHeight / 2 + 1);
    avant = null; enRedimension = false; maj();
  }, 120);
});

// Arrivée directe sur une ancre (#sommet…) : le navigateur a déjà défilé, on se cale dessus.
maj(); tCamera = tVise; scene?.rendre(tCamera);
addEventListener('load', maj);
