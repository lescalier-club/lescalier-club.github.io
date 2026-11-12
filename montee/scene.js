// Le patio méditerranéen en 3D : murs de marbre crème, escalier en colimaçon, olivier, bougainvilliers,
// pots en terre cuite, et le roi doré au sommet. DA « Lumière dorée ».
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG, pointSpirale, camera as cameraA } from './spirale.js';

const COUL = {
  marbre: 0xF6F0E4, marbreClair: 0xF7F2E8, corniche: 0xE6DCC8, pierre: 0x3A3128, or: 0xF4C247,
  terre: 0xD76634, olivier: 0x8E9C6E, tronc: 0x7A6248, bougainvillier: 0xD0638F, mer: 0x5F9BB0,
};
const MUR_R = 13;                       // rayon du patio ; les marches sont adossées au mur (rayon 11,2)
const LUMIERE_BAS = new THREE.Color(0xF7E4C3), LUMIERE_HAUT = new THREE.Color(0xF3B36B);
const CIEL_BAS = new THREE.Color(0xF6E7CF), CIEL_HAUT_MIDI = new THREE.Color(0xA9CFDC), CIEL_HAUT_DORE = new THREE.Color(0xF4D9A8), CIEL_HAUT_SOIR = new THREE.Color(0xF0A86A);

// Petit générateur pseudo-aléatoire : la scène est la même à chaque visite.
function hasard(graine) { let s = graine; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function ciel() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { bas: { value: CIEL_BAS.clone() }, haut: { value: CIEL_HAUT_MIDI.clone() } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 bas; uniform vec3 haut; varying float h; void main(){ gl_FragColor = vec4(mix(bas, haut, smoothstep(-0.05, 0.6, h)), 1.0); }',
  });
  return new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
}

function patio(groupe, legere) {
  const hauteurMur = CONFIG.hauteur + 1;
  const marbre = new THREE.MeshStandardMaterial({ color: COUL.marbre, roughness: 0.92 });
  const mur = new THREE.Mesh(new THREE.CylinderGeometry(MUR_R, MUR_R, hauteurMur, legere ? 48 : 96, 1, true), marbre);
  mur.material.side = THREE.BackSide; mur.position.y = hauteurMur / 2; mur.receiveShadow = true;
  groupe.add(mur);
  // Une corniche à chaque étage, et des niches en arche le long du mur
  const corniche = new THREE.MeshStandardMaterial({ color: COUL.corniche, roughness: 0.8 });
  for (let e = 1; e < CONFIG.etages; e++) {
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(MUR_R - 0.15, 0.14, 6, legere ? 48 : 96), corniche);
    anneau.rotation.x = Math.PI / 2; anneau.position.y = (e / (CONFIG.etages - 1)) * CONFIG.hauteur - 0.6; groupe.add(anneau);
  }
  const niche = new THREE.MeshStandardMaterial({ color: 0xE3D6BF, roughness: 1 });
  const formeNiche = new THREE.Shape(); formeNiche.moveTo(-0.9, 0); formeNiche.lineTo(-0.9, 2.2);
  formeNiche.absarc(0, 2.2, 0.9, Math.PI, 0, true); formeNiche.lineTo(0.9, 0); formeNiche.lineTo(-0.9, 0);
  const geoNiche = new THREE.ShapeGeometry(formeNiche, 12);
  for (let e = 0; e < CONFIG.etages - 1; e++) for (let k = 0; k < (legere ? 3 : 6); k++) {
    const a = (k / (legere ? 3 : 6)) * Math.PI * 2 + e * 0.7, n = new THREE.Mesh(geoNiche, niche);
    n.position.set(Math.cos(a) * (MUR_R - 0.05), (e / (CONFIG.etages - 1)) * CONFIG.hauteur + 0.6, Math.sin(a) * (MUR_R - 0.05));
    n.lookAt(0, n.position.y, 0); groupe.add(n);
  }
  // Le sol du patio, en marbre clair, avec un cercle de pierre autour de l'olivier
  const sol = new THREE.Mesh(new THREE.CircleGeometry(MUR_R, 64), new THREE.MeshStandardMaterial({ color: COUL.marbreClair, roughness: 0.6 }));
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; groupe.add(sol);
  const cercle = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.8, 48), new THREE.MeshStandardMaterial({ color: COUL.corniche }));
  cercle.rotation.x = -Math.PI / 2; cercle.position.y = 0.01; groupe.add(cercle);
  // Le toit-terrasse : une couronne de pierre en haut du mur
  const toit = new THREE.Mesh(new THREE.RingGeometry(MUR_R - 4, MUR_R + 0.6, 96), new THREE.MeshStandardMaterial({ color: COUL.marbreClair, roughness: 0.7, side: THREE.DoubleSide }));
  toit.rotation.x = -Math.PI / 2; toit.position.y = hauteurMur; toit.receiveShadow = true; groupe.add(toit);
}

function escalier(groupe, legere) {
  const n = legere ? 36 : 72;
  const geo = new THREE.BoxGeometry(2.6, 0.3, 1.7);
  const mat = new THREE.MeshStandardMaterial({ color: COUL.marbreClair, roughness: 0.55 });
  const marches = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), un = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = pointSpirale(t), a = t * CONFIG.tours * Math.PI * 2;
    e.set(0, -a, 0); q.setFromEuler(e);
    m.compose(new THREE.Vector3(p.x, p.y, p.z), q, un); marches.setMatrixAt(i, m);
  }
  marches.castShadow = !legere; marches.receiveShadow = true; groupe.add(marches);
  // Un palier doré à chaque étage : la marque du roi
  const or = new THREE.MeshStandardMaterial({ color: COUL.or, roughness: 0.35, metalness: 0.4 });
  for (let k = 0; k < CONFIG.etages; k++) {
    const t = k / (CONFIG.etages - 1), p = pointSpirale(t), a = t * CONFIG.tours * Math.PI * 2;
    const lisere = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.05, 0.12), or);
    const bord = pointSpirale(t, CONFIG.rayon);
    lisere.position.set(bord.x, bord.y + 0.17, bord.z); lisere.rotation.y = -a;
    lisere.translateZ(0.8); groupe.add(lisere);
  }
  // La rampe intérieure, en pierre : un tube qui suit la spirale
  const pts = []; for (let i = 0; i <= 200; i++) { const p = pointSpirale(i / 200, CONFIG.rayon - 1.35); pts.push(new THREE.Vector3(p.x, p.y + 1.05, p.z)); }
  groupe.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), legere ? 200 : 400, 0.045, 8), new THREE.MeshStandardMaterial({ color: 0xB8955A, roughness: 0.35, metalness: 0.7 })));
}

function olivier(groupe) {
  const tronc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 5, 8), new THREE.MeshStandardMaterial({ color: COUL.tronc, roughness: 1 }));
  tronc.position.y = 2.5; tronc.rotation.z = 0.08; tronc.castShadow = true; groupe.add(tronc);
  const feuilles = new THREE.MeshStandardMaterial({ color: COUL.olivier, roughness: 0.95 });
  [[0, 5.6, 0, 2.2], [1.3, 5.1, 0.6, 1.5], [-1.2, 5.3, -0.5, 1.6], [0.3, 6.6, -0.4, 1.3]].forEach(([x, y, z, r]) => {
    const boule = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 3), feuilles);
    boule.position.set(x, y, z); boule.castShadow = true; groupe.add(boule);
  });
}

function decor(groupe, legere) {
  const r = hasard(42);
  const fleurs = new THREE.MeshStandardMaterial({ color: COUL.bougainvillier, roughness: 0.85 });
  const geoFleur = new THREE.SphereGeometry(0.22, 10, 8);
  for (let g = 0; g < (legere ? 7 : 14); g++) {
    const a = r() * Math.PI * 2, y = 2 + r() * (CONFIG.hauteur - 2);
    for (let k = 0; k < 26; k++) {
      const f = new THREE.Mesh(geoFleur, fleurs), da = (r() - 0.5) * 0.18;
      const d = MUR_R - 0.25 - r() * 0.35, chute = Math.pow(r(), 1.6) * 3.2;
      f.position.set(Math.cos(a + da) * d, y - chute, Math.sin(a + da) * d);
      f.scale.setScalar(0.7 + r() * 0.9 - chute * 0.12); groupe.add(f);
    }
  }
  // Les pots en terre cuite : la seule touche d'orange
  const terre = new THREE.MeshStandardMaterial({ color: COUL.terre, roughness: 0.85 });
  const geoPot = new THREE.CylinderGeometry(0.55, 0.38, 0.9, 16);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3, pot = new THREE.Mesh(geoPot, terre);
    pot.position.set(Math.cos(a) * (MUR_R - 1.2), 0.45, Math.sin(a) * (MUR_R - 1.2)); pot.castShadow = !legere; groupe.add(pot);
  }
}

function roi(groupe) {
  // Silhouette du roi des échecs du logo, tournée (lathe), en or
  const profil = [[0, 0], [1.3, 0], [1.3, 0.25], [1.05, 0.35], [0.95, 0.6], [0.6, 0.8], [0.45, 2.2], [0.75, 2.35], [0.75, 2.55],
    [0.5, 2.65], [0.7, 3.3], [0.25, 3.45], [0, 3.45]].map(([x, y]) => new THREE.Vector2(x, y));
  const or = new THREE.MeshStandardMaterial({ color: COUL.or, roughness: 0.3, metalness: 0.65 });
  const corps = new THREE.Mesh(new THREE.LatheGeometry(profil, 40), or); corps.castShadow = true;
  const croixV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), or); croixV.position.y = 3.85;
  const croixH = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.22), or); croixH.position.y = 3.95;
  const statue = new THREE.Group(); statue.add(corps, croixV, croixH);
  const fin = pointSpirale(1); const a = Math.atan2(fin.z, fin.x) + 0.55;
  statue.position.set(Math.cos(a) * (MUR_R - 2.2), CONFIG.hauteur + 1, Math.sin(a) * (MUR_R - 2.2));
  groupe.add(statue);
}

function horizon(groupe) {
  // La mer, visible seulement une fois au-dessus des murs
  const mer = new THREE.Mesh(new THREE.RingGeometry(MUR_R + 0.7, 380, 96, 1), new THREE.MeshStandardMaterial({ color: COUL.mer, roughness: 0.25, metalness: 0.1 }));
  mer.rotation.x = -Math.PI / 2; mer.position.y = CONFIG.hauteur - 6; groupe.add(mer);
  const soleil = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshBasicMaterial({ color: 0xFFE9B8, fog: false }));
  soleil.position.set(-180, CONFIG.hauteur + 22, -220); soleil.lookAt(0, CONFIG.hauteur, 0); groupe.add(soleil);
}

export function creerScene(canvas, { qualite = 'pleine' } = {}) {
  const legere = qualite === 'legere';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !legere, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, legere ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = !legere; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xF2EBDD, 60, 320);
  const cielMesh = ciel(); scene.add(cielMesh);
  const monde = new THREE.Group(); scene.add(monde);
  patio(monde, legere); escalier(monde, legere); olivier(monde); decor(monde, legere); roi(monde); horizon(monde);

  const ambiance = new THREE.HemisphereLight(0xFFF8EE, 0xF2E8D6, 1.7); scene.add(ambiance);
  const soleil = new THREE.DirectionalLight(LUMIERE_BAS.clone(), 2.1);
  soleil.position.set(10, 70, 6); soleil.castShadow = !legere;
  soleil.shadow.mapSize.set(2048, 2048);
  Object.assign(soleil.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 10, far: 140 });
  scene.add(soleil);

  const cam = new THREE.PerspectiveCamera(58, 1, 0.1, 900);
  const cible = new THREE.Vector3();

  function redimensionner(l, h) { renderer.setSize(l, h, false); cam.aspect = l / h; cam.updateProjectionMatrix(); }
  function rendre(t) {
    const c = cameraA(t);
    cam.position.set(c.position.x, c.position.y, c.position.z);
    cible.set(c.cible.x, c.cible.y, c.cible.z); cam.lookAt(cible);
    soleil.color.copy(LUMIERE_BAS).lerp(LUMIERE_HAUT, t);
    soleil.target.position.set(0, c.position.y - 10, 0); soleil.position.set(-34, c.position.y + 46, -12); soleil.target.updateMatrixWorld();
    const k = Math.max(0, (t - 0.45) / 0.55);   // bleu de l'après-midi -> crème doré -> orange du coucher
    if (k < 0.5) cielMesh.material.uniforms.haut.value.copy(CIEL_HAUT_MIDI).lerp(CIEL_HAUT_DORE, k * 2);
    else cielMesh.material.uniforms.haut.value.copy(CIEL_HAUT_DORE).lerp(CIEL_HAUT_SOIR, (k - 0.5) * 2);
    renderer.render(scene, cam);
  }

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    document.documentElement.classList.remove('scene-prete');
    document.documentElement.classList.replace('avec-3d', 'sans-3d');
  });

  redimensionner(innerWidth, innerHeight);
  rendre(0);
  document.documentElement.classList.add('scene-prete');
  window.__montee = { pret: true, qualite, rendre };
  return { rendre, redimensionner, detruire: () => renderer.dispose() };
}
