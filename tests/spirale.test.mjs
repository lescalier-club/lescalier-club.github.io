import test from 'node:test'; import assert from 'node:assert/strict';
import { pointSpirale, camera, etageA, altitudeA, CONFIG } from '../montee/spirale.js';
test('bas et haut de la spirale', () => {
  assert.equal(pointSpirale(0).y, 0); assert.equal(pointSpirale(1).y, CONFIG.hauteur);
});
test('etages', () => { assert.equal(etageA(0), 0); assert.equal(etageA(0.5), 4); assert.equal(etageA(1), 8); assert.equal(etageA(1.3), 8); assert.equal(etageA(-0.2), 0); });
test('altitudes', () => { assert.equal(altitudeA(0), 0); assert.equal(altitudeA(1), 658); assert.equal(altitudeA(1/16), 60); });
test('la camera regarde plus haut qu’elle', () => { const c = camera(0.3); assert.ok(c.cible.y > c.position.y - 2); });

// Adam (15/11) : « un looping à un moment donné ». Le regard ne doit jamais pivoter brusquement.
test('cameraTourbillon : le regard tourne en douceur, sans retournement', async () => {
  const { cameraTourbillon } = await import('../montee/spirale.js');
  const dir = (t) => { const c = cameraTourbillon(t); const d = [c.cible.x - c.position.x, c.cible.y - c.position.y, c.cible.z - c.position.z];
    const n = Math.hypot(...d); return d.map(v => v / n); };
  let pire = 0;
  for (let i = 0; i < 1000; i++) {
    const a = dir(i / 1000), b = dir((i + 1) / 1000);
    const ang = Math.acos(Math.min(1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2])) * 180 / Math.PI;
    pire = Math.max(pire, ang);
  }
  assert.ok(pire < 2, `pivot maximal ${pire.toFixed(1)}° pour 0,1 % de défilement`);
});
