/* polish.js — dream.player : finitions (après settings.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const P = Object.assign({ spin: false, tilt: true }, LS('dp_pol', {}));

/* ---------- Pochette : CD qui tourne / effet 3D ---------- */
const ap = () => { SS('dp_pol', P); document.body.classList.toggle('spin', P.spin); };
$('#spin').checked = P.spin; $('#tilt').checked = P.tilt;
$('#spin').onchange = e => { P.spin = e.target.checked; ap(); };
$('#tilt').onchange = e => { P.tilt = e.target.checked; ap(); };
ap();

const fr = $('#coverFrame');
fr.addEventListener('pointermove', e => {
  if (!P.tilt || P.spin || e.pointerType !== 'mouse') return;
  const rc = fr.getBoundingClientRect();
  const dx = (e.clientX - rc.left) / rc.width - .5;
  const dy = (e.clientY - rc.top) / rc.height - .5;
  fr.style.transition = 'transform .1s';
  fr.style.transform = 'perspective(600px) rotateY(' + (dx * 16) + 'deg) rotateX(' + (-dy * 16) + 'deg) scale(1.03)';
});
fr.addEventListener('pointerleave', () => { fr.style.transform = ''; fr.style.transition = ''; });

/* ---------- Animation du cœur ---------- */
$('#list').addEventListener('click', e => {
  const h = e.target.closest('.h');
  if (!h) return;
  const name = h.parentNode.querySelector('.t').textContent;
  setTimeout(() => document.querySelectorAll('#list .track').forEach(r => {
    if (r.querySelector('.t').textContent === name && r.querySelector('.h')) r.querySelector('.h').classList.add('pop');
  }), 0);
}, true);

/* ---------- Dernière page et dernière vue de la bibliothèque (après chargement de la bibliothèque) ---------- */
document.querySelectorAll('.navb').forEach(b => b.addEventListener('click', () => SS('dp_tab', b.dataset.view)));
const sv = $('#vsel');
sv.addEventListener('change', () => SS('dp_view', sv.value));
document.addEventListener('dp:ready', () => {
  const lv = LS('dp_view', 'all');
  if (lv !== 'all' && [...sv.options].some(o => o.value === lv)) { sv.value = lv; sv.dispatchEvent(new Event('change')); }
  const lt = LS('dp_tab', 'home');
  if (typeof lt === 'string' && VIEWS.includes(lt)) go(lt);
});
})();
