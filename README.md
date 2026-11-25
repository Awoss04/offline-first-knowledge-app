# Offline-First Knowledge App

> DSGVO-konforme, autarke Single-Page Web-Applikation mit Zero-CDN-Footprint und integrierter Build-Inlining-Engine.  
> Entwickelt nach Security-by-Design und WCAG AA Standards.

---

## Architektur & Kernprinzipien

Moderne Webanwendungen leiden haeufig unter aufgeblaehten Abhaengigkeiten, externen CDN-Leaks (wie unerlaubtem Nachladen von Google Fonts) und komplexer Server-Infrastruktur. Diese Anwendung zeigt eine Alternative:

- **100% Offline-First:** Alle Komponenten (Logik, Styles, Vektor-Icons und Daten) werden ueber eine Node.js-Build-Pipeline in ein **einziges, portables HTML-Dokument** kompaktiert.
- **Zero Third-Party Leaks:** Keine externen Font-, Script- oder Style-CDNs. Vollstaendig DSGVO-konform ohne Notwendigkeit fuer Cookie-Consent-Banner.
- **Sicherheit & Härtung:** Produktionsreife Apache-Konfiguration (`deploy/.htaccess`) mit strikten Security-Headern (`nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`, Gzip-Kompression).
- **Barrierefreiheit:** Semantische HTML5-Struktur mit WCAG 2.1 AA konformen Kontrastverhaeltnissen und nativer Tastaturnavigation.
- **Client-Side Persistence:** Vollstaendige Speicherung des Lern- bzw. Lesefortschritts im `localStorage` des Browsers.

---

## Projektstruktur

```
offline-first-knowledge-app/
├── src/                  # Quellkomponenten (app.js, icons.js, index.template.html)
├── tools/                # Build- & Inlining-Engine (build.mjs)
├── data/                 # Strukturierte Knowledge-Datensaetze (JSON)
├── deploy/               # Produktionsreife Serverkonfiguration (.htaccess)
└── README.md
```

---

## Build & Lokale Vorschau

```bash
# Node.js Build-Inliner ausfuehren
node tools/build.mjs

# Die generierte Einzeldatei oeffnen
open dist/index.html
```

---

## Lizenz

MIT License – Frei verwendbar als Architekturvorlage fuer datenschutzkonforme Unternehmens- und Wissensportale.
