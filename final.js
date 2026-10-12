/* final.js — dream.player : intro, horloge, aléatoire intelligent, préchargement, glisser-déposer des playlists (après more.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

/* ---------- Intro (retirée à la fin de son animation) + horloge ---------- */
setTimeout(() => { const s = $('#boot'); if (s) s.remove(); }, 2100);
const tick = () => {
  const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.querySelectorAll('.clkt').forEach(e => { e.textContent = t; });
};
tick(); setInterval(tick, 20000);

/* ---------- Préchargement + animation du titre ---------- */
const RH = [];
const PRE = new Audio();
PRE.preload = 'auto'; PRE.muted = true;
const _ld = load;
load = (i, a) => {
  _ld(i, a);
  const t = tracks[i];
  if (!t) return;
  RH.push(t.id); if (RH.length > 30) RH.shift();
  const n = $('#now'); n.classList.remove('tin'); void n.offsetWidth; n.classList.add('tin');
  const nx = tracks[i + 1];
  if (!shuffle && nx && nx.url) PRE.src = nx.url;
};

/* ---------- Aléatoire intelligent (évite les répétitions, favorise favoris et morceaux peu écoutés) ---------- */
function pick() {
  const H = LS('dp_hist', {}), avoid = new Set(RH.slice(-Math.min(10, tracks.length - 1)));
  let tot = 0;
  const w = tracks.map((t, i) => {
    if (i === idx || avoid.has(t.id)) return 0;
    const n = (H[t.id] || {}).n || 0;
    const x = (t.fav ? 2 : 1) * (n ? 1 / (1 + n * .3) : 1.5);
    tot += x; return x;
  });
  if (!tot) return -1;
  let r = Math.random() * tot;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0 && w[i]) return i; }
  return w.findIndex(x => x > 0);
}
const _nx = next;
next = a => {
  if (shuffle && tracks.length > 2 && !(a && repeat === 2)) {
    const p = pick();
    if (p >= 0) {
      shuffle = false; idx = p - 1;
      try { _nx(a); } finally { shuffle = true; }
      return;
    }
  }
  _nx(a);
};

/* ---------- Liste : synchro des filtres/accueil + glisser-déposer dans les playlists ---------- */
const _rl = renderList;
renderList = () => {
  _rl();
  window.DP.sync();
  const v = $('#vsel').value;
  if (!v.startsWith('pl:') || $('#q').value || $('#favf').classList.contains('on') || $('#list').classList.contains('gridv')) return;
  const l = $('#list'), arr = window.DP.PL()[v.slice(3)];
  if (!arr) return;
  const ids = arr.filter(id => tracks.some(t => t.id === id));
  [...l.querySelectorAll('.track')].forEach((r, k) => {
    if (k >= ids.length) return;
    const h = document.createElement('span');
    h.className = 'dh'; h.setAttribute('aria-hidden', 'true'); h.innerHTML = icon('grip');
    h.onclick = e => e.stopPropagation();
    h.onpointerdown = e => {
      e.preventDefault(); e.stopPropagation();
      h.setPointerCapture(e.pointerId); r.classList.add('drag');
      const y0 = e.clientY; let to = k;
      h.onpointermove = ev => {
        r.style.transform = `translateY(${ev.clientY - y0}px)`;
        const rows = [...l.querySelectorAll('.track')];
        to = rows.findIndex((x, j) => j !== k && ev.clientY < x.getBoundingClientRect().top + x.offsetHeight / 2);
        if (to < 0) to = rows.length;
      };
      h.onpointerup = h.onpointercancel = () => {
        h.onpointermove = h.onpointerup = h.onpointercancel = null;
        r.classList.remove('drag'); r.style.transform = '';
        const ins = to > k ? to - 1 : to;
        if (ins !== k) {
          const [m] = ids.splice(k, 1); ids.splice(ins, 0, m);
          arr.splice(0, arr.length, ...ids); window.DP.save();
        }
        renderList();
      };
    };
    r.appendChild(h);
  });
};
})();
