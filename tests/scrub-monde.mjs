import { chromium } from '@playwright/test';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:4173/monde/'); await p.waitForTimeout(3000);
const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const out = [];
for (const f of [0.02, 0.06, 0.1, 0.14]) {
  await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), Math.round(H * f)); await p.waitForTimeout(1500);
  out.push(await p.evaluate(() => { const v = [...document.querySelectorAll('video')].find(v => getComputedStyle(v).opacity !== '0' && v.readyState > 0) || document.querySelector('video'); return { t: +v.currentTime.toFixed(2), seek: v.seekable.length ? +v.seekable.end(0).toFixed(1) : 0, rs: v.readyState }; }));
}
console.log(JSON.stringify(out)); await b.close();
