// Point d'entrée de la montée : choisit la qualité, crée la scène, ou bascule en mode texte.
import { creerScene } from './scene.js';

const racine = document.documentElement;
const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const webgl = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();

function sansTroisD() { racine.classList.replace('avec-3d', 'sans-3d'); }

if (calme || !webgl) {
  sansTroisD();
} else {
  try {
    const qualite = innerWidth < 768 ? 'legere' : 'pleine';
    const scene = creerScene(document.getElementById('scene'), { qualite });
    addEventListener('resize', () => { scene.redimensionner(innerWidth, innerHeight); scene.rendre(0); });
  } catch (e) {
    console.warn('Montée : 3D indisponible, passage en mode texte', e);
    sansTroisD();
  }
}
