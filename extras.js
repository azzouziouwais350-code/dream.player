/* extras.js — dream.player : bibliothèque (vues, playlists, favoris, file d'attente), historique, réglages, données (après premium.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const root = document.documentElement.style;
let PL = LS('dp_pl', {}), H = LS('dp_hist', {}), Q = [];
const CF = Object.assign({ mode: '', fi: .6, anim: true, acc: '', notif: false }, LS('dp_set', {}));

/* ---------- Outils ---------- */
let tt;
const toast = (m, err) => {
  let e = $('#toast');
  if (!e) { e = document.createElement('div'); e.id = 'toast'; e.setAttribute('role', 'status'); e.setAttribute('aria-live', 'polite'); document.body.appendChild(e); }
  e.innerHTML = icon(err ? 'warn' : 'sparkle') + '<span></span>';
  e.lastChild.textContent = m;
  e.classList.toggle('err', !!err); e.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 2600);
};
const fp = e => e.style.setProperty('--p', ((e.value - e.min) / (e.max - e.min) * 100) + '%');
const R = new Promise((ok, ko) => {
  if (!window.indexedDB) return ko(new Error('IndexedDB indisponible'));
  const r = indexedDB.open('dreamplayer', 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('t')) r.result.createObjectStore('t', { keyPath: 'id' }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
});
const favSave = t => R.then(d => {
  const s = d.transaction('t', 'readwrite').objectStore('t'), g = s.get(t.id);
  g.onsuccess = () => { if (g.result) { g.result.fav = !!t.fav; s.put(g.result); } };
}).catch(() => {});
const toggleFav = t => { t.fav = !t.fav; favSave(t); };
const savePL = () => SS('dp_pl', PL);
/* API partagée avec more.js / final.js */
window.DP = { PL: () => PL, save: () => savePL(), Q: () => Q, GQ: () => [], toast, sync: () => { syncChips(); homeQueue(); } };

/* ---------- Menu en feuille ---------- */
function sheet(title, items) {
  const o = document.createElement('div');
  o.className = 'sheet';
  o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
  o.innerHTML = '<div class="sh"><h4></h4></div>';
  o.querySelector('h4').textContent = title;
  items.forEach(([label, fn, danger]) => {
    const b = document.createElement('button');
    b.textContent = label; if (danger) b.className = 'd';
    b.onclick = () => { o.remove(); fn(); };
    o.firstChild.appendChild(b);
  });
  o.onclick = e => { if (e.target === o) o.remove(); };
  o.addEventListener('keydown', e => { if (e.key === 'Escape') o.remove(); });
  document.body.appendChild(o);
  const f = o.querySelector('button'); if (f) f.focus();
}
const newPl = t => {
  const n = (prompt('Nom de la playlist') || '').trim();
  if (!n) return;
  PL[n] = PL[n] || [];
  if (t && !PL[n].includes(t.id)) PL[n].push(t.id);
  savePL(); fillView(t ? undefined : 'pl:' + n); renderList();
  if (t) toast('Ajouté à ' + n);
};
const addTo = t => sheet('Ajouter à…', [
  ...Object.keys(PL).map(n => [n, () => { if (!PL[n].includes(t.id)) PL[n].push(t.id); savePL(); toast('Ajouté à ' + n); }]),
  ['+ Nouvelle playlist', () => newPl(t)]
]);
const mv = (pn, t, d) => {
  const a = PL[pn], k = a.indexOf(t.id), j = k + d;
  if (k < 0 || j < 0 || j >= a.length) return;
  [a[k], a[j]] = [a[j], a[k]]; savePL(); renderList();
};
const share = t => {
  if (navigator.share) navigator.share({ text: t.name }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(t.name).then(() => toast('Copié'));
  else toast(t.name);
};
function menu(t, i) {
  const v = $('#vsel').value, pn = v.startsWith('pl:') ? v.slice(3) : null, n = (H[t.id] || {}).n || 0;
  const it = [
    ['Lire ensuite', () => { Q.unshift(t.id); toast('Lu ensuite'); homeQueue(); }],
    ['Ajouter à la file', () => { Q.push(t.id); toast('Dans la file (' + Q.length + ')'); homeQueue(); }],
    ['Ajouter à une playlist…', () => addTo(t)],
    ['Partager / copier', () => share(t)]
  ];
  if (pn) it.push(['Monter dans la playlist', () => mv(pn, t, -1)], ['Descendre dans la playlist', () => mv(pn, t, 1)],
    ['Retirer de la playlist', () => { PL[pn] = PL[pn].filter(x => x !== t.id); savePL(); renderList(); }, 1]);
  it.push(['Supprimer de la bibliothèque', () => removeTrack(i), 1]);
  sheet(t.name + (n ? ' · ' + n + ' lecture' + (n > 1 ? 's' : '') : ''), it);
}

/* ---------- Barre bibliothèque : vues, tri, playlists, filtres rapides ---------- */
const BASE_VIEWS = [['all', 'Toute la bibliothèque'], ['rec', 'Récemment jouées'], ['new', 'Ajoutées récemment'], ['top', 'Les plus écoutées'],
  ['never', 'Jamais écoutées'], ['albums', 'Albums'], ['artists', 'Artistes'], ['queue', "File d'attente"]];
function fillView(sel) {
  const s = $('#vsel'), v = sel || s.value || 'all';
  s.innerHTML = '';
  [...BASE_VIEWS, ...Object.keys(PL).map(n => ['pl:' + n, 'Playlist : ' + n])].forEach(([val, txt]) => s.add(new Option(txt, val)));
  s.value = [...s.options].some(o => o.value === v) ? v : 'all';
  viewButtons();
}
const viewButtons = () => { $('#plren').style.display = $('#pldel').style.display = $('#vsel').value.startsWith('pl:') ? '' : 'none'; };
const favOn = () => $('#favf').classList.contains('on');
const setFav = on => { $('#favf').classList.toggle('on', on); $('#favf').setAttribute('aria-pressed', on); };
const chips = [...document.querySelectorAll('#chips .chip')];
const syncChips = () => {
  const v = $('#vsel').value, fo = favOn();
  chips.forEach(c => {
    const k = c.dataset.v, on = k === 'fav' ? fo : k === 'all' ? v === 'all' && !fo : v === k;
    c.classList.toggle('on', on); c.setAttribute('aria-pressed', on);
  });
};
chips.forEach(c => c.onclick = () => {
  const k = c.dataset.v;
  if (k === 'fav') setFav(!favOn());
  else { $('#vsel').value = k; setFav(false); viewButtons(); }
  renderList();
});
$('#vsel').addEventListener('change', () => { viewButtons(); renderList(); });
$('#ssel').addEventListener('change', () => renderList());
$('#q').addEventListener('input', () => renderList());
$('#favf').onclick = () => { setFav(!favOn()); renderList(); };
$('#plnew').onclick = () => newPl();
$('#plren').onclick = () => {
  const o = $('#vsel').value.slice(3), n = (prompt('Nouveau nom', o) || '').trim();
  if (!n || n === o || PL[n]) return;
  PL[n] = PL[o]; delete PL[o]; savePL(); fillView('pl:' + n); renderList();
};
$('#pldel').onclick = () => {
  const o = $('#vsel').value.slice(3);
  if (!confirm('Supprimer la playlist « ' + o + ' » ?')) return;
  delete PL[o]; savePL(); fillView('all'); renderList();
};
$('#qclr').onclick = () => { Q = []; toast("File d'attente vidée"); renderList(); };

/* ---------- Liste (remplace celle de script.js) ---------- */
const fz = (s, q) => { if (s.includes(q)) return true; let j = 0; for (const ch of s) if (ch === q[j] && ++j === q.length) return true; return !q.length; };
const EQ = '<i class="eq" aria-hidden="true"><b></b><b></b><b></b></i>';
renderList = () => {
  const l = $('#list'), q = ($('#q').value || '').toLowerCase().trim(), fo = favOn();
  const v = $('#vsel').value, s = $('#ssel').value;
  if (v === 'queue') return queueRows(l);
  let rows = tracks.map((t, i) => [t, i]);
  if (v === 'rec') rows = rows.filter(r => H[r[0].id]).sort((a, b) => H[b[0].id].t - H[a[0].id].t);
  else if (v === 'new') rows.sort((a, b) => b[0].added - a[0].added);
  else if (v.startsWith('pl:')) rows = (PL[v.slice(3)] || []).map(id => rows.find(r => r[0].id === id)).filter(Boolean);
  else if (s === 'title') rows.sort((a, b) => a[0].title.localeCompare(b[0].title));
  else if (s === 'artist') rows.sort((a, b) => (a[0].artist || '').localeCompare(b[0].artist || ''));
  if (fo) rows = rows.filter(r => r[0].fav);
  if (q) rows = rows.filter(r => fz(r[0].name.toLowerCase(), q));
  if (!rows.length) {
    l.innerHTML = q ? emptyBox('Aucun résultat dans ce couloir…') : fo ? emptyBox('Aucun favori pour le moment.')
      : tracks.length ? emptyBox('Rien ici pour le moment.') : emptyBox('La bibliothèque est vide. Dépose des mp3 plus haut pour commencer.');
    return;
  }
  l.innerHTML = '';
  rows.forEach(([t, i]) => {
    const d = document.createElement('div');
    d.className = 'track' + (i === idx ? ' cur' : '');
    d.innerHTML = `<span class="n">${i === idx ? EQ : String(i + 1).padStart(2, '0')}</span><span class="t"></span>` +
      `<span class="h${t.fav ? ' on' : ''}" role="button" tabindex="0" aria-label="Favori" aria-pressed="${!!t.fav}">${icon(t.fav ? 'heart' : 'heartO')}</span>` +
      `<span class="m" role="button" tabindex="0" aria-label="Options">${icon('dots')}</span>`;
    d.querySelector('.t').textContent = t.name;
    d.onclick = () => load(i, true);
    d.querySelector('.h').onclick = e => { e.stopPropagation(); toggleFav(t); renderList(); };
    d.querySelector('.m').onclick = e => { e.stopPropagation(); menu(t, i); };
    l.appendChild(d);
  });
};
/* vue « File d'attente » (réordonnable) */
function queueRows(l) {
  l.classList.remove('gridv'); l.innerHTML = '';
  if (!Q.length) { l.innerHTML = emptyBox('File vide : utilise ⋯ › « Ajouter à la file ».'); return; }
  Q.forEach((id, k) => {
    const t = tracks.find(x => x.id === id);
    if (!t) return;
    const d = document.createElement('div');
    d.className = 'track';
    d.innerHTML = `<span class="n"></span><span class="t"></span>` +
      ['up', 'down', 'close'].map(n => `<span class="m" role="button" tabindex="0" aria-label="${{ up: 'Monter', down: 'Descendre', close: 'Retirer' }[n]}">${icon(n)}</span>`).join('');
    d.children[0].textContent = String(k + 1).padStart(2, '0');
    d.children[1].textContent = t.name;
    const move = j => { if (j < 0 || j >= Q.length) return; [Q[k], Q[j]] = [Q[j], Q[k]]; renderList(); };
    d.children[2].onclick = () => move(k - 1);
    d.children[3].onclick = () => move(k + 1);
    d.children[4].onclick = () => { Q.splice(k, 1); renderList(); };
    l.appendChild(d);
  });
}

/* ---------- Accueil : à suivre (file d'attente + suite de la liste) ---------- */
function homeQueue() {
  const box = $('#homeq');
  if (!box) return;
  if (!tracks.length) {
    box.innerHTML = emptyBox('Aucun morceau pour le moment. Importe tes mp3 dans la bibliothèque.', '<button class="btn" data-go="lib" data-ic="down2">Importer</button>');
    box.querySelector('[data-go]').insertAdjacentHTML('afterbegin', icon('down2'));
    box.querySelector('[data-go]').onclick = () => go('lib');
    return;
  }
  const items = [], seen = new Set();
  const add = (t, tag) => { if (t && !seen.has(t.id) && t !== tracks[idx]) { seen.add(t.id); items.push([t, tag]); } };
  window.DP.GQ().forEach(id => add(tracks.find(x => x.id === id), ''));
  Q.forEach(id => add(tracks.find(x => x.id === id), 'FILE'));
  if (!shuffle && idx >= 0) {
    for (let j = idx + 1; j < tracks.length && items.length < 40; j++) add(tracks[j], '');
    if (repeat === 1) for (let j = 0; j < idx && items.length < 40; j++) add(tracks[j], '');
  }
  box.innerHTML = '';
  if (shuffle) {
    const n = document.createElement('p'); n.className = 'hint'; n.style.padding = '8px 10px 0';
    n.textContent = 'Mode aléatoire : la suite est tirée au sort.'; box.appendChild(n);
  }
  if (!items.length) { if (!shuffle) box.innerHTML = emptyBox("Rien à suivre : c'est la fin de la liste."); return; }
  items.forEach(([t, tag], k) => {
    const i = tracks.indexOf(t), d = document.createElement('div');
    d.className = 'track';
    d.innerHTML = '<span class="n"></span><span class="t"></span>' + (tag ? `<span class="tag">${tag}</span>` : '');
    d.children[0].textContent = String(k + 1).padStart(2, '0');
    d.children[1].textContent = t.name;
    d.onclick = () => { const qi = Q.indexOf(t.id); if (qi >= 0) Q.splice(qi, 1); load(i, true); };
    box.appendChild(d);
  });
}

/* ---------- File d'attente, historique, notifications ---------- */
const _n = next;
next = a => {
  while (Q.length) { const i = tracks.findIndex(x => x.id === Q.shift()); if (i >= 0) return load(i, true); }
  _n(a);
};
const _ld = load;
load = (i, a) => {
  _ld(i, a);
  const t = tracks[i];
  if (a) {
    H[t.id] = { n: ((H[t.id] || {}).n || 0) + 1, t: Date.now() }; SS('dp_hist', H);
    if ($('#vsel').value === 'rec') renderList();
    if (CF.notif && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(t.title, { body: t.artist || '', icon: t.cover || 'icon-192.png', silent: true }); } catch {}
    }
  }
};

/* ---------- Erreurs propres ---------- */
play = () => {
  initAudioCtx();
  audio.play().catch(e => {
    if (e.name === 'AbortError') return;
    if (e.name === 'NotAllowedError') toast('Touche lecture pour lancer la musique');
    else toast('Lecture impossible', true);
  });
};
let fails = 0;
audio.addEventListener('playing', () => { fails = 0; });
audio.addEventListener('error', () => {
  if (!audio.getAttribute('src')) return;
  toast('Fichier illisible ou format non supporté', true);
  if (tracks.length > 1 && ++fails < 3) setTimeout(() => next(true), 900);
});
const _af = addFiles;
addFiles = fs => {
  const bad = [...fs].filter(f => !f.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name));
  if (bad.length) toast(bad.length + ' fichier(s) ignoré(s) : format non supporté', true);
  return _af(fs);
};

/* ---------- Volume, muet, clavier ---------- */
const vol = d => { const v = $('#vol'); v.value = Math.min(1, Math.max(0, +v.value + d)); v.dispatchEvent(new Event('input')); };
let pv = null;
const mute = () => {
  const v = $('#vol');
  if (pv === null) { pv = v.value; v.value = 0; } else { v.value = pv; pv = null; }
  v.dispatchEvent(new Event('input')); toast(pv === null ? 'Son activé' : 'Muet');
};
$('#mute').onclick = mute;
$('.screen').addEventListener('wheel', e => { e.preventDefault(); vol(-Math.sign(e.deltaY) * .05); }, { passive: false });
document.addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'n') next(false); else if (k === 'p') prev(); else if (k === 'm') mute();
  else if (k === 's') $('#shuffle').click(); else if (k === 'r') $('#repeat').click();
  else if (k === 'arrowup') { e.preventDefault(); vol(.05); } else if (k === 'arrowdown') { e.preventDefault(); vol(-.05); }
  else if (k === 'f' && tracks[idx]) { toggleFav(tracks[idx]); renderList(); toast(tracks[idx].fav ? 'Favori ajouté' : 'Retiré des favoris'); }
});
$('#cover').addEventListener('dblclick', () => toast("~ le temps s'est arrêté ici ~"));

/* ---------- Réglages d'affichage ---------- */
const MODES = ['vhs', 'mono', 'lim', 'y2k'];
const applyCF = () => {
  SS('dp_set', CF);
  MODES.forEach(m => document.body.classList.toggle('m-' + m, CF.mode === m));
  document.body.classList.toggle('noanim', !CF.anim);
  root.setProperty('--fi', CF.fi);
  CF.acc ? root.setProperty('--accent', CF.acc) : root.removeProperty('--accent');
  $('#fxiv').textContent = Math.round(CF.fi * 100) + '%';
  fp($('#fxi'));
};
$('#mode').value = CF.mode; $('#fxi').value = CF.fi; $('#anim').checked = CF.anim; $('#notif').checked = CF.notif;
if (CF.acc) $('#acc').value = CF.acc;
$('#mode').onchange = e => { CF.mode = e.target.value; applyCF(); };
$('#fxi').oninput = e => { CF.fi = +e.target.value; applyCF(); };
$('#anim').onchange = e => { CF.anim = e.target.checked; applyCF(); };
$('#acc').oninput = e => { CF.acc = e.target.value; applyCF(); };
$('#accr').onclick = () => { CF.acc = ''; applyCF(); };
$('#notif').onchange = async e => {
  if (!e.target.checked) { CF.notif = false; return applyCF(); }
  const p = 'Notification' in window ? await Notification.requestPermission() : 'denied';
  CF.notif = p === 'granted'; e.target.checked = CF.notif;
  if (!CF.notif) toast('Notifications non autorisées sur ce navigateur', true);
  applyCF();
};
$('#fs').onclick = () => {
  const e = document.documentElement, f = e.requestFullscreen || e.webkitRequestFullscreen;
  f ? f.call(e) : toast("Plein écran indisponible ici (ajoute l'appli à l'écran d'accueil)", true);
};

/* ---------- Export / import / effacement ---------- */
const KEYS = ['dp_fx', 'dp_theme', 'dp_vm', 'dp_vol', 'dp_pl', 'dp_hist', 'dp_set', 'dp_set2', 'dp_pol', 'dp_grid', 'dp_scan', 'dp_sv', 'dp_pxcov'];
$('#dexp').onclick = () => {
  const o = { v: 1, ls: {}, favs: tracks.filter(t => t.fav).map(t => t.id) };
  KEYS.forEach(k => { const x = localStorage.getItem(k); if (x !== null) o.ls[k] = x; });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' }));
  a.download = 'dream-player-donnees.json'; a.click();
  toast('Export prêt');
};
$('#dimp').onclick = () => $('#dfile').click();
$('#dfile').onchange = async e => {
  try {
    const o = JSON.parse(await e.target.files[0].text());
    Object.entries(o.ls || {}).forEach(([k, v]) => KEYS.includes(k) && localStorage.setItem(k, v));
    (o.favs || []).forEach(id => { const t = tracks.find(x => x.id === id); if (t) { t.fav = true; favSave(t); } });
    toast('Données importées'); setTimeout(() => location.reload(), 900);
  } catch { toast('Fichier invalide', true); }
  e.target.value = '';
};
$('#dclr').onclick = async () => {
  if (!confirm('Effacer tous tes morceaux, playlists et réglages sur cet appareil ?')) return;
  try {
    const d = await R;
    await new Promise(ok => { const q = d.transaction('t', 'readwrite').objectStore('t').clear(); q.onsuccess = q.onerror = ok; });
  } catch {}
  localStorage.clear(); location.reload();
};

/* ---------- Démarrage ---------- */
fillView('all'); applyCF();
})();
