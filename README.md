# StoryVoice

Compagnon de lecture intelligent (PWA, single-file). Charge un ebook (TXT / EPUB / PDF) et génère :

- des **résumés multi-niveaux** (global + par chapitre),
- une **carte vivante des personnages** (anti-spoiler, bornée à ta progression de lecture),
- une **narration multi-voix** par personnage (TTS),
- un **Q&A anti-spoiler** sur le livre,
- une **image d'ambiance** générée par livre.

## Hébergement

App statique, hébergée sur **GitHub Pages** : <https://quang101182.github.io/storyvoice/>

Installable comme **PWA** (PC + mobile) : ouvre l'URL puis « Installer / Ajouter à l'écran d'accueil ».

## Sécurité

Le code ne contient **aucun secret**. Les clés API (LLM, TTS, image) vivent côté gateway Cloudflare Worker.
La **clé d'accès** personnelle se saisit dans Réglages → stockée uniquement dans le `localStorage` de l'appareil, jamais dans le code.
Les livres, l'audio et les images générés restent en **IndexedDB** dans le navigateur (rien n'est stocké côté serveur).

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | L'application complète (HTML + CSS + JS inline) |
| `manifest.json` | Manifeste PWA (icônes, nom, couleurs, standalone) |
| `sw.js` | Service worker — cache l'app shell pour l'offline ; **n'intercepte jamais** les appels au gateway |
| `icons/` | Icônes PWA (any / maskable / apple-touch / favicon) |
| `_gen_icons.py` | Régénère les icônes (PIL) |
| `_qa_pwa.js` | Harness de test PWA (Edge CDP + serveur local) |
