// La géométrie de la montée : une spirale autour du patio. Fonctions pures, testées sous Node.
export const CONFIG = { etages: 9, tours: 3.5, rayon: 6, hauteur: 30 };
export const ALTITUDES = [0, 120, 180, 240, 360, 450, 540, 610, 658];

const borne = (t) => Math.min(1, Math.max(0, t));

export function pointSpirale(t, rayon = CONFIG.rayon) {
  const a = borne(t) * CONFIG.tours * Math.PI * 2;
  return { x: Math.cos(a) * rayon, y: borne(t) * CONFIG.hauteur, z: Math.sin(a) * rayon };
}

// La caméra suit les marches de l'extérieur, un peu au-dessus, et regarde un peu plus haut sur la spirale.
export function camera(t) {
  const p = pointSpirale(t, CONFIG.rayon * 1.9);
  const c = pointSpirale(Math.min(1, borne(t) + 0.04));
  return { position: { x: p.x, y: p.y + 2, z: p.z }, cible: c };
}

export function etageA(t) {
  return Math.round(borne(t) * (CONFIG.etages - 1));
}

export function altitudeA(t) {
  const x = borne(t) * (ALTITUDES.length - 1);
  const i = Math.min(Math.floor(x), ALTITUDES.length - 2);
  return Math.round(ALTITUDES[i] + (ALTITUDES[i + 1] - ALTITUDES[i]) * (x - i));
}
