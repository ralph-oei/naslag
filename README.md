# Naslag

**Lees je Google-Drive Obsidian-vault, read-only, op elk toestel.**

Een lichte, platform-onafhankelijke webapp (PWA) die je Drive-gesyncte Obsidian-vault
direct read-only leest en rendert in Obsidian-smaak (wikilinks, tags, embeds). Eén deploy,
werkt op iPhone, Android en desktop. Je notities blijven op je toestel; er is geen server.

> **Status:** in aanbouw. Unit 1 (het PWA-skelet) staat. Volgende: Google OAuth (unit 2).
> Plan: `docs/plans/2026-07-19-001-feat-obsidian-drive-pwa-viewer-plan.md`.

## Lokaal draaien

Een service worker en OAuth vereisen een secure context; `localhost` telt als veilig.

```bash
npm run serve      # python3 -m http.server 8080  → open http://localhost:8080
```

## Iconen (her)genereren

```bash
npm run icons      # tekent de PWA-iconen met CoreGraphics, geen externe tools
```

## Tests

```bash
npm test           # node --test op de pure logica (komt vanaf unit 2)
```

Geen runtime-dependencies. De rendering leunt op een gevendorde markdown-it (komt in unit 5).

MIT.
