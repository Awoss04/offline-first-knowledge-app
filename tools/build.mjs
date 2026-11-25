#!/usr/bin/env node
/**
 * Baut die fertige Einzeldatei lern-app.html.
 *
 * Setzt die Inhalte aus daten/app-daten.json und die Spiellogik aus
 * src/app.js in die Vorlage src/index.template.html ein. Es werden keine
 * externen Ressourcen eingebunden - die Datei laeuft offline im Browser.
 */
import { readFileSync, writeFileSync, statSync, cpSync, mkdirSync, rmSync, existsSync, lstatSync, readdirSync, realpathSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = dirname(hier);
const repoRoot = dirname(wurzel);
const template = join(wurzel, 'src', 'index.template.html');
const logik = join(wurzel, 'src', 'app.js');
const icons = join(wurzel, 'src', 'icons.js');
const daten = join(wurzel, 'daten', 'app-daten.json');
const ziel = join(wurzel, 'lern-app.html');

const deployDir = join(repoRoot, 'deploy');
const deployIndex = join(deployDir, 'index.html');
const deployMat = join(deployDir, 'materialien');
const sourceMat = join(repoRoot, 'materialien');
const deployHtaccess = join(deployDir, '.htaccess');

/**
 * Entfernt Symlinks aus dem Deploy-Paket und ersetzt sie durch echte Kopien.
 * Ein FTP-/SFTP-Upload folgt einem Symlink nicht immer - das Paket muss
 * ausschliesslich aus physischen Dateien bestehen.
 */
function entferneSymlinks(dir) {
  let n = 0;
  for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
    const pfad = join(dir, eintrag.name);
    if (eintrag.isSymbolicLink()) {
      // Link-Ziel als echte Datei kopieren, dann den Link loeschen
      const ziel = join(dir, eintrag.name + '.tmp');
      cpSync(realpathSync(pfad), ziel);
      rmSync(pfad);
      renameSync(ziel, pfad);
      n++;
    } else if (eintrag.isDirectory()) {
      n += entferneSymlinks(pfad);
    }
  }
  if (n > 0) console.log('  Symlinks ersetzt: ' + n);
  return n;
}

/**
 * Entfernt macOS-Systemdateien (Junk) aus dem Deploy-Paket.
 * Solche Dateien sind im Webhosting sinnlos und stoeren den Upload.
 */
function entferneJunk(dir) {
  let n = 0;
  for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
    const pfad = join(dir, eintrag.name);
    const name = eintrag.name;
    const istJunk = name === '.DS_Store' || name === '__MACOSX' ||
                   name.startsWith('._');
    if (istJunk) {
      rmSync(pfad, { recursive: true, force: true });
      n++;
    } else if (eintrag.isDirectory()) {
      n += entferneJunk(pfad);
    }
  }
  return n;
}

const tpl = readFileSync(template, 'utf8');
const js = readFileSync(logik, 'utf8');
const iconJs = readFileSync(icons, 'utf8');
const datenJson = readFileSync(daten, 'utf8');

JSON.parse(datenJson); // gueltiges JSON pruefen

// </script> in Strings verhindert, dass der Browser den Block vorzeitig schliesst
function sicher(jsCode) {
  return jsCode.replace(/<\/script>/gi, '<\\/script>');
}

const datenBlock = 'window.APP_DATEN = ' + datenJson.trim() + ';';

let out = tpl
  .replace('/*__APP_DATEN__*/', () => datenBlock)
  .replace('/*__APP_ICONS__*/', () => sicher(iconJs))
  .replace('/*__APP_LOGIK__*/', () => sicher(js));

if (out.includes('__APP_DATEN__') || out.includes('__APP_LOGIK__') || out.includes('__APP_ICONS__')) {
  console.error('FEHLER: Platzhalter nicht ersetzt.');
  process.exit(1);
}

// ---------- Design-Waechter: keine Emojis / billigen Unicode-Icons ----------
// Vorgabe: .agents/AGENTS.md Ziffer 12 und .agents/skills/anti-ui-slop:
// "Emoji as Feature Icons" ist strengstens untersagt. Erlaubt sind nur
// Vector-SVG-Icons (stroke-width 1.5-2.0) und typografische Zeichen.
const verboten = out.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu);
if (verboten) {
  const liste = [...new Set(verboten)].join(' ');
  console.error('FEHLER: Emoji/Unicode-Icon gefunden - durch Vector-SVG ersetzen.');
  console.error('       Gefunden: ' + liste);
  process.exit(1);
}

// Keine externen Ressourcen zulassen
const extern = out.match(/(src|href)\s*=\s*["'](https?:)?\/\//gi);
if (extern) {
  console.error('FEHLER: Externe Ressourcen gefunden:', extern.join(', '));
  process.exit(1);
}

writeFileSync(ziel, out, 'utf8');
const kb = (statSync(ziel).size / 1024).toFixed(1);
console.log('lern-app.html erzeugt (' + kb + ' KB)');
console.log('  -> ' + ziel);

// Deployment-Paket unter deploy/ erzeugen.
// deploy/ wird komplett geloescht und neu aufgebaut, damit das Paket immer
// exakt dem Build-Stand entspricht: keine Altlasten, keine Symlinks.
if (existsSync(deployDir)) {
  rmSync(deployDir, { recursive: true, force: true });
  console.log('deploy/ geloescht (Altlasten entfernt)');
}
mkdirSync(deployDir, { recursive: true });
writeFileSync(deployIndex, out, 'utf8');
console.log('deploy/index.html erzeugt (' + kb + ' KB)');

// materialien/ physisch kopieren (cpSync kopiert Inhalte, legt keine Links an).
if (existsSync(sourceMat)) {
  cpSync(sourceMat, deployMat, { recursive: true });
  // Sicherheitsnetz: Symlinks im Ergebnis werden entfernt und durch echte
  // Dateien ersetzt - ein FTP-Upload darf niemals einem Link folgen.
  entferneSymlinks(deployMat);
  console.log('deploy/materialien synchronisiert');
}

// .htaccess fuer Netcup Webhosting
const htaccessContent = `# Netcup Webhosting - Claude Code Masterclass Lern-App
DirectoryIndex index.html

# UTF-8 Zeichensatz
AddDefaultCharset UTF-8
AddCharset UTF-8 .html .css .js .json .svg

# Directory Browsing deaktivieren
Options -Indexes

# MIME-Types
<IfModule mod_mime.c>
  AddType text/html .html
  AddType application/json .json
  AddType text/css .css
  AddType application/javascript .js
  AddType image/svg+xml .svg
</IfModule>

# Sicherheits-Header
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Gzip / Deflate Komprimierung
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/json application/javascript image/svg+xml
</IfModule>
`;

writeFileSync(deployHtaccess, htaccessContent, 'utf8');
console.log('deploy/.htaccess erzeugt');

// macOS-Systemdateien aus dem Paket entfernen
const nJunk = entferneJunk(deployDir);
if (nJunk > 0) console.log('deploy/: ' + nJunk + ' Systemdatei(en) entfernt');

// Kurzpruefung: das Paket darf nur physische Dateien enthalten
const nLinks = entferneSymlinks(deployDir);
if (nLinks > 0) console.log('deploy/: ' + nLinks + ' Symlink(s) ersetzt');
console.log('deploy/ fertig - nur physische Dateien, keine Symlinks.');
