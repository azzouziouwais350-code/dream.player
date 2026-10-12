/* premium.js — dream.player : pochette, couleur dominante, mini-lecteur, sauvegarde de session (après spotify.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const root = document.documentElement.style;
const PH = 'art/cover.svg';                 // pochette par défaut (pixel art)

/* ---------- Couleur dominante de la pochette → lueur de la pochette + fond flou ---------- */
const dom = src => new Promise(ok => {
  const i = new Image();
  i.onload = () => {
    const k = document.createElement('canvas'); k.width = k.height = 8;
    const x = k.getContext('2d'); x.drawImage(i, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let p = 0; p < d.length; p += 4) {
      const m = Math.max(d[p], d[p + 1], d[p + 2]), s = m - Math.min(d[p], d[p + 1], d[p + 2]);
      if (m > 60 && s > 25) { r += d[p]; g += d[p + 1]; b += d[p + 2]; n++; }
    }
    if (!n) return ok(null);
    r /= n; g /= n; b /= n;
    const f = Math.max(1, 170 / Math.max(r, g, b));
    ok([r, g, b].map(v => Math.min(255, v * f | 0)));
  };
  i.onerror = () => ok(null);
  i.src = src;
});
function tint(src) {
  const bg = $('#bgb');
  if (!src) { root.removeProperty('--cov'); bg.classList.remove('on'); return; }
  bg.style.backgroundImage = `url(${src})`; bg.classList.add('on');
  dom(src).then(rgb => rgb ? root.setProperty('--cov', `rgb(${rgb})`) : root.removeProperty('--cov'));
}

/* ---------- Pochette + mini-lecteur ---------- */
/* option « Pochettes pixel » : la pochette est réduite à 56×56 puis agrandie sans lissage */
const pixelate = src => new Promise(ok => {
  const i = new Image();
  i.onload = () => {
    const k = document.createElement('canvas'); k.width = k.height = 56;
    const x = k.getContext('2d'); x.imageSmoothingQuality = 'high';
    const s = Math.min(i.width, i.height);
    x.drawImage(i, (i.width - s) / 2, (i.height - s) / 2, s, s, 0, 0, 56, 56);
    try { ok(k.toDataURL('image/png')); } catch { ok(src); }
  };
  i.onerror = () => ok(src);
  i.src = src;
});
window.DPcover = { pixel: LS('dp_pxcov', true) };
function showTrack(t) {
  const im = $('#cover'), raw = t && t.cover ? t.cover : PH;
  if (t && t.cover && window.DPcover.pixel) {
    pixelate(raw).then(u => { if (tracks[idx] === t) { im.src = u; im.classList.add('px'); $('#miniCover').src = u; } });
  }
  const src = raw;
  im.classList.toggle('px', !!(t && t.cover && window.DPcover.pixel));
  if (im.getAttribute('src') !== src) {
    im.src = src;
    im.classList.remove('swap'); void im.offsetWidth; im.classList.add('swap');
  }
  $('#miniCover').src = src;
  $('#miniTitle').textContent = t ? (t.title || t.name) : '—';
  $('#miniArtist').textContent = t ? (t.artist || 'dream.player') : '';
  document.body.classList.toggle('has-track', !!t);
  tint(t && t.cover);
}
const _l = load;
load = (i, a) => { _l(i, a); showTrack(tracks[i]); };
audio.addEventListener('emptied', () => { if (idx === -1) showTrack(null); });
audio.addEventListener('timeupdate', () => {
  $('#miniFill').style.width = audio.duration ? (audio.currentTime / audio.duration * 100) + '%' : '0';
});

/* ---------- Curseurs avec remplissage ---------- */
const fill = e => e.style.setProperty('--p', ((e.value - e.min) / (e.max - e.min) * 100) + '%');
['#seek', '#vol'].forEach(s => { const e = $(s); e.addEventListener('input', () => fill(e)); fill(e); });
audio.addEventListener('timeupdate', () => fill($('#seek')));

/* ---------- Glisser pour changer de piste (mobile) ---------- */
let sx = null;
const sc = $('.screen');
sc.addEventListener('touchstart', e => { sx = e.target.closest('input') ? null : e.touches[0].clientX; }, { passive: true });
sc.addEventListener('touchend', e => {
  if (sx === null) return;
  const dx = e.changedTouches[0].clientX - sx; sx = null;
  if (Math.abs(dx) > 60) dx < 0 ? next(false) : prev();
});

/* ---------- Sauvegarde : volume, morceau, position ---------- */
let lt = 0;
audio.addEventListener('timeupdate', () => {
  if (Date.now() - lt > 4000 && tracks[idx]) { lt = Date.now(); SS('dp_last', { id: tracks[idx].id, pos: audio.currentTime }); }
});
$('#vol').addEventListener('input', e => SS('dp_vol', +e.target.value));
const v0 = LS('dp_vol', null);
if (v0 !== null) { $('#vol').value = v0; audio.volume = v0; fill($('#vol')); syncVol(); }
document.addEventListener('dp:ready', () => {
  const L = LS('dp_last', null);
  if (!L || !L.id) return;
  const i = tracks.findIndex(x => x.id === L.id);
  if (i < 0) return;
  load(i, false);
  audio.addEventListener('loadedmetadata', () => { audio.currentTime = L.pos || 0; }, { once: true });
});
$('#pxcov').checked = window.DPcover.pixel;
$('#pxcov').onchange = e => { window.DPcover.pixel = e.target.checked; SS('dp_pxcov', e.target.checked); if (tracks[idx]) { $('#cover').removeAttribute('src'); showTrack(tracks[idx]); } };
showTrack(null);
})();
