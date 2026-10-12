/* settings.js — dream.player : visualiseur pixel, fondu, confort, démarrage (après final.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const root = document.documentElement.style;
const ST = Object.assign({ zm: 1, vs: 0, sens: 1, bass: true, fade: 0, sh: false, rp: 0 }, LS('dp_set2', {}));
const fp = e => e.style.setProperty('--p', ((e.value - e.min) / (e.max - e.min) * 100) + '%');

/* ---------- Réglages (le HTML est dans index.html) ---------- */
const ap = () => {
  SS('dp_set2', ST);
  root.setProperty('--zm', ST.zm);
  document.body.classList.toggle('bz', ST.bass);
  $('#zmv').textContent = Math.round(ST.zm * 100) + '%';
  $('#sensv').textContent = ST.sens.toFixed(1) + 'x';
  fp($('#zm')); fp($('#sens'));
};
$('#zm').value = ST.zm; $('#sens').value = ST.sens; $('#vs').value = ST.vs; $('#bass').checked = ST.bass;
$('#fade').value = ST.fade; $('#dsh').checked = ST.sh; $('#drp').value = ST.rp;
$('#zm').oninput = e => { ST.zm = +e.target.value; ap(); };
$('#sens').oninput = e => { ST.sens = +e.target.value; ap(); };
$('#vs').onchange = e => { ST.vs = +e.target.value; ap(); };
$('#bass').onchange = e => { ST.bass = e.target.checked; ap(); };
$('#fade').onchange = e => { ST.fade = +e.target.value; if (fg) fg.gain.value = 1; ap(); };
$('#dsh').onchange = e => { ST.sh = e.target.checked; ap(); };
$('#drp').onchange = e => { ST.rp = +e.target.value; ap(); };
$('#rst').onclick = () => {
  if (!confirm('Remettre tous les réglages à zéro ? (tes morceaux sont conservés)')) return;
  ['dp_fx', 'dp_theme', 'dp_vm', 'dp_set', 'dp_set2', 'dp_scan', 'dp_vol', 'dp_pol', 'dp_sv', 'dp_grid', 'dp_pxcov'].forEach(k => localStorage.removeItem(k));
  location.reload();
};

/* ---------- Visualiseur pixel 128×40 (blocs de 3 px) : barres / miroir / cercle / onde ---------- */
const cv = $('#viz'), c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
const W = 128, H = 40, BARS = 32, ROWS = 10;
const level = new Array(BARS).fill(0), peak = new Array(BARS).fill(0), wv = new Uint8Array(128);
let t = 0, col = ['#00E5FF', '#FF6EC7', '#F2DDFB'];
const readColors = () => {
  const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim();
  col = [g('--cyan') || col[0], g('--accent') || g('--pink') || col[1], g('--moon') || col[2]];
};
readColors(); setInterval(readColors, 800);
const blk = (x, y, k) => { c.fillStyle = col[k]; c.fillRect(Math.round(x), Math.round(y), 3, 3); };
cv.addEventListener('click', () => { ST.vs = (ST.vs + 1) % 4; $('#vs').value = ST.vs; ap(); });

function draw() {
  requestAnimationFrame(draw); t++;
  const live = analyser && !audio.paused;
  c.fillStyle = '#080710'; c.fillRect(0, 0, W, H);
  let bass = 0;
  if (live) { analyser.getByteFrequencyData(data); bass = (data[0] + data[1] + data[2] + data[3]) / 1020; }
  root.setProperty('--bass', Math.min(1, bass * ST.sens).toFixed(3));
  if (ST.vs === 3) {                                  // onde en escalier
    if (live) analyser.getByteTimeDomainData(wv);
    for (let x = 0; x < W; x += 3) {
      const v = live ? (wv[Math.min(127, x)] - 128) / 128 * ST.sens : Math.sin(t / 20 + x / 9) * .1;
      blk(x, Math.round((H / 2 - 1.5 + v * 17) / 3) * 3, 0);
    }
    return;
  }
  for (let i = 0; i < BARS; i++) {
    const tg = live ? Math.min(1, Math.pow(data[i] / 255, 1.4) * 1.5 * ST.sens) : (Math.sin(t / 40 + i / 2.5) + 1) / 16;
    level[i] += (tg - level[i]) * .3;
    peak[i] = Math.max(level[i], peak[i] - .012);
    const h = Math.max(1, Math.round(level[i] * ROWS));
    if (ST.vs === 2) {                                // anneau pixel
      const a = i / BARS * Math.PI * 2 - Math.PI / 2, r0 = 6;
      for (let j = 0; j < Math.max(1, Math.round(level[i] * 5)); j++) {
        const r = r0 + j * 3;
        blk(W / 2 + Math.cos(a) * r * 1.6 - 1.5, H / 2 + Math.sin(a) * r - 1.5, j > 3 ? 2 : j > 1 ? 1 : 0);
      }
    } else if (ST.vs === 1) {                         // miroir
      const m = Math.max(1, Math.round(h / 2));
      for (let j = 0; j < m; j++) { const k = j > 3 ? 2 : j > 1 ? 1 : 0; blk(i * 4, 19 - j * 4 - 1, k); blk(i * 4, 19 + j * 4 + 2, k); }
    } else {                                          // barres d'égaliseur segmentées
      for (let j = 0; j < h; j++) blk(i * 4, H - (j + 1) * 4, j > 7 ? 2 : j > 4 ? 1 : 0);
      const pk = Math.round(peak[i] * ROWS);
      if (pk > h) blk(i * 4, H - (pk + 1) * 4, 2);
    }
  }
}
draw();

/* ---------- Fondu début / fin de morceau ---------- */
let fg = null;
audio.addEventListener('play', () => {
  if (!started || fg) return;
  try { analyser.disconnect(); fg = actx.createGain(); analyser.connect(fg); fg.connect(actx.destination); } catch (e) { console.warn(e); }
});
audio.addEventListener('playing', () => {
  if (!fg || !ST.fade) return;
  fg.gain.cancelScheduledValues(actx.currentTime);
  fg.gain.setValueAtTime(0, actx.currentTime);
  fg.gain.linearRampToValueAtTime(1, actx.currentTime + Math.min(ST.fade, 3));
});
audio.addEventListener('timeupdate', () => {
  if (!fg || !ST.fade || !audio.duration) return;
  const rem = audio.duration - audio.currentTime;
  fg.gain.setTargetAtTime(rem < ST.fade ? Math.max(0, rem / ST.fade) : 1, actx.currentTime, .1);
});

/* ---------- Clavier : lignes et boutons de la liste ---------- */
new MutationObserver(() => document.querySelectorAll('#list .track, #homeq .track').forEach(r => {
  if (!r.hasAttribute('role')) { r.setAttribute('role', 'button'); r.tabIndex = 0; }
})).observe(document.body, { childList: true, subtree: true });
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.track, .track .h, .track .m')) { e.preventDefault(); e.target.click(); }
});

/* ---------- Démarrage ---------- */
ap();
if (ST.sh) $('#shuffle').click();
for (let i = 0; i < ST.rp; i++) $('#repeat').click();
const sv = $('#sv');
sv.value = localStorage.getItem('dp_sv') || 'last';
sv.onchange = () => { try { localStorage.setItem('dp_sv', sv.value); } catch {} };
if (sv.value !== 'last') {
  const vol = $('#vol');
  vol.value = sv.value;
  vol.dispatchEvent(new Event('input'));
}
})();
