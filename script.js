/* script.js — dream.player : cœur de l'appli (état, lecture, navigation, import, Spotify intégré).
   Chargé après icons.js. Les autres scripts s'appuient sur ces fonctions globales
   (load, next, prev, play, renderList, addFiles, removeTrack, go, emptyBox…). */
const $ = s => document.querySelector(s);
const audio = new Audio();
audio.preload = 'metadata';

let tracks = [];            // {id, name, title, artist, url, blob, cover, fav, added…}
let idx = -1;
let shuffle = false;
let repeat = 0;             // 0 off, 1 tout, 2 une piste
let seeking = false;

/* Web Audio : la chaîne d'effets/analyseur est construite par features.js */
let actx, analyser, data, started = false;
function initAudioCtx() { /* défini par features.js */ }

/* ---------- Icônes dynamiques (les autres sont posées par icons.js via data-ic) ---------- */
$('#play').innerHTML = icon('play');
$('#miniPlay').innerHTML = icon('play');

/* ---------- Décor : étoiles pixel ---------- */
(() => {
  const bg = $('.bg');
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('i');
    s.className = 'star' + (i % 7 === 0 ? ' big' : '');
    s.style.left = Math.random() * 100 + 'vw';
    s.style.top = Math.random() * 58 + 'vh';
    s.style.animationDelay = Math.random() * 3 + 's';
    bg.appendChild(s);
  }
})();

/* ---------- Navigation : Accueil · Bibliothèque · Spotify · Paramètres ---------- */
const VIEWS = ['home', 'lib', 'spotify', 'fx'];
function go(view) {
  if (!VIEWS.includes(view)) view = 'home';
  document.querySelectorAll('.navb').forEach(b => {
    const on = b.dataset.view === view;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  document.body.dataset.view = view;
  if (view === 'spotify') audio.pause();
  window.scrollTo(0, 0);
}
document.querySelectorAll('.navb').forEach(b => b.onclick = () => go(b.dataset.view));

/* ---------- Utilitaires ---------- */
const fmt = s => isNaN(s) ? '0:00' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const clean = n => n.replace(/\.[^.]+$/, '').replace(/_+/g, ' ');
/* écran vide « pixel » (msg = texte fixe, jamais une donnée utilisateur) */
const emptyBox = (msg, btn) => `<div class="empty"><img src="art/ghost.svg" alt=""><p>${msg}</p>${btn || ''}</div>`;
const loadingBox = msg => `<div class="loading"><div class="loader" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><span>${msg}</span></div>`;

/* Titre : défile seulement s'il est trop long */
function setTitle(txt) {
  const box = $('#now'), el = $('#nowTitle');
  el.textContent = txt;
  box.classList.remove('scroll');
  el.style.animationDuration = '';
  requestAnimationFrame(() => {
    if (el.scrollWidth > box.clientWidth) {
      el.style.animationDuration = Math.max(8, txt.length * 0.4) + 's';
      box.classList.add('scroll');
    }
  });
}

/* ---------- Import de fichiers (version de base, remplacée par features.js : tags ID3 + stockage) ---------- */
function addFiles(files) {
  [...files].forEach(f => {
    if (!f.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name)) return;
    tracks.push({ name: clean(f.name), title: clean(f.name), artist: '', url: URL.createObjectURL(f) });
  });
  renderList();
  if (idx === -1 && tracks.length) load(0, false);
}
$('#file').onchange = e => { addFiles(e.target.files); e.target.value = ''; };

const drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

/* ---------- Playlist (affichage de base, remplacé par extras.js) ---------- */
function renderList() {
  const l = $('#list');
  if (!tracks.length) { l.innerHTML = emptyBox('Playlist vide…'); return; }
  l.innerHTML = '';
  tracks.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'track' + (i === idx ? ' cur' : '');
    d.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t"></span>`;
    d.querySelector('.t').textContent = t.name;
    d.onclick = () => load(i, true);
    l.appendChild(d);
  });
}
function removeTrack(i) {
  URL.revokeObjectURL(tracks[i].url);
  tracks.splice(i, 1);
  if (i === idx) {
    audio.pause(); audio.removeAttribute('src'); audio.load(); idx = -1;
    setPlayIcon();
    setTitle('— aucune piste —');
    $('#nowArtist').textContent = '';
    $('#cur').textContent = '0:00'; $('#dur').textContent = '0:00'; $('#seek').value = 0;
    if (tracks.length) load(Math.min(i, tracks.length - 1), false);
  } else if (i < idx) idx--;
  renderList();
}

/* ---------- Lecture ---------- */
function load(i, autoplay) {
  idx = i;
  const t = tracks[i];
  audio.src = t.url;
  setTitle(t.title || t.name);
  $('#nowArtist').textContent = t.artist || '';
  renderList();
  if (autoplay) play();
}
function setPlayIcon() {
  const ic = icon(audio.paused ? 'play' : 'pause');
  $('#play').innerHTML = ic;
  $('#miniPlay').innerHTML = ic;
  document.body.classList.toggle('playing', !audio.paused);
}
function play() { initAudioCtx(); audio.play().catch(() => {}); }
function toggle() { if (idx === -1) return; audio.paused ? play() : audio.pause(); }

function next(auto) {
  if (!tracks.length) return;
  if (auto && repeat === 2) { audio.currentTime = 0; play(); return; }
  let n;
  if (shuffle && tracks.length > 1) {
    do { n = Math.floor(Math.random() * tracks.length); } while (n === idx);
  } else {
    n = idx + 1;
    if (n >= tracks.length) {
      if (repeat === 1 || !auto) n = 0;
      else { audio.pause(); return; }
    }
  }
  load(n, true);
}
function prev() {
  if (!tracks.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  load((idx - 1 + tracks.length) % tracks.length, true);
}

$('#play').onclick = toggle;
$('#next').onclick = () => next(false);
$('#prev').onclick = prev;
$('#miniPlay').onclick = toggle;
$('#miniNext').onclick = () => next(false);
$('#miniPrev').onclick = prev;
$('#miniOpen').onclick = () => go('home');
$('#shuffle').onclick = e => {
  shuffle = !shuffle;
  e.currentTarget.classList.toggle('on', shuffle);
  e.currentTarget.setAttribute('aria-pressed', shuffle);
};
$('#repeat').onclick = e => {
  repeat = (repeat + 1) % 3;
  e.currentTarget.classList.toggle('on', repeat > 0);
  e.currentTarget.classList.toggle('one', repeat === 2);
  e.currentTarget.setAttribute('aria-pressed', repeat > 0);
  e.currentTarget.setAttribute('aria-label', ['Répéter : non', 'Répéter : tout', 'Répéter : une piste'][repeat]);
};

audio.addEventListener('play', setPlayIcon);
audio.addEventListener('pause', setPlayIcon);
audio.addEventListener('ended', () => next(true));
audio.addEventListener('loadedmetadata', () => $('#dur').textContent = fmt(audio.duration));
audio.addEventListener('timeupdate', () => {
  $('#cur').textContent = fmt(audio.currentTime);
  if (audio.duration && !seeking) $('#seek').value = (audio.currentTime / audio.duration) * 100;
});

const seek = $('#seek');
seek.addEventListener('input', () => { seeking = true; $('#cur').textContent = fmt(audio.duration * seek.value / 100); });
seek.addEventListener('change', () => { audio.currentTime = audio.duration * seek.value / 100; seeking = false; });

/* Volume + affichage (le gain Web Audio est branché par features.js) */
const volEl = $('#vol');
function syncVol() {
  const v = +volEl.value;
  $('#volv').textContent = Math.round(v * 100);
  $('#mute').innerHTML = icon(v === 0 ? 'mute' : 'vol');
}
volEl.addEventListener('input', e => { audio.volume = e.target.value; syncVol(); });
audio.volume = 0.7;
syncVol();

/* ---------- Contrôles système + clavier ---------- */
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', play);
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', prev);
  navigator.mediaSession.setActionHandler('nexttrack', () => next(false));
}
document.addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;   // ne double pas les contrôles focalisés
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.code === 'ArrowRight') audio.currentTime += 5;
  if (e.code === 'ArrowLeft') audio.currentTime -= 5;
});

/* ---------- Spotify (lecteur intégré, extraits 30 s ou titres complets si connecté) ---------- */
const presets = [
  ['Top 50 Monde', 'https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF'],
  ['Lofi Beats', 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn'],
  ['Dreamy', 'https://open.spotify.com/playlist/37i9dQZF1DX6uQnrQkSAYA']
];
const frame = $('#spFrame');

function toEmbed(url) {
  url = url.trim();
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist|show|episode)\/([A-Za-z0-9]+)/i)
        || url.match(/^spotify:(track|album|playlist|artist|show|episode):([A-Za-z0-9]+)/i);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`;
}
function loadSpotify(url) {
  const e = toEmbed(url);
  const inp = $('#spUrl');
  if (!e) {
    inp.classList.add('bad');
    inp.value = '';
    inp.placeholder = 'Lien Spotify invalide !';
    return;
  }
  inp.classList.remove('bad');
  frame.src = e;
  const type = e.split('/embed/')[1].split('/')[0];
  frame.style.height = (type === 'track' || type === 'episode') ? '152px' : '352px';
  try { localStorage.setItem('dreamplayer_sp', url); } catch (_) {}
}

presets.forEach(([n, u]) => {
  const b = document.createElement('button');
  b.className = 'btn sm';
  b.textContent = n;
  b.onclick = () => { $('#spUrl').value = u; loadSpotify(u); };
  $('#presets').appendChild(b);
});
$('#spGo').onclick = () => loadSpotify($('#spUrl').value);
$('#spUrl').addEventListener('keydown', e => { if (e.key === 'Enter') loadSpotify(e.target.value); });

let saved = presets[1][1];
try { saved = localStorage.getItem('dreamplayer_sp') || saved; } catch (_) {}
$('#spUrl').value = saved;
loadSpotify(saved);

/* ---------- Service worker (PWA) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(console.warn);
  });
}
