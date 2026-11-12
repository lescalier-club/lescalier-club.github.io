import { test } from 'node:test'; import assert from 'node:assert/strict';
import { preparer, page, BASE } from './aide.mjs';
preparer();
const MENU = ['Le club', 'Rejoindre', 'Les rendez-vous', 'Questions', 'Le fondateur', 'Le journal'];
for (const app of ['desktop', 'mobile']) {
  const ouvrir = async () => { const p = await page(app); await p.goto(BASE + '/montee/'); return p; };
  test(`${app} neuf-paliers-dans-l-ordre`, async () => {
    const p = await ouvrir();
    assert.deepEqual(await p.locator('.palier').evaluateAll(e => e.map(x => x.dataset.etage)), ['0','1','2','3','4','5','6','7','8']);
    assert.match(await p.locator('#depart h1').innerText(), /Le club des entrepreneurs qui/);
  });
  test(`${app} pas-de-discord`, async () => { const p = await ouvrir(); assert.doesNotMatch(await p.content(), /discord/i); });
  test(`${app} sommet-sans-discord`, async () => { const p = await ouvrir(); assert.match(await p.locator('#sommet').innerText(), /Après l'appel, je t'envoie ton accès/); });
  test(`${app} photo-pas-video`, async () => {
    const p = await ouvrir(); assert.equal(await p.locator('video').count(), 0);
    assert.equal(await p.locator('#palier-adam img[src$="adam.jpg"]').count(), 1);
  });
  test(`${app} menu-complet-et-visible`, async () => {
    const p = await ouvrir(); const l = (await p.locator('#menu a').allInnerTexts()).map(s => s.trim());
    for (const m of MENU) assert.ok(l.includes(m), m);
    const menu = await p.locator('#menu').boundingBox(); const t = await p.locator('#depart h1').boundingBox();
    assert.ok(t.y >= menu.y + menu.height, 'le menu recouvre le titre');
  });
  test(`${app} noindex`, async () => { const p = await ouvrir(); assert.equal(await p.locator('meta[name=robots]').getAttribute('content'), 'noindex'); });
  test(`${app} clavier-premier-lien-sommet`, async () => {
    const p = await ouvrir(); await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement?.id), 'aller-sommet');
  });
}
