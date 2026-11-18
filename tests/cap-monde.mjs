import { chromium } from '@playwright/test';
const [sortie, l = 1440, h = 900] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +l, height: +h } });
const err = []; p.on('pageerror', e => err.push(String(e))); p.on('console', m => m.type() === 'error' && err.push(m.text()));
await p.goto('http://127.0.0.1:4173/monde/'); await p.waitForTimeout(2500);
const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (const f of [0, 0.25, 0.5, 0.75, 1]) {
  await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), Math.round(H * f)); await p.waitForTimeout(1800);
  await p.screenshot({ path: `${sortie}-${Math.round(f*100)}.png` });
}
const etat = await p.evaluate(() => [...document.querySelectorAll('video')].map(v => ({ src: v.currentSrc.split('/').pop().slice(0,30), t: +v.currentTime.toFixed(2), seek: v.seekable.length ? +v.seekable.end(0).toFixed(1) : 0 })));
console.log(JSON.stringify({ hauteur: H, erreurs: err, videos: etat }));
await b.close();
