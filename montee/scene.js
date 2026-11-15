// Le patio réaliste : la scène Blender (matières et plantes Poly Haven) affichée en vraie 3D,
// éclairée par un vrai ciel photographié (HDRI), un soleil chaud aux ombres douces,
// de l'occlusion ambiante et une lueur dorée qui s'intensifie à mesure qu'on monte.
// (L'ancienne scène en formes simples est gardée dans scene-simple.js.)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Rendu « cinéma » : grain de film très léger + vignettage doux (appliqué après l'image finale)
const CinemaShader = {
  uniforms: { tDiffuse: { value: null }, temps: { value: 0 }, grain: { value: 0.035 }, vignette: { value: 0.32 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float temps, grain, vignette; varying vec2 vUv;
    float bruit(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + temps) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= mix(1.0, smoothstep(0.85, 0.25, d), vignette);
      c.rgb += (bruit(vUv * 1000.0) - 0.5) * grain;
      gl_FragColor = vec4(c.rgb, 1.0);
    }`
};
import { cameraTourbillon as cameraA } from './spirale.js';

const TEINTE_OR = new THREE.Color(1.0, 0.86, 0.6);
const SOLEIL_BAS = new THREE.Color(0xFFE2B8), SOLEIL_HAUT = new THREE.Color(0xFFC27A);
// Le patio à lumière cuite s'il existe, sinon la version éclairée en temps réel
const FICHIER_PATIO = './modeles/patio-cuit.glb';

export function creerScene(canvas, { qualite = 'pleine' } = {}) {
  const legere = qualite === 'legere';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, legere ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !legere; renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xF6E3C4, 0.004);   // une brume dorée très légère : la profondeur
  const cam = new THREE.PerspectiveCamera(66, 1, 0.1, 1500);
  scene.add(new THREE.HemisphereLight(0xFFF1DC, 0xE9D2B0, 0.6));   // rebond chaud de la pierre
  const cible = new THREE.Vector3();

  // Soleil de fin d'après-midi : il entre par l'ouverture et dessine les ombres
  const soleil = new THREE.DirectionalLight(SOLEIL_BAS.clone(), 3.2);
  soleil.castShadow = !legere;
  soleil.shadow.mapSize.set(2048, 2048); soleil.shadow.radius = 2.5; soleil.shadow.blurSamples = 16; soleil.shadow.bias = -0.0004;
  Object.assign(soleil.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 140 });
  scene.add(soleil, soleil.target);

  // Poussière dorée qui flotte dans la lumière (en bougeant doucement autour de la caméra)
  const N = legere ? 260 : 700;
  const posPoussiere = new Float32Array(N * 3), phase = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 1.5 + Math.random() * 9, a = Math.random() * Math.PI * 2;
    posPoussiere.set([Math.cos(a) * r, (Math.random() - 0.5) * 14, Math.sin(a) * r], i * 3); phase[i] = Math.random() * 6.28;
  }
  const geoP = new THREE.BufferGeometry(); geoP.setAttribute('position', new THREE.BufferAttribute(posPoussiere, 3));
  const tache = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const d = g.createRadialGradient(16, 16, 0, 16, 16, 16); d.addColorStop(0, 'rgba(255,236,190,1)'); d.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = d; g.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const poussiere = new THREE.Points(geoP, new THREE.PointsMaterial({ size: 3 * Math.min(devicePixelRatio || 1, 2), sizeAttenuation: false, map: tache, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending, color: 0xFFD98A, fog: false }));
  scene.add(poussiere);
  const base = posPoussiere.slice();

  // Post-traitement : occlusion (coins plus sombres), lueur sur les zones claires, rendu final
  // Anti-crénelage intégré au rendu (4 échantillons) sur ordinateur : bords des marches nets
  const cible4x = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: legere ? 0 : 4 });
  const composer = new EffectComposer(renderer, cible4x);
  composer.addPass(new RenderPass(scene, cam));
  if (!legere) { const ao = new GTAOPass(scene, cam, 1, 1); ao.blendIntensity = 0.85; composer.addPass(ao); }
  const lueur = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.6, 0.88);
  composer.addPass(lueur);
  composer.addPass(new OutputPass());
  const cinema = new ShaderPass(CinemaShader);
  if (!legere) composer.addPass(cinema);

  let pret = false, tCourant = 0;
  function redimensionner(l, h) {
    renderer.setSize(l, h, false); composer.setSize(l, h); cam.aspect = l / h; cam.updateProjectionMatrix();
  }
  function dessiner(t) {
    const c = cameraA(t);
    cam.position.set(c.position.x, c.position.y, c.position.z);
    cible.set(c.cible.x, c.cible.y, c.cible.z); cam.lookAt(cible);
    // La lumière s'intensifie en montant
    renderer.toneMappingExposure = 1.0 + 0.5 * t;
    soleil.color.copy(SOLEIL_BAS).lerp(SOLEIL_HAUT, t);
    soleil.intensity = 5.5 + 3.5 * t;
    soleil.position.set(-24, c.position.y + 52, 10); soleil.target.position.set(0, c.position.y - 8, 0); soleil.target.updateMatrixWorld();
    lueur.strength = 0.18 + 0.35 * t;
    for (const m of cuits) { m.color.setScalar((0.92 + 0.3 * t) * m.userData.gain); if (m.userData.gain > 1) m.color.multiply(TEINTE_OR); }   // la lumière cuite s'éclaire aussi en montant
    // La poussière suit la caméra et dérive lentement
    const temps = performance.now() / 1000;
    poussiere.position.set(c.position.x * 0.3, c.position.y, c.position.z * 0.3);
    const arr = geoP.attributes.position.array;
    for (let i = 0; i < N; i++) { arr[i*3] = base[i*3] + Math.sin(temps * 0.25 + phase[i]) * 0.35; arr[i*3+1] = base[i*3+1] + Math.sin(temps * 0.18 + phase[i] * 2) * 0.5; }
    geoP.attributes.position.needsUpdate = true;
    poussiere.material.opacity = 0.35 + 0.35 * t;
    cinema.uniforms.temps.value = temps % 100;
    composer.render();
  }
  function rendre(t) { tCourant = t; if (pret) dessiner(t); }

  // Chargements : le ciel photographié et le patio exporté de Blender
  const draco = new DRACOLoader().setDecoderPath(new URL('../vendor/addons/libs/draco/gltf/', import.meta.url).href);
  const gltf = new GLTFLoader().setDRACOLoader(draco);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ciel = new RGBELoader().loadAsync(new URL('./modeles/ciel-soir-1k.hdr', import.meta.url).href).then(tex => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    scene.background = tex; scene.backgroundIntensity = 1.0; scene.environmentIntensity = 0.55;
  });
  const cuits = [];   // matières à lumière cuite : on les affiche telles que Cycles les a calculées
  const patio = gltf.loadAsync(new URL(FICHIER_PATIO, import.meta.url).href).then(g => {
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      if (o.material && o.material.name.startsWith('cuit_')) {
        const map = o.material.map; if (map) map.colorSpace = THREE.SRGBColorSpace;
        const nom = o.material.name;
        o.material = new THREE.MeshBasicMaterial({ map, toneMapped: false, fog: false, side: THREE.DoubleSide });
        // Les niches dorées : plus lumineuses et plus chaudes, comme sur la terrasse du toit
        o.material.userData.gain = nom === 'cuit_fond_dore' ? 1.9 : 1;
        cuits.push(o.material); o.castShadow = false; o.receiveShadow = false;
        return;
      }
      o.castShadow = !legere; o.receiveShadow = !legere;
      const m = o.material;
      if (m && m.name === 'mer') { m.roughness = 0.05; m.metalness = 0.1; }
      if (m && (m.name === 'or' || m.name === 'laiton')) { m.envMapIntensity = 2.0; m.roughness = Math.min(m.roughness ?? 0.3, 0.22); }
    });
    scene.add(g.scene);
  });
  Promise.all([ciel, patio]).then(() => {
    pret = true; dessiner(tCourant);
    // Boucle douce (30 i/s) pour que la poussière vive même sans défiler ; coupée si l'onglet est caché ou si l'utilisateur réduit les animations
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const pas = legere ? 66 : 33;
      (function vivre() { if (!document.hidden) dessiner(tCourant); setTimeout(() => requestAnimationFrame(vivre), pas); })();
    }
    document.documentElement.classList.add('scene-prete');
    window.__montee = { pret: true, qualite, rendre };
  }).catch(e => {
    console.warn('Montée : chargement 3D impossible, passage en mode texte', e);
    document.documentElement.classList.replace('avec-3d', 'sans-3d');
  });

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    document.documentElement.classList.remove('scene-prete');
    document.documentElement.classList.replace('avec-3d', 'sans-3d');
  });

  redimensionner(innerWidth, innerHeight);
  return { rendre, redimensionner, detruire: () => renderer.dispose() };
}
