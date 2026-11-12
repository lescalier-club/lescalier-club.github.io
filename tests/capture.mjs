// Usage : node tests/capture.mjs <chemin> <sortie.png> [largeur] [hauteur] [scrollY|bas]
import { chromium } from '@playwright/test';
const [chemin, sortie, l = 1440, h = 900, sc = 0] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +l, height: +h } });
const err = []; p.on('pageerror', e => err.push(String(e))); p.on('console', m => m.type() === 'error' && err.push(m.text()));
await p.goto('http://127.0.0.1:4173' + chemin); await p.waitForTimeout(1500);
if (sc) { await p.evaluate(v => scrollTo(0, v === 'bas' ? document.documentElement.scrollHeight : +v), sc); await p.waitForTimeout(1500); }
await p.screenshot({ path: sortie }); console.log(err.length ? 'ERREURS: ' + err.join(' | ') : 'sans erreur'); await b.close();
