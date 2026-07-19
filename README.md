# Naslag

**Lees je Google-Drive Obsidian-vault, read-only, op elk toestel.**

Een lichte, platform-onafhankelijke webapp (PWA) die je Drive-gesyncte Obsidian-vault
direct read-only leest en rendert in Obsidian-smaak: `[[wikilinks]]`, `#tags`, `![[embeds]]`.
Eén codebase, werkt op iPhone, Android en desktop, installeerbaar op je beginscherm, en
offline voor wat je al hebt gelezen. Je notities blijven op je toestel.

## Waarom

Je vault leeft op je computer in een map die Google Drive synct. Op je telefoon is die
kopie alleen omslachtig te lezen (Drive → deel → app kiezen). Naslag leest die bestaande
Drive-kopie **direct** en toont 'm als een echte lezer.

## Hoe het werkt (en waarom er geen server-secret nodig is)

Google sloot de pure-client-side OAuth-route af voor nieuwe apps. Naslag gebruikt daarom
een **Google Apps Script als login-makelaar**:

1. Je autoriseert een Google-gehost script (`drive.readonly`).
2. Het script pakt met `ScriptApp.getOAuthToken()` jouw Drive-token en stuurt je terug
   naar de app met dat token.
3. De app (in je browser) leest Drive daarna **rechtstreeks**.

Gevolg: geen client-secret op een eigen server, het werkt voor elke Google-gebruiker, en
je notitie-inhoud raakt nooit een server — de browser praat direct met Drive. De
redirect-flow werkt ook in de geïnstalleerde standalone-app op iOS.

## Wat het kan

- Read-only lezen van je vault (mappenboom + notities).
- Markdown: koppen, lijsten, tabellen, code, citaten, checklists, afbeeldingen.
- Obsidian-smaak: doorklikbare `[[wikilinks]]` (met nabijheids-resolutie), `#tags` als
  chips, `![[embeds]]` (afbeeldingen + notitie-transclusie).
- Cross-platform PWA, installeerbaar, offline voor recent bekeken notities.
- Frontmatter netjes verborgen.

## Zelf hosten

Naslag is client-side-only statische bestanden + één Apps Script. Om je eigen instantie te
draaien:

**1. Deploy de login-makelaar (Apps Script)**
- Ga naar [script.google.com](https://script.google.com) → nieuw project.
- Plak `apps-script/Code.gs` en `apps-script/appsscript.json` (manifest tonen via
  Projectinstellingen). Zet `ALLOWED` in `Code.gs` op de URL van je eigen app.
- Deploy als web-app: **Uitvoeren als** = *Gebruiker die de web-app opent*,
  **Wie heeft toegang** = *Iedereen met een Google-account* (of *Alleen ikzelf*).
- Zet de **Google Drive API** aan in het Cloud-project achter het script
  (console.cloud.google.com → dat project → APIs → Google Drive API → Inschakelen).
- Kopieer de web-app-URL (eindigt op `/exec`).

**2. Configureer de app**
- Zet die `/exec`-URL in [`lib/config.js`](lib/config.js).

**3. Host de statische bestanden**
- Zet alle bestanden (op `apps-script/`, `spike/` en de dev-bestanden na) op een statische
  host of je eigen server. Een service worker vereist HTTPS (of `localhost`).
- Voeg de app op je toestel toe aan je beginscherm.

> De "niet-geverifieerde app"-waarschuwing van Google verschijnt eenmalig (drive.readonly
> is een restricted scope). Voor persoonlijk/klein gebruik klik je erdoorheen; volledige
> Google-verificatie is voor grootschalige distributie.

## Ontwikkelen

```bash
npm run serve   # python3 -m http.server 8080 → http://localhost:8080
npm test        # node --test op de pure logica
npm run icons   # (her)genereert de PWA-iconen met CoreGraphics
```

Geen runtime-dependencies buiten een gevendorde [markdown-it](https://github.com/markdown-it/markdown-it)
(offline, geen CDN). De pure logica (wikilink-resolutie, frontmatter, markdown-transforms,
token-afhandeling, foutclassificatie) is getest met de ingebouwde test-runner van Node.

MIT.
