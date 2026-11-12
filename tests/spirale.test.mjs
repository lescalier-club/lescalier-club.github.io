import test from 'node:test'; import assert from 'node:assert/strict';
import { pointSpirale, camera, etageA, altitudeA, CONFIG } from '../montee/spirale.js';
test('bas et haut de la spirale', () => {
  assert.equal(pointSpirale(0).y, 0); assert.equal(pointSpirale(1).y, CONFIG.hauteur);
});
test('etages', () => { assert.equal(etageA(0), 0); assert.equal(etageA(0.5), 4); assert.equal(etageA(1), 8); assert.equal(etageA(1.3), 8); assert.equal(etageA(-0.2), 0); });
test('altitudes', () => { assert.equal(altitudeA(0), 0); assert.equal(altitudeA(1), 658); assert.equal(altitudeA(1/16), 60); });
test('la camera regarde plus haut qu’elle', () => { const c = camera(0.3); assert.ok(c.cible.y > c.position.y - 2); });
