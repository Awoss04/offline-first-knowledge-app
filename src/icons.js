/* ============================================================
   Icon-System - WALZ VISIONARY Design-Standard
   ============================================================
   Hausstandard (siehe .agents/skills/luxury-resource-cards/icons/):
     - viewBox 0 0 24 24
     - fill: none, stroke: currentColor
     - stroke-width: 1.75 (im Bereich 1.5 - 2.0 der Richtlinie)
     - stroke-linecap/linejoin: round
   Monochrom, kein Unicode-Symbol, keine Emojis.
   ============================================================ */
(function (global) {
  'use strict';

  var PFAD = {
    /* Navigation */
    start: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    module: '<path d="M12 3 3 7.5 12 12l9-4.5L12 3Z"/><path d="M3 12.5 12 17l9-4.5"/><path d="M3 17 12 21.5 21 17"/>',
    wiederholung: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    abzeichen: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/>',
    mehr: '<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h4"/><path d="M12 17h8"/><circle cx="10" cy="17" r="2"/>',

    /* Zustaende */
    check: '<path d="M20 6 9 17l-5-5"/>',
    cross: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    schild: '<path d="M12 2.5 4 5.5v6c0 5 3.4 9.2 8 10.5 4.6-1.3 8-5.5 8-10.5v-6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    ziel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    schloss: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    schlossOffen: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 7.5-1.9"/>',
    flamme: '<path d="M12 22c4 0 6.5-2.7 6.5-6.2 0-4.6-4.3-6.3-4.3-10.8 0 0-3 1.6-3 5.2 0 1.6-1 2.3-1.8 1.6-.6-.5-.9-1.4-.9-2.3C6.9 10.9 5.5 13 5.5 15.8 5.5 19.3 8 22 12 22Z"/>',
    blitz: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"/>',
    pfeilLinks: '<path d="M15 5 8 12l7 7"/>',
    pfeilRechts: '<path d="M9 5l7 7-7 7"/>',

    /* Datei & Quelle */
    datei: '<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5l-5-5Z"/><path d="M14 2.5v5h5"/>',
    dateiText: '<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5l-5-5Z"/><path d="M14 2.5v5h5"/><path d="M8.5 13h7"/><path d="M8.5 16.5h5"/>',
    speichern: '<path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    laden: '<path d="M12 21V9"/><path d="m7.5 13.5 4.5-4.5 4.5 4.5"/><path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"/>',

    /* Abzeichen */
    spross: '<path d="M12 22V12"/><path d="M12 12C12 7 9 4 5 4c0 5 2.5 8 7 8Z"/><path d="M12 12c0-5 3-8 7-8 0 5-2.5 8-7 8Z"/>',
    medaille: '<circle cx="12" cy="14.5" r="5.5"/><path d="m8.5 9.5-3-7h5l2 4"/><path d="m15.5 9.5 3-7h-5l-2 4"/>',
    karten: '<rect x="7" y="3" width="13" height="16" rx="2"/><path d="M4 7v12a2 2 0 0 0 2 2h9"/>',
    juwel: '<path d="M6 3h12l4 6-10 12L2 9l4-6Z"/><path d="M2 9h20"/><path d="m12 21 4-12"/><path d="m12 21-4-12"/><path d="m8.5 3-2.5 6 6 12"/><path d="m15.5 3 2.5 6-6 12"/>',
    huete: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.2V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.8"/><path d="M22 9v5"/>',
    krone: '<path d="M3 7.5 6.5 12 12 4l5.5 8L21 7.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V7.5Z"/><path d="M3 19.5h18"/>',
    bogenschuetze: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v4"/><path d="m15 9 4.5 4.5"/>',
    punkte: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9"/><path d="M9 10.5h6"/><path d="M9 13.5h6"/>',
    kreuz: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.8h.01"/>'
  };

  /* Alias: Abzeichen-Icons bekommen sprechende Namen */
  var ALIAS = {
    'abz-erster-schritt': 'spross',
    'abz-modul-meister': 'medaille',
    'abz-streak-7': 'flamme',
    'abz-streak-10': 'blitz',
    'abz-fehlerfrei': 'ziel',
    'abz-serienheld': 'bogenschuetze',
    'abz-kartenmeister': 'karten',
    'abz-punktesammler': 'juwel',
    'abz-kurs-abschluss': 'huete',
    'abz-profi': 'krone'
  };

  /**
   * Baut ein Inline-SVG.
   * @param {string} name  Icon-Name (siehe PFAD) oder Alias
   * @param {number} size  Kantenlaenge in px (Standard 24)
   * @param {string} cls   zusaetzliche CSS-Klassen
   */
  function icon(name, size, cls) {
    var pfad = PFAD[name] || PFAD[ALIAS[name]] || null;
    if (!pfad) return '';
    var s = size || 24;
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" width="' + s + '" height="' + s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      pfad + '</svg>';
  }

  /* Schwierigkeit typografisch: roemische Ziffern statt Stern-Symbolen */
  function roemisch(n) {
    return ['', 'I', 'II', 'III'][n] || String(n);
  }

  global.WV_ICONS = { icon: icon, pfad: PFAD, alias: ALIAS, roemisch: roemisch };
})(typeof window !== 'undefined' ? window : this);
