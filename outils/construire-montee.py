#!/usr/bin/env python3
"""Génère montee/index.html à partir de index.html (le texte du site reste mot pour mot).
Lancé une fois pour créer la page ; ensuite montee/index.html se modifie à la main."""
import re, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
s = (RACINE / 'index.html').read_text()
s = s.replace('ensemble sur Discord', 'ensemble en ligne')  # Discord réservé aux membres (spec)

tete = s[:s.index('<body>')]
tete = tete.replace('<html lang="fr">', '<html lang="fr" class="avec-3d">')
tete = tete.replace('href="media/', 'href="../media/')
tete = tete.replace('<meta name="referrer"', '<meta name="robots" content="noindex">\n<meta name="referrer"', 1)
# Couleurs codées en dur dans le style recopié : crème transparent (fait pour un fond noir) -> pierre transparent, etc.
import re as _re
tete = _re.sub(r'rgba\( ?244, ?241, ?233, ?', 'rgba(58, 49, 40, ', tete)
tete = _re.sub(r'rgba\( ?21, ?18, ?14, ?', 'rgba(242, 235, 221, ', tete)
tete = _re.sub(r'rgba\( ?215, ?102, ?52, ?', 'rgba(154, 107, 11, ', tete)
tete = tete.replace('</head>', '<link rel="stylesheet" href="montee.css">\n</head>')

ROI = ('<g transform="translate(39.5 0) scale(1.15)" fill="var(--or)"><rect x="4" y="0" width="2" height="3"/><rect x="3" y="1" width="4" height="1"/>'
       '<rect x="3" y="3" width="4" height="2"/><rect x="2" y="5" width="6" height="1"/><polygon points="3.6,6 6.4,6 7.4,12 2.6,12"/><rect x="2" y="12" width="6" height="2"/></g>')
MENU = ('<a id="aller-sommet" class="evitement" href="#sommet">Aller au sommet</a>\n'
        '<header id="menu"><a class="logo" href="#depart" aria-label="L\'Escalier, retour au départ">'
        '<svg viewBox="0 0 60 64" aria-hidden="true"><path d="M3 61 V52 H15 V40 H27 V28 H39 V16 H51" fill="none" stroke="var(--pierre)" stroke-width="5" stroke-linecap="square"/>'
        + ROI + '</svg><span>L’ESCALIER</span></a>'
        '<nav aria-label="Pages du club"><a href="/le-club/">Le club</a><a href="/rejoindre/">Rejoindre</a><a href="/rendez-vous/">Les rendez-vous</a>'
        '<a href="/questions/">Questions</a><a href="/fondateur/">Le fondateur</a><a href="/journal/">Le journal</a></nav></header>\n'
        '<canvas id="scene" aria-hidden="true"></canvas>\n<div id="altitude" aria-live="polite">0 m</div>\n')

sections = re.findall(r'<section\b[^>]*>.*?</section>', s, re.S)
garder = [x for x in sections if 'id="questions"' not in x]
assert len(garder) == 9, len(garder)
paliers = []
for n, sec in enumerate(garder):
    sec = re.sub(r'<section class="([^"]*)"', lambda m: f'<section class="{m[1]} palier" data-etage="{n}"', sec, count=1)
    if n == 0:
        sec = re.sub(r'\s*<canvas id="topo"[^>]*></canvas>', '', sec)
        sec = re.sub(r'\s*<div class="top">.*?</a>\s*</div>', '', sec, count=1, flags=re.S)
    if n == 1:
        sec = sec.replace('id="pourquoi"', 'id="palier-adam"')
        sec = re.sub(r'<video[^>]*>(\s*</video>)?', '<img src="../media/adam.jpg" alt="Adam Abad, fondateur de L’Escalier" loading="lazy">', sec)
    if n == 8:
        sec = re.sub(r'<b>Entre sur le Discord</b><span>[^<]*</span>', "<b>Après l'appel, je t'envoie ton accès</b>", sec)
        sec = re.sub(r'\s*<a class="btn ghost" id="lien-discord"[^>]*>[^<]*</a>', '', sec)
    sec = sec.replace('src="media/', 'src="../media/')
    paliers.append(sec)

pied = re.search(r'<footer>.*?</footer>', s, re.S).group(0)
script = re.search(r'<script>(.*?)</script>', s, re.S).group(1)
script = re.sub(r'\n\s*discord: "",[^\n]*', '', script)
script = script.replace('["lien-discord", LIENS.discord], ', '')
script = re.sub(r'\n\s*document\.getElementById\("h-places"\)[^\n]*', '', script)
script = re.sub(r'\n\s*const n = Math\.floor[^\n]*\n\s*document\.getElementById\("h-jour"\)\.textContent =\n[^\n]*\n', '\n', script)
for bloc in ('portrait', 'altimetre', 'topo'):
    script = re.sub(r'\n(//[^\n]*\n)?\(function ' + bloc + r'\(\) \{.*?\n\}\)\(\);', '', script, flags=re.S)
assert 'discord' not in script.lower() and 'topo' not in script and 'h-jour' not in script

page = (tete + '<body>\n' + MENU + '<main id="montee">\n' + '\n\n'.join(paliers) + '\n</main>\n\n' + pied
        + '\n\n<script>' + script + '</script>\n<script type="module" src="montee.js"></script>\n</body>\n</html>\n')
(RACINE / 'montee' / 'index.html').write_text(page)
print('montee/index.html :', len(page), 'octets')
