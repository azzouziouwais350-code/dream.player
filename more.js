/* more.js — dream.player : albums, artistes, grille, paroles, listes automatiques (après extras.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const say = (m, err) => window.DP.toast(m, err);
let GQ = [], grp = null, GM = LS('dp_grid', false), LY = [], LP = '', lastView = '';
const PH = 'art/cover.svg';
window.DP.GQ = () => GQ;            // lu par l'accueil (liste « à suivre »)

/* ---------- Album + année (tags ID3) ---------- */
async function meta(f) {
  try {
    const b = new Uint8Array(await f.slice(0, 400000).arrayBuffer()), o = {};
    if (b[0] !== 73 || b[1] !== 68 || b[2] !== 51) return o;
    const v = b[3], end = Math.min(((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]) + 10, b.length);
    const dec = a => new TextDecoder(a[0] === 1 || a[0] === 2 ? 'utf-16' : a[0] === 3 ? 'utf-8' : 'iso-8859-1').decode(a.slice(1)).replace(/\0/g, '');
    for (let p = 10; p + 10 < end;) {
      const id = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
      const fs = v === 4 ? (b[p + 4] << 21) | (b[p + 5] << 14) | (b[p + 6] << 7) | b[p + 7]
                         : ((b[p + 4] << 24) | (b[p + 5] << 16) | (b[p + 6] << 8) | b[p + 7]) >>> 0;
      if (!fs || !/^[A-Z0-9]{4}$/.test(id)) break;
      const d = b.slice(p + 10, p + 10 + fs);
      if (id === 'TALB') o.album = dec(d);
      else if (id === 'TYER' || id === 'TDRC') o.year = dec(d).slice(0, 4);
      p += 10 + fs;
    }
    return o;
  } catch { return {}; }
}
let busy = false;
async function enrich() {
  if (busy) return; busy = true;
  let ch = false;
  for (const t of [...tracks]) if (!t._m) { t._m = 1; const m = await meta(t.blob); t.alb = m.album || ''; t.yr = m.year || ''; ch = true; }
  busy = false;
  if (ch && /^(albums|artists)$/.test($('#vsel').value)) renderList();
}

/* ---------- Lecture d'une liste ---------- */
function playList(list, sh) {
  list = [...list];
  if (sh) list.sort(() => Math.random() - .5);
  const i = tracks.findIndex(t => t.id === list[0].id);
  GQ = list.slice(1).map(t => t.id);
  load(i, true);
}
const _n = next;
next = a => {
  while (GQ.length) { const i = tracks.findIndex(x => x.id === GQ.shift()); if (i >= 0) return load(i, true); }
  _n(a);
};
$('#list').addEventListener('click', () => { if (!/^(albums|artists|top|never)$/.test($('#vsel').value)) GQ = []; }, true);

/* ---------- Vues Albums / Artistes / listes auto ---------- */
const groups = v => {
  const m = new Map();
  tracks.forEach(t => {
    const k = v === 'albums' ? (t.alb || 'Sans album') : (t.artist || 'Artiste inconnu');
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(t);
  });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};
function simpleRows(list, l) {
  list.forEach((t, k) => {
    const d = document.createElement('div');
    d.className = 'track' + (tracks[idx] === t ? ' cur' : '');
    d.innerHTML = '<span class="n"></span><span class="t"></span>';
    d.children[0].textContent = String(k + 1).padStart(2, '0');
    d.children[1].textContent = t.name;
    d.onclick = () => playList(list.slice(k), false);
    l.appendChild(d);
  });
}
function thumbs(l) {
  l.querySelectorAll('.track').forEach(r => {
    const t = tracks.find(x => x.name === r.querySelector('.t').textContent), im = document.createElement('img');
    im.alt = ''; im.src = t && t.cover ? t.cover : PH;
    r.insertBefore(im, r.firstChild);
  });
}
const _rl = renderList;
renderList = () => {
  const l = $('#list'), v = $('#vsel').value, special = /^(albums|artists|top|never)$/.test(v);
  if (v !== lastView) { grp = null; lastView = v; }       // on change de vue : retour à la liste des groupes
  enrich();
  l.classList.toggle('gridv', special ? (v === 'albums' || v === 'artists') && !grp : GM);
  if (!special) { _rl(); if (GM && l.classList.contains('gridv')) thumbs(l); return; }
  l.innerHTML = '';
  const empty = () => { l.innerHTML = emptyBox('Rien ici pour le moment.'); };
  if (v === 'top' || v === 'never') {
    const H = LS('dp_hist', {});
    const list = v === 'top' ? tracks.filter(t => H[t.id]).sort((a, b) => H[b.id].n - H[a.id].n) : tracks.filter(t => !H[t.id]);
    return list.length ? simpleRows(list, l) : empty();
  }
  const g = groups(v);
  if (!g.length) return empty();
  if (!grp) {
    g.forEach(([name, list]) => {
      const d = document.createElement('div'), t0 = list.find(t => t.cover);
      d.className = 'track';
      d.innerHTML = '<img alt=""><span class="t"></span><small></small>';
      d.querySelector('img').src = t0 ? t0.cover : PH;
      d.querySelector('.t').textContent = name;
      d.querySelector('small').textContent = list.length + ' titre' + (list.length > 1 ? 's' : '');
      d.onclick = () => { grp = name; renderList(); };
      l.appendChild(d);
    });
    return;
  }
  const cur = g.find(x => x[0] === grp);
  if (!cur) { grp = null; return renderList(); }
  const list = cur[1], t0 = list.find(t => t.cover), yr = list.map(t => t.yr).find(Boolean) || '';
  const h = document.createElement('div');
  h.className = 'ghead';
  h.innerHTML = '<img alt=""><div><b></b><small></small></div>';
  h.querySelector('img').src = t0 ? t0.cover : PH;
  h.querySelector('b').textContent = grp;
  h.querySelector('small').textContent = [v === 'albums' ? (list[0].artist || '') : '', yr, list.length + ' titre' + (list.length > 1 ? 's' : '')].filter(Boolean).join(' · ');
  l.appendChild(h);
  const bar = document.createElement('div');
  bar.className = 'gbar';
  [['← Retour', () => { grp = null; renderList(); }], ['▶ Tout lire', () => playList(list, false)], ['Aléatoire', () => playList(list, true)]].forEach(([n, f]) => {
    const b = document.createElement('button'); b.textContent = n; b.onclick = f; bar.appendChild(b);
  });
  l.appendChild(bar);
  simpleRows(list, l);
};

/* ---------- Grille / liste ---------- */
const gb = () => { $('#gridt').textContent = GM ? 'Liste' : 'Grille'; $('#gridb').setAttribute('aria-pressed', GM); };
$('#gridb').onclick = () => { GM = !GM; try { localStorage.setItem('dp_grid', JSON.stringify(GM)); } catch {} gb(); renderList(); };
gb();

/* ---------- Paroles (.lrc ou texte) ---------- */
const parseL = s => {
  const out = []; let any = false;
  s.split(/\r?\n/).forEach(ln => {
    const m = ln.match(/^((?:\[\d+:\d+(?:[.:]\d+)?\])+)(.*)$/);
    if (!m) return;
    any = true;
    [...m[1].matchAll(/\[(\d+):(\d+)(?:[.:](\d+))?\]/g)].forEach(x => out.push({ t: +x[1] * 60 + +x[2] + (x[3] ? +('0.' + x[3]) : 0), s: m[2].trim() }));
  });
  return any ? out.sort((a, b) => a.t - b.t) : [];
};
function setLy(t) {
  LY = []; LP = ''; $('#lyr').textContent = '';
  if (!t) return;
  const raw = localStorage.getItem('dp_lrc_' + t.id);
  if (!raw) return;
  LY = parseL(raw);
  LP = LY.length ? LY.map(x => x.s).join('\n') : raw;
  if (!LY.length) $('#lyr').textContent = 'paroles (touche pour lire)';
}
audio.addEventListener('timeupdate', () => {
  if (!LY.length) return;
  let s = '';
  for (const x of LY) { if (x.t <= audio.currentTime) s = x.s; else break; }
  if ($('#lyr').textContent !== s) $('#lyr').textContent = s;
});
const _ld = load;
load = (i, a) => { _ld(i, a); setLy(tracks[i]); };
$('#lrcb').onclick = () => { if (idx < 0) return say("Choisis d'abord un morceau"); $('#lrcf').click(); };
$('#lrcf').onchange = async e => {
  const f = e.target.files[0];
  if (f && tracks[idx]) {
    try { localStorage.setItem('dp_lrc_' + tracks[idx].id, await f.text()); setLy(tracks[idx]); say('Paroles ajoutées'); }
    catch { say('Impossible de lire ce fichier', true); }
  }
  e.target.value = '';
};
const openLy = () => {
  if (!LP) return;
  const o = document.createElement('div');
  o.className = 'sheet';
  o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
  o.innerHTML = '<div class="sh"><h4></h4><pre></pre></div>';
  o.querySelector('h4').textContent = tracks[idx] ? tracks[idx].name : '';
  o.querySelector('pre').textContent = LP;
  o.onclick = e => { if (e.target === o) o.remove(); };
  o.addEventListener('keydown', e => { if (e.key === 'Escape') o.remove(); });
  document.body.appendChild(o);
};
$('#lyr').onclick = openLy;
$('#lyr').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLy(); } });
})();
