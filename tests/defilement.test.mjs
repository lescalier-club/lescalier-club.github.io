import { test } from 'node:test'; import assert from 'node:assert/strict';
import { preparer, page, BASE } from './aide.mjs';
preparer();
const pret = p => p.waitForFunction(() => window.__montee?.pret === true, null, { timeout: 15000 });
const actif = p => p.evaluate(() => document.querySelector('.palier.actif')?.dataset.etage);
const altitude = p => p.locator('#altitude').innerText();
const bas = p => p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
const attendre = (p, etage) => p.waitForFunction(e => document.querySelector('.palier.actif')?.dataset.etage === e, etage, { timeout: 8000 });

test('monter-jusqu-au-sommet', async () => {
  const p = await page(); await p.goto(BASE + '/'); await pret(p);
  await bas(p); await attendre(p, '8');
  assert.equal(await actif(p), '8');
  await p.waitForFunction(() => document.getElementById('altitude').innerText.trim() === '658 m', null, { timeout: 8000 });
});

test('redescendre-revient-au-palier-0', async () => {
  const p = await page(); await p.goto(BASE + '/'); await pret(p);
  await bas(p); await attendre(p, '8');
  await p.evaluate(() => scrollTo(0, 0)); await attendre(p, '0');
  await p.waitForFunction(() => document.getElementById('altitude').innerText.trim() === '0 m', null, { timeout: 8000 });
});

test('ancre-sommet', async () => {
  const p = await page(); await p.goto(BASE + '/#sommet'); await pret(p);
  await attendre(p, '8');
});

test('redimensionner-garde-le-palier', async () => {
  const p = await page(); await p.goto(BASE + '/'); await pret(p);
  await p.evaluate(() => scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) / 2, behavior: 'instant' }));
  await p.waitForTimeout(800); const avant = await actif(p); assert.ok(avant, 'aucun palier actif');
  await p.setViewportSize({ width: 800, height: 600 }); await p.waitForTimeout(800);
  assert.equal(await actif(p), avant);
});

test('mouvement-reduit', async () => {
  const p = await page('desktop', { reducedMotion: 'reduce' }); await p.goto(BASE + '/');
  await p.waitForFunction(() => document.documentElement.classList.contains('sans-3d'));
  assert.equal(await p.locator('#scene').isVisible(), false);
});
