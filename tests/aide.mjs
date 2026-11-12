// Petit cadre de test navigateur : node --test + bibliothèque Playwright (le lanceur « playwright test » se bloque sur ce Mac).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { before, after } from 'node:test';
export const BASE = 'http://127.0.0.1:4173';
export const APPAREILS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};
let navigateur, serveur;
export function preparer() {
  before(async () => {
    const ok = await fetch(BASE + '/').then(r => r.ok).catch(() => false);
    if (!ok) { serveur = spawn('npx', ['http-server', '-p', '4173', '-s', '-c-1', '.'], { stdio: 'ignore' }); for (let i = 0; i < 40; i++) { if (await fetch(BASE + '/').then(r => r.ok).catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); } }
    navigateur = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  });
  after(async () => { await navigateur?.close(); serveur?.kill(); });
}
export async function page(appareil = 'desktop', options = {}) {
  const ctx = await navigateur.newContext({ ...APPAREILS[appareil], ...options });
  const p = await ctx.newPage(); p.erreurs = [];
  p.on('pageerror', e => p.erreurs.push(String(e))); p.on('console', m => m.type() === 'error' && p.erreurs.push(m.text()));
  return p;
}
