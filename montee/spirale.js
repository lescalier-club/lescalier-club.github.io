// La géométrie de la montée : une spirale autour du patio. Fonctions pures, testées sous Node.
export const CONFIG = { etages: 9, tours: 3.5, rayon: 11.2, hauteur: 30 };
export const ALTITUDES = [0, 120, 180, 240, 360, 450, 540, 610, 658];

const borne = (t) => Math.min(1, Math.max(0, t));

export function pointSpirale(t, rayon = CONFIG.rayon) {
  const a = borne(t) * CONFIG.tours * Math.PI * 2;
  return { x: Math.cos(a) * rayon, y: borne(t) * CONFIG.hauteur, z: Math.sin(a) * rayon };
}

// Les marches sont adossées au mur ; la caméra flotte côté patio, un peu en retrait et au-dessus,
// et regarde les marches qui arrivent, plus haut sur la spirale.
export function camera(t) {
  const u = borne(t);
  const p = pointSpirale(u - 0.03, CONFIG.rayon * 0.5);
  const c = pointSpirale(Math.min(1, u + 0.05));
  const y = Math.max(1.6, p.y + 3.2);
  // Pendant la montée, le regard vise les marches qui arrivent, un peu plus haut ;
  // en arrivant au sommet, il se pose sur l'horizon, par-dessus le mur.
  const k = Math.min(1, Math.max(0, (u - 0.86) / 0.14)), lisse = k * k * (3 - 2 * k);
  const portee = 0.8 + lisse * 5;
  return {
    position: { x: p.x, y, z: p.z },
    cible: { x: c.x * portee, y: (c.y + 3) * (1 - lisse) + (y + 0.4) * lisse, z: c.z * portee },
  };
}

export function etageA(t) {
  return Math.round(borne(t) * (CONFIG.etages - 1));
}

export function altitudeA(t) {
  const x = borne(t) * (ALTITUDES.length - 1);
  const i = Math.min(Math.floor(x), ALTITUDES.length - 2);
  return Math.round(ALTITUDES[i] + (ALTITUDES[i + 1] - ALTITUDES[i]) * (x - i));
}
