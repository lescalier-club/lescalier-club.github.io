// La hype : Jour 1 = dim. 22/11/2026, Jour 30 = lun. 21/12/2026 (décision d'Adam du 21/11).
// Publier un épisode = ajouter une ligne dans EPISODES (lien du Reel ; image facultative, ex. "/hype/j1.jpg").
const HYPE = { jour1: "2026-11-22T00:00:00+01:00", fin: "2026-12-22T00:00:00+01:00" };
const EPISODES = [
  // { jour: 1, titre: "70 % sérieux, 30 % kiff", lien: "https://www.instagram.com/reel/...", image: "" },
];
const JOUR_MS = 86400000;
const debut = new Date(HYPE.jour1), fin = new Date(HYPE.fin);
const jourDe = d => Math.floor((d - debut) / JOUR_MS) + 1;
const deux = n => String(n).padStart(2, "0");
const dateDu = j => new Date(debut.getTime() + (j - 1) * JOUR_MS).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "numeric" });

function etat() {
  const jour = jourDe(new Date());
  const elJour = document.getElementById("h-jour"), elEtat = document.getElementById("h-etat"), cible = document.getElementById("c-cible");
  let vers;
  if (jour < 1) { elJour.textContent = "1"; elEtat.textContent = "La hype commence bientôt"; vers = debut; cible.textContent = "avant le Jour 1, dimanche 22 novembre"; }
  else if (jour <= 30) { elJour.textContent = jour; elEtat.textContent = "La hype · en direct"; vers = fin; cible.textContent = "avant la fin du Jour 30, lundi 21 décembre"; }
  else { elJour.textContent = "30"; elEtat.textContent = "La hype est terminée"; vers = null; cible.textContent = "Merci d’avoir suivi la montée"; }
  const reste = vers ? Math.max(0, vers - new Date()) : 0;
  document.getElementById("c-j").textContent = deux(Math.floor(reste / JOUR_MS));
  document.getElementById("c-h").textContent = deux(Math.floor(reste / 3600000) % 24);
  document.getElementById("c-m").textContent = deux(Math.floor(reste / 60000) % 60);
  document.getElementById("c-s").textContent = deux(Math.floor(reste / 1000) % 60);
  return jour;
}

(function construire() {
  const jour = etat();
  setInterval(etat, 1000);
  const parJour = Object.fromEntries(EPISODES.map(e => [e.jour, e]));
  const dernier = EPISODES.slice().sort((a, b) => b.jour - a.jour)[0];
  if (dernier) { document.getElementById("regarder").href = dernier.lien; document.getElementById("regarder-txt").textContent = `Regarder le Jour ${dernier.jour}`; }

  const esc = document.getElementById("escalier"), grille = document.getElementById("episodes");
  for (let j = 1; j <= 30; j++) {
    const m = document.createElement("div");
    m.className = "marche" + (j < jour || parJour[j] ? " faite" : "") + (j === jour ? " aujourdhui" : "");
    m.style.height = `${(j / 30) * 100}%`; m.setAttribute("role", "listitem"); m.setAttribute("aria-label", `Jour ${j}`);
    esc.append(m);

    const e = parJour[j];
    const c = document.createElement(e ? "a" : "div");
    c.setAttribute("role", "listitem");
    c.className = "ep" + (e ? " publie" : j > jour ? " verrou" : "") + (j === jour ? " aujourdhui" : "");
    if (e) { c.href = e.lien; c.rel = "noopener"; if (e.image) { const im = document.createElement("img"); im.src = e.image; im.alt = ""; im.loading = "lazy"; c.append(im); } const l = document.createElement("span"); l.className = "lecture"; l.textContent = "▶"; c.append(l); }
    const haut = document.createElement("div");
    const nj = document.createElement("div"); nj.className = "j"; nj.textContent = j;
    const d = document.createElement("div"); d.className = "d"; d.textContent = j === jour ? "Aujourd’hui" : dateDu(j);
    haut.append(nj, d);
    const t = document.createElement("div"); t.className = "t"; t.textContent = e ? e.titre : (j < jour ? "Bientôt en ligne" : "");
    c.append(haut, t);
    grille.append(c);
  }
})();
