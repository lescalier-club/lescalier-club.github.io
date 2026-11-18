import { test } from 'node:test'; import assert from 'node:assert/strict';
import { preparer, page, BASE } from './aide.mjs';
preparer();
const pret = p => p.waitForFunction(() => window.__montee?.pret === true, null, { timeout: 15000 });

test('scene-prete-sans-erreur', async () => {
  const p = await page('desktop'); await p.goto(BASE + '/'); await pret(p);
  assert.deepEqual(p.erreurs, []);
  assert.equal(await p.evaluate(() => window.__montee.qualite), 'pleine');
  assert.ok(await p.evaluate(() => document.documentElement.classList.contains('scene-prete')));
});

test('qualite-mobile-legere', async () => {
  const p = await page('mobile'); await p.goto(BASE + '/'); await pret(p);
  assert.equal(await p.evaluate(() => window.__montee.qualite), 'legere');
});

test('contexte-perdu-bascule-texte', async () => {
  const p = await page('desktop'); await p.goto(BASE + '/'); await pret(p);
  await p.evaluate(() => document.getElementById('scene').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await p.waitForFunction(() => document.documentElement.classList.contains('sans-3d'), null, { timeout: 5000 });
  await p.locator('#sommet').scrollIntoViewIfNeeded();
  assert.ok(await p.locator('#sommet').isVisible());
});
