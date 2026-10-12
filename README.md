# 🌙 dream.player

<p align="center">
  <strong>Un voyage pixelisé au cœur des rêves et de la musique.</strong>
  <br>
  Un lecteur musical qui mélange Dreamcore, Gothic Pixel, Y2K et esthétique informatique rétro.
</p>

<p align="center">
  <img src="icon-192.png" alt="Icône de dream.player" width="120">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Style-Dreamcore%20Pixel-B9A0FF?style=for-the-badge" alt="Style Dreamcore Pixel">
  <img src="https://img.shields.io/badge/Thème-Sombre%20%26%20Néon-171322?style=for-the-badge" alt="Thème sombre et néon">
  <img src="https://img.shields.io/badge/Plateforme-PWA-00E5FF?style=for-the-badge" alt="Application PWA">
</p>

---

## ✦ Présentation

**dream.player** est un lecteur musical conçu comme un voyage dans un univers numérique sombre, mystérieux et onirique.

Il mélange le pixel art, les lumières néon, les interfaces informatiques rétro et les paysages étranges pour transformer l'écoute de musique en une expérience visuelle immersive.

Son identité visuelle réunit huit styles artistiques :

- 🌌 **Dreamcore Pixel** — paysages irréels, étoiles, lunes et îles flottantes.
- 🦇 **Gothic Pixel** — ambiances sombres, symboles gothiques et détails mystérieux.
- 💿 **Y2K** — CD, reflets chromés et esthétique futuriste des années 2000.
- 🖥️ **Retro Computer** — fenêtres d'ordinateur ancien et détails inspirés des terminaux.
- 💜 **Pastel Pixel** — nuances de lavande et touches de rose pastel.
- ⚡ **Neon Arcade** — commandes lumineuses et visualisations musicales.
- 🕸️ **Liminal Pixel** — espaces étranges, silencieux et oniriques.
- ▪️ **Pixel Minimal** — interface épurée, alignements précis et icônes pixelisées.

## 🎨 Identité visuelle

| Élément | Couleur | Code hexadécimal |
|---|---|---|
| Noir abyssal | `#080710` | Fond principal |
| Violet nocturne | `#171322` | Panneaux et surfaces |
| Lavande lumineuse | `#B9A0FF` | Éléments principaux |
| Blanc lunaire | `#F2DDFB` | Textes et détails |
| Rose néon | `#FF6EC7` | Accents lumineux |
| Cyan électrique | `#00E5FF` | Détails futuristes |

### Typographies

- **Press Start 2P** — titres et éléments pixelisés.
- **Poppins** — textes principaux et navigation.
- **VT323** — minuteries, chiffres et détails rétro.

## ✦ Fonctionnalités

Les fonctionnalités disponibles dépendent de la version actuelle du projet et de sa configuration.

- 🎵 Lecture audio et commandes musicales.
- 📂 Bibliothèque musicale et importation de fichiers audio.
- ❤️ Favoris et playlists.
- ⏳ Historique d'écoute et file d'attente.
- 🎚️ Visualiseur audio et effets visuels.
- 🎨 Interface sombre avec pixels et accents néon.
- ⚙️ Paramètres et personnalisation.
- 🎧 Intégration Spotify, selon la configuration.
- 💾 Stockage local des données prises en charge.
- 📱 Interface adaptée aux ordinateurs et aux téléphones.
- 📲 Prise en charge d'une application web progressive (PWA).
- 🌐 Accès hors ligne aux ressources mises en cache, selon les fonctionnalités disponibles.

## 🛠️ Technologies utilisées

- HTML5
- CSS3
- JavaScript
- Web Audio API, si utilisée par les fonctionnalités concernées
- IndexedDB et stockage du navigateur
- Web App Manifest
- Service Worker

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/azzouziouwais350-code/dream.player.git
```

### 2. Accéder au dossier

```bash
cd dream.player
```

### 3. Lancer le projet

Ouvre le dossier dans Visual Studio Code et utilise l'extension **Live Server** pour lancer le site dans ton navigateur.

Tu peux également ouvrir `index.html` directement, mais certaines fonctionnalités, comme le service worker, nécessitent un environnement local sécurisé tel que `localhost` ou un site en HTTPS.

## 📱 Installation en tant qu'application

Lorsque le manifeste et le service worker sont correctement configurés, dream.player peut être installé comme une application web progressive (PWA).

1. Ouvre le site dans un navigateur compatible.
2. Utilise l'option d'installation du navigateur si elle est disponible.
3. Lance dream.player depuis ton écran d'accueil ou ton menu d'applications.

Le fonctionnement hors ligne dépend des ressources mises en cache et des fonctionnalités qui peuvent fonctionner sans connexion.

## 🎧 Intégration Spotify ( Beta )

Les fonctionnalités liées à Spotify peuvent nécessiter une authentification, une configuration supplémentaire et le respect des règles de la plateforme.

Leur disponibilité dépend de l'implémentation et des politiques actuelles de Spotify.

**Important :** ne place jamais de clés API privées ou de secrets d'authentification dans le code JavaScript accessible publiquement.

## 📁 Structure du projet

Le projet est organisé autour de fichiers HTML, CSS, JavaScript et de ressources graphiques.

- `index.html` — page principale de l'application.
- `style.css` — styles principaux de l'interface.
- `premium.css` — styles visuels supplémentaires.
- `manifest.json` — configuration de la PWA.
- `sw.js` — service worker et mise en cache des ressources.
- `icon.svg` — icône vectorielle.
- `icon-192.png` — icône de l'application en 192 × 192 pixels.
- `icon-512.png` — icône de l'application en 512 × 512 pixels.
- Fichiers JavaScript — lecture audio, interface, paramètres et intégrations.

Le rôle exact de chaque script peut varier selon la version du projet.

## 🔒 Confidentialité et stockage

Selon leur implémentation, les fichiers audio importés et les paramètres peuvent être conservés dans le stockage local du navigateur.

- Les données peuvent être supprimées si le stockage du navigateur est effacé.
- Les fichiers importés ne sont pas automatiquement synchronisés entre plusieurs appareils.
- Les intégrations externes peuvent communiquer avec des services tiers.
- Les identifiants sensibles ne doivent pas être enregistrés dans le code côté client.

## 🧪 Liste de vérification

Avant de publier une nouvelle version, vérifie les points suivants :

- [ ] Lecture, pause et changement de morceau.
- [ ] Barre de progression et réglage du volume.
- [ ] Importation de musique et affichage des informations.
- [ ] Playlists, favoris et historique.
- [ ] File d'attente et lecture aléatoire.
- [ ] Conservation des données après actualisation.
- [ ] Affichage sur ordinateur et téléphone.
- [ ] Navigation au clavier et accessibilité.
- [ ] Installation de la PWA et mises à jour du cache.
- [ ] Fonctionnement hors ligne.
- [ ] Fonctionnalités Spotify, si configurées.
- [ ] Absence d'erreurs dans la console du navigateur.
- [ ] Performances et fluidité des animations.

## 🌐 Démo en ligne

**Site officiel du projet :**  
https://azzouziouwais350-code.github.io/dream.player/

## 📄 Licence

Aucune licence n'est précisée dans ce README. Si tu souhaites autoriser la réutilisation ou la modification du projet, ajoute un fichier `LICENSE` avec la licence open source de ton choix.

---

<p align="center">
  <strong>dream.player</strong>
  <br>
  <em>Perdu dans le rêve. Retrouvé dans la musique.</em>
  <br><br>
  🖤 🌙 🦇 💿
</p>
