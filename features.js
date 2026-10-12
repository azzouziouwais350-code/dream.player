/* features.js — dream.player : stockage (IndexedDB), tags ID3, effets audio, thèmes, minuteur (après script.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ---------- Base de données (IndexedDB) ---------- */
const DB = new Promise((ok, ko) => {
  if (!window.indexedDB) return ko(new Error('IndexedDB indisponible'));
  const r = indexedDB.open('dreamplayer', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('t', { keyPath: 'id' });
  r.onsuccess = () => ok(r.result);
  r.onerror = () => ko(r.error);
});
const db = (m, f) => DB.then(d => new Promise((ok, ko) => {
  const q = f(d.transaction('t', m).objectStore('t'));
  q.onsuccess = () => ok(q.result);
  q.onerror = () => ko(q.error);
}));
const put = t => db('readwrite', s => s.put({ id: t.id, file: t.blob, fb: t.fb, fav: !!t.fav, added: t.added })).catch(e => console.warn('Stockage :', e));

/* ---------- Tags ID3 (titre, artiste, pochette) ---------- */
async function id3(f) {
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
      if (id === 'TIT2') o.title = dec(d);
      else if (id === 'TPE1') o.artist = dec(d);
      else if (id === 'APIC' && !o.cover) {
        let i = 1; while (d[i]) i++; i += 2;
        if (d[0] === 1 || d[0] === 2) { while (i < d.length && (d[i] || d[i + 1])) i += 2; i += 2; }
        else { while (d[i]) i++; i++; }
        if (i < d.length) o.cover = URL.createObjectURL(new Blob([d.slice(i)], { type: 'image/jpeg' }));
      }
      p += 10 + fs;
    }
    return o;
  } catch { return {}; }
}
async function mk(blob, o) {
  const m = await id3(blob), title = m.title || o.fb, artist = m.artist || '';
  return { id: o.id, blob, fb: o.fb, title, artist, name: artist ? artist + ' – ' + title : title,
           url: URL.createObjectURL(blob), cover: m.cover, fav: o.fav, added: o.added };
}

/* ---------- Import (remplace celui de script.js) ---------- */
addFiles = async files => {
  for (const f of [...files]) {
    if (!f.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name)) continue;
    const t = await mk(f, { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), fb: clean(f.name), fav: false, added: Date.now() });
    tracks.push(t); put(t);
  }
  renderList();
  if (idx === -1 && tracks.length) load(0, false);
};

/* ---------- Contrôles système (pochette) + suppression en base ---------- */
const _load = load;
load = (i, a) => {
  _load(i, a);
  const t = tracks[i];
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title, artist: t.artist || 'dream.player', artwork: t.cover ? [{ src: t.cover }] : []
  });
};
const _rm = removeTrack;
removeTrack = i => {
  const t = tracks[i];
  _rm(i);
  if (t && t.id) db('readwrite', s => s.delete(t.id)).catch(() => {});
};

/* ---------- Effets audio : vitesse, réverb, égaliseur ---------- */
const S = Object.assign({ sp: 1, rv: 0, lo: 0, mi: 0, hi: 0, kp: false }, LS('dp_fx', {}));
const P = [
  { sp: 1, rv: 0, lo: 0, mi: 0, hi: 0 },
  { sp: .85, rv: .55, lo: 3, mi: 0, hi: -3 },
  { sp: 1.25, rv: .1, lo: 0, mi: 0, hi: 2 },
  { sp: 1, rv: 0, lo: 8, mi: 0, hi: -2 },
  { sp: 1, rv: .1, lo: -3, mi: 4, hi: 2 }
];
const fx = {};
const impulse = ctx => {
  const n = ctx.sampleRate * 2.8 | 0, b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) { const d = b.getChannelData(k); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
  return b;
};
function apply() {
  SS('dp_fx', S);
  audio.defaultPlaybackRate = audio.playbackRate = S.sp;
  audio.preservesPitch = audio.webkitPreservesPitch = audio.mozPreservesPitch = S.kp;
  if (!fx.low) return;
  fx.low.gain.value = S.lo; fx.mid.gain.value = S.mi; fx.high.gain.value = S.hi;
  fx.dry.gain.value = 1 - S.rv * .4; fx.wet.gain.value = S.rv * 1.4;
}
initAudioCtx = () => {
  if (started) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaElementSource(audio);
    const f = (type, hz) => { const b = actx.createBiquadFilter(); b.type = type; b.frequency.value = hz; return b; };
    fx.low = f('lowshelf', 120); fx.mid = f('peaking', 1000); fx.high = f('highshelf', 6000);
    fx.dry = actx.createGain(); fx.wet = actx.createGain();
    fx.conv = actx.createConvolver(); fx.conv.buffer = impulse(actx);
    fx.master = actx.createGain(); fx.master.gain.value = +$('#vol').value;
    analyser = actx.createAnalyser(); analyser.fftSize = 128; analyser.smoothingTimeConstant = .75;
    data = new Uint8Array(analyser.frequencyBinCount);
    src.connect(fx.low); fx.low.connect(fx.mid); fx.mid.connect(fx.high);
    fx.high.connect(fx.dry); fx.high.connect(fx.conv); fx.conv.connect(fx.wet);
    fx.dry.connect(fx.master); fx.wet.connect(fx.master);
    fx.master.connect(analyser); analyser.connect(actx.destination);
    started = true; audio.volume = 1; apply();
  } catch (e) { console.warn(e); }
};
/* volume via Web Audio (le volume natif ne marche pas sur iPad) */
$('#vol').addEventListener('input', e => { audio.volume = 1; if (fx.master) fx.master.gain.value = +e.target.value; });
window.DPfx = fx;   // lu par settings.js (fondu) et le minuteur

/* ---------- Thèmes (variables CSS dans dream.css : html[data-theme]) ---------- */
const themeBtns = document.querySelectorAll('[data-t]');
const theme = n => {
  if (!['dream', 'vapor', 'ember', 'matrix'].includes(n)) n = 'dream';
  document.documentElement.dataset.theme = n;
  themeBtns.forEach(b => { b.classList.toggle('on', b.dataset.t === n); b.setAttribute('aria-pressed', b.dataset.t === n); });
  SS('dp_theme', n);
};

/* ---------- Réglages audio / affichage (le HTML est dans index.html) ---------- */
const ids = ['sp', 'rv', 'lo', 'mi', 'hi'];
const fillp = e => e.style.setProperty('--p', ((e.value - e.min) / (e.max - e.min) * 100) + '%');
const presetBtns = document.querySelectorAll('[data-p]');
const sync = () => {
  ids.forEach(k => {
    $('#' + k).value = S[k];
    $('#' + k + 'v').textContent = k === 'sp' ? S[k].toFixed(2) + 'x' : k === 'rv' ? Math.round(S[k] * 100) + '%' : S[k] + 'dB';
    fillp($('#' + k));
  });
  $('#kp').checked = S.kp;
  presetBtns.forEach((b, i) => { const on = ids.every(k => Math.abs(S[k] - P[i][k]) < .005); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
};
ids.forEach(k => $('#' + k).oninput = e => { S[k] = +e.target.value; sync(); apply(); });
$('#kp').onchange = e => { S.kp = e.target.checked; apply(); };
presetBtns.forEach(b => b.onclick = () => { Object.assign(S, P[b.dataset.p]); sync(); apply(); });
themeBtns.forEach(b => b.onclick = () => theme(b.dataset.t));
$('#scan').checked = LS('dp_scan', true);
document.body.classList.toggle('noscan', !$('#scan').checked);
$('#scan').onchange = e => { SS('dp_scan', e.target.checked); document.body.classList.toggle('noscan', !e.target.checked); };

/* ---------- Minuteur de sommeil ---------- */
let tm;
const sleepBtns = document.querySelectorAll('[data-s]');
const sleep = m => {
  clearTimeout(tm);
  $('#slst').textContent = m ? 'Minuteur : ' + m + ' min' : 'Minuteur : off';
  sleepBtns.forEach(b => { const on = +b.dataset.s === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  if (!m) return;
  tm = setTimeout(() => {
    const g = fx.master;
    if (g) { g.gain.setValueAtTime(g.gain.value, actx.currentTime); g.gain.linearRampToValueAtTime(0, actx.currentTime + 6); }
    setTimeout(() => {
      audio.pause(); if (g) g.gain.value = +$('#vol').value;
      $('#slst').textContent = 'Minuteur : off';
      sleepBtns.forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', false); });
    }, 6200);
  }, m * 60000);
};
sleepBtns.forEach(b => b.onclick = () => sleep(+b.dataset.s));

/* ---------- Démarrage : réglages puis bibliothèque (après chargement de tous les scripts) ---------- */
theme(LS('dp_theme', 'dream'));
sync(); apply();
$('#list').innerHTML = loadingBox('chargement de la bibliothèque');
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const recs = await db('readonly', s => s.getAll());
    recs.sort((a, b) => a.added - b.added);
    for (const r of recs) tracks.push(await mk(r.file, { id: r.id, fb: r.fb, fav: r.fav, added: r.added }));
    renderList();
    if (idx === -1 && tracks.length) load(0, false);
  } catch (e) { console.warn(e); renderList(); }
  document.dispatchEvent(new Event('dp:ready'));     // les autres modules restaurent leur état ici
});
})();
