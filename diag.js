/* diag.js — dream.player : diagnostic (à charger EN PREMIER, avant script.js) */
(() => {
const errs = [];
let last = 0;
const note = m => {
  errs.push(new Date().toLocaleTimeString() + ' ' + m);
  if (errs.length > 30) errs.shift();
  if (Date.now() - last < 3000) return;
  last = Date.now();
  const d = document.createElement('div');
  d.className = 'err-toast'; d.setAttribute('role', 'alert');
  d.textContent = 'ERREUR · ' + m;
  (document.body || document.documentElement).appendChild(d);
  setTimeout(() => d.remove(), 5000);
};
addEventListener('error', e => note('Erreur : ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'));
addEventListener('unhandledrejection', e => note('Promesse : ' + ((e.reason && e.reason.message) || e.reason)));

function show(txt) {
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(8,7,16,.8);display:grid;place-items:center;padding:16px';
  o.innerHTML = '<div style="background:#171322;color:#F2DDFB;box-shadow:0 0 0 3px #6a52b8;padding:16px;max-width:560px;width:100%;max-height:80vh;overflow:auto;font:13px/1.5 monospace"><pre style="white-space:pre-wrap;word-break:break-word;margin:0 0 12px"></pre><button id="dgc" style="padding:12px 16px;border:0;background:#FF6EC7;color:#080710;font:600 13px Poppins,sans-serif;min-height:44px">COPIER</button> <button id="dgx" style="padding:12px 16px;border:0;background:#2e2450;color:#F2DDFB;font:600 13px Poppins,sans-serif;min-height:44px">FERMER</button></div>';
  o.querySelector('pre').textContent = txt;
  o.querySelector('#dgx').onclick = () => o.remove();
  o.querySelector('#dgc').onclick = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { o.querySelector('#dgc').textContent = 'COPIÉ ✓'; });
  };
  document.body.appendChild(o);
}

async function report() {
  const mods = { 'script.js': '#play', 'features.js': '#tabfx', 'spotify.js': '#spx', 'premium.js': '#bgb',
    'extras.js': '#vsel', 'more.js': '#gridb', 'final.js': '#clk', 'settings.js': '#zm', 'polish.js': '#spin' };
  const L = Object.entries(mods).map(([f, s]) => (document.querySelector(s) ? 'OK     ' : 'MANQUE ') + f);
  let sw = 'non supporté', ck = 'non supporté';
  try { if (navigator.serviceWorker) sw = (await navigator.serviceWorker.getRegistrations()).length; } catch {}
  try { if (window.caches) ck = (await caches.keys()).join(', ') || 'aucun'; } catch {}
  L.push('', 'Service worker : ' + sw, 'Caches : ' + ck,
    'IndexedDB : ' + (window.indexedDB ? 'oui' : 'non'),
    'Web Audio : ' + (window.AudioContext || window.webkitAudioContext ? 'oui' : 'non'),
    'Morceaux : ' + (typeof tracks !== 'undefined' ? tracks.length : '?'),
    'Page : ' + location.href, 'Navigateur : ' + navigator.userAgent, '',
    'Erreurs (' + errs.length + ') :', ...(errs.length ? errs : ['aucune']));
  show(L.join('\n'));
}

addEventListener('load', () => { const b = document.getElementById('dg'); if (b) b.onclick = report; });
})();
