import { test } from 'node:test'; import assert from 'node:assert/strict';
import { preparer, page, BASE } from './aide.mjs';
preparer();
const MENU = ['Le club', 'Rejoindre', 'Les rendez-vous', 'Questions', 'Le fondateur', 'Le journal'];
for (const app of ['desktop', 'mobile']) {
  const ouvrir = async () => { const p = await page(app); await p.goto(BASE + '/'); return p; };
  test(`${app} neuf-paliers-dans-l-ordre`, async () => {
    const p = await ouvrir();
    assert.deepEqual(await p.locator('.palier').evaluateAll(e => e.map(x => x.dataset.etage)), ['0','1','2','3','4','5','6','7','8']);
    assert.match(await p.locator('#depart h1').innerText(), /Le club des entrepreneurs qui/);
  });
  // Textes v3 adoptés par Adam (15/11) : Discord n'apparaît que dans la formule Membre, le sommet mène à la Session gratuite
  test(`${app} discord-seulement-formule-membre`, async () => { const p = await ouvrir();
    const hors = await p.evaluate(() => [...document.querySelectorAll('.palier')].filter(e => e.id !== 'membre').map(e => e.innerText).join(' '));
    assert.doesNotMatch(hors, /discord/i); });
  test(`${app} sommet-vers-la-session`, async () => { const p = await ouvrir(); assert.match(await p.locator('#sommet').innerText(), /Réserve ta place à la Session/); });
  // 18/11 (demande d'Adam) : la vidéo du Belaroïa remplace la photo ; muette et en ligne sur iPhone, jamais recadrée
  test(`${app} video-belaroia`, async () => {
    const p = await ouvrir(); const v = p.locator('#palier-adam video[src$="adam-belaroia.mp4"]');
    assert.equal(await v.count(), 1);
    assert.equal(await v.evaluate(e => e.muted && e.playsInline && getComputedStyle(e).objectFit), 'contain');
  });
  test(`${app} menu-complet-et-visible`, async () => {
    const p = await ouvrir(); const l = (await p.locator('#menu a').allInnerTexts()).map(s => s.trim());
    for (const m of MENU) assert.ok(l.includes(m), m);
    const menu = await p.locator('#menu').boundingBox(); const t = await p.locator('#depart h1').boundingBox();
    assert.ok(t.y >= menu.y + menu.height, 'le menu recouvre le titre');
  });
  // Depuis le 18/11 la montée est la page d'accueil : Google doit pouvoir la référencer
  test(`${app} referencable`, async () => { const p = await ouvrir(); assert.equal(await p.locator('meta[name=robots][content*=noindex]').count(), 0); });
  test(`${app} clavier-premier-lien-sommet`, async () => {
    const p = await ouvrir(); await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement?.id), 'aller-sommet');
  });
}
