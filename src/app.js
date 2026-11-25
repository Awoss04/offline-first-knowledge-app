/* ============================================================
   Claude Code Masterclass - Lern-App
   Spiellogik, Speicherung und Darstellung.
   ============================================================ */
(function () {
  'use strict';

  var D = window.APP_DATEN;
  var KEY = 'ccm.lernapp.v1';
  var ICO = window.WV_ICONS;

  /** Kurzform fuer ein Inline-SVG-Icon. */
  function ic(name, size, cls) {
    return ICO.icon(name, size, cls);
  }

  /* ---------------- Zustand ---------------- */
  function leererZustand() {
    return {
      version: 1,
      punkte: 0,
      level: 1,
      streak: 0,
      bestStreak: 0,
      lastStudyDate: null,
      serie: 0,
      bestSerie: 0,
      moduleQuiz: {},
      karten: {},
      stats: { antworten: 0, korrekt: 0, kartenGesehen: 0, perfekt: 0 },
      abzeichen: [],
      verlauf: [],
      letzteModule: 'm1'
    };
  }

  var S = leererZustand();

  /* ---------------- Speicher-Abstraktion (mit file:// In-Memory-Fallback) ---------------- */
  var memStorage = {};
  var storageAvailable = (function () {
    try {
      var testKey = '__ccm_test__';
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  })();

  function storageGet(key) {
    if (storageAvailable) {
      try { return window.localStorage.getItem(key); } catch (e) {}
    }
    return Object.prototype.hasOwnProperty.call(memStorage, key) ? memStorage[key] : null;
  }

  function storageSet(key, val) {
    if (storageAvailable) {
      try {
        window.localStorage.setItem(key, val);
        return true;
      } catch (e) {}
    }
    memStorage[key] = String(val);
    return true;
  }

  function storageRemove(key) {
    if (storageAvailable) {
      try { window.localStorage.removeItem(key); } catch (e) {}
    }
    delete memStorage[key];
  }

  function laden() {
    try {
      var roh = storageGet(KEY);
      if (!roh) return;
      var p = JSON.parse(roh);
      if (p && p.version === 1) {
        S = Object.assign(leererZustand(), p);
        S.stats = Object.assign(leererZustand().stats, p.stats || {});
        S.moduleQuiz = p.moduleQuiz || {};
        S.karten = p.karten || {};
        S.verlauf = p.verlauf || [];
        S.abzeichen = p.abzeichen || [];
      }
    } catch (e) { /* defekter Speicherstand -> neu beginnen */ }
  }

  function speichern() {
    try {
      storageSet(KEY, JSON.stringify(S));
    } catch (e) {
      toast('Speichern nicht möglich', false);
    }
  }

  /* ---------------- Datum ---------------- */
  function heute() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tageAb(datum) {
    if (!datum) return null;
    var p = datum.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var h = new Date(); h.setHours(0, 0, 0, 0);
    return Math.round((h - d) / 86400000);
  }
  function plusTage(t) {
    var d = new Date(); d.setDate(d.getDate() + t);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ---------------- Level & Freischaltung ---------------- */
  function levelInfo(nr) {
    for (var i = 0; i < D.levels.length; i++) {
      if (D.levels[i].nr === nr) return D.levels[i];
    }
    return D.levels[0];
  }
  function modulFrei(mod) {
    return mod.level <= S.level;
  }
  function modulBestanden(id) {
    return !!(S.moduleQuiz[id] && S.moduleQuiz[id].bestanden);
  }
  function levelBerechnen() {
    var bestanden = 0;
    D.module.forEach(function (m) { if (modulBestanden(m.id)) bestanden++; });
    return Math.min(D.levels.length, 1 + bestanden);
  }

  /* ---------------- Punkte & Serie ---------------- */
  function multiplikator() {
    if (S.serie >= 10) return 2.0;
    if (S.serie >= 6) return 1.5;
    if (S.serie >= 3) return 1.2;
    return 1.0;
  }
  function punkteFuer(typ, schwierigkeit) {
    var basis = typ === 'karte' ? D.punkte.karte : D.punkte.quiz[schwierigkeit] || 10;
    var m = multiplikator();
    if (S.level >= 5 && typ === 'quiz' && schwierigkeit === 3) basis *= 2;
    return Math.round(basis * m);
  }

  /* ---------------- Verlauf ---------------- */
  function protokoll(text, typ) {
    S.verlauf.unshift({ zeit: new Date().toISOString(), text: text, typ: typ || 'info' });
    if (S.verlauf.length > 60) S.verlauf.length = 60;
  }

  /* ---------------- Streak ---------------- */
  function streakPruefen() {
    var h = heute();
    if (S.lastStudyDate === h) return null;          // heute schon geübt
    var diff = tageAb(S.lastStudyDate);
    if (S.lastStudyDate === null) {
      S.streak = 1;
    } else if (diff === 1) {
      S.streak += 1;
    } else if (diff > 1) {
      var alt = S.streak;
      S.streak = 1;
      if (alt > 0) {
        protokoll('Streak zurückgesetzt – ' + alt + ' Tage am Stück, ' + diff + ' Tage Pause', 'bad');
        return { reset: true, vorher: alt, tage: diff };
      }
    }
    S.lastStudyDate = h;
    if (S.streak > S.bestStreak) S.bestStreak = S.streak;
    return { reset: false, streak: S.streak };
  }

  /* ---------------- Abzeichen ---------------- */
  function abzeichenPruefen() {
    var neue = [];
    function vergeben(id) {
      if (S.abzeichen.indexOf(id) !== -1) return;
      S.abzeichen.push(id);
      neue.push(id);
    }
    if (S.stats.korrekt >= 1) vergeben('erster-schritt');
    if (S.streak >= 7) vergeben('streak-7');
    if (S.streak >= 10) vergeben('streak-10');
    if (S.bestSerie >= 10) vergeben('serienheld');
    if (S.stats.kartenGesehen >= 50) vergeben('kartenmeister');
    if (S.punkte >= 1000) vergeben('punktesammler');
    if (S.level >= 5) vergeben('profi');
    var bestanden = 0;
    D.module.forEach(function (m) { if (modulBestanden(m.id)) bestanden++; });
    if (bestanden >= 1) vergeben('modul-meister');
    if (bestanden === D.module.length) vergeben('kurs-abschluss');
    if (S.stats.perfekt >= 1) vergeben('fehlerfrei');

    if (neue.length) {
      neue.forEach(function (id) {
        var a = abzeichenVon(id);
        if (a) protokoll('Abzeichen erhalten: ' + a.name, 'gold');
      });
    }
    return neue;
  }
  function abzeichenVon(id) {
    for (var i = 0; i < D.abzeichen.length; i++) {
      if (D.abzeichen[i].id === id) return D.abzeichen[i];
    }
    return null;
  }

  /* ---------------- Wiederholung (SRS) ---------------- */
  function karteZustand(id) {
    if (!S.karten[id]) {
      S.karten[id] = { falschStufe: 0, richtigStufe: 0, faellig: heute(), gesehen: 0 };
    }
    return S.karten[id];
  }
  function karteFaellig(k) {
    var t = tageAb(k.faellig);
    return t === null || t >= 0;
  }
  function karteUpdate(id, richtig) {
    var k = karteZustand(id);
    k.gesehen = (k.gesehen || 0) + 1;
    if (richtig) {
      var tage = D.srs.richtig[Math.min(k.richtigStufe, D.srs.richtig.length - 1)];
      k.richtigStufe = Math.min(k.richtigStufe + 1, D.srs.richtig.length - 1);
      k.falschStufe = Math.max(0, k.falschStufe - 1);
      k.faellig = plusTage(tage);
      return tage;
    } else {
      var t2 = D.srs.falsch[Math.min(k.falschStufe, D.srs.falsch.length - 1)];
      k.falschStufe = Math.min(k.falschStufe + 1, D.srs.falsch.length - 1);
      k.richtigStufe = 0;
      k.faellig = plusTage(t2);
      return t2;
    }
  }
  function alleKarten() {
    var liste = [];
    D.module.forEach(function (m) {
      m.lektionen.forEach(function (l) {
        l.karteikarten.forEach(function (k) {
          liste.push({ karte: k, modul: m, lektion: l });
        });
      });
    });
    return liste;
  }
  function faelligeKarten() {
    return alleKarten().filter(function (e) {
      var k = S.karten[e.karte.id];
      return !k || karteFaellig(k);
    });
  }

  /* ---------------- Hilfsfunktionen ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(id) { return document.getElementById(id); }
  function quelleLink(quelle) {
    if (!quelle) return '';
    return '<a href="' + esc(quelle) + '" target="_blank" rel="noopener">' + esc(quelle) + '</a>';
  }
  function quelleZeile(quelle, abschnitt) {
    return '<div class="src">' + ic('datei', 13) + ' ' + quelleLink(quelle) +
      (abschnitt ? ' · ' + esc(abschnitt) : '') + '</div>';
  }
  function schwierigkeitPunkte(s) {
    // Typografische Veredelung statt Symbolik (Hausstandard)
    return ICO.roemisch(s);
  }
  function modulVon(id) {
    for (var i = 0; i < D.module.length; i++) {
      if (D.module[i].id === id) return D.module[i];
    }
    return null;
  }
  function lektionVon(id) {
    for (var i = 0; i < D.module.length; i++) {
      var m = D.module[i];
      for (var j = 0; j < m.lektionen.length; j++) {
        if (m.lektionen[j].id === id) return { modul: m, lektion: m.lektionen[j] };
      }
    }
    return null;
  }

  /* ---------------- Kopfzeile ---------------- */
  function zeichneKopf() {
    var lvl = levelInfo(S.level);
    el('stats').innerHTML =
      '<div class="stat lvl"><b>' + lvl.nr + '</b><span>' + esc(lvl.name) + '</span></div>' +
      '<div class="stat pts"><b>' + S.punkte + '</b><span>Punkte</span></div>' +
      '<div class="stat streak"><b>' + S.streak + '</b><span>Streak</span></div>' +
      '<div class="stat serie"><b>×' + multiplikator().toFixed(1).replace('.0', '') + '</b><span>Serie</span></div>';

    var gesamt = 0, erledigt = 0;
    D.module.forEach(function (m) {
      m.lektionen.forEach(function (l) {
        gesamt += l.karteikarten.length + l.quiz.length;
        erledigt += (S.karten[l.id + '-__'] ? 0 : 0);
      });
    });
    // Fortschritt = Anteil der beantworteten Quizfragen + Karten
    var fragenGesamt = 0, fragenBeantwortet = 0;
    D.module.forEach(function (m) {
      m.lektionen.forEach(function (l) {
        l.quiz.forEach(function (q) {
          fragenGesamt++;
          if (S.karten[q.id] && S.karten[q.id].gesehen > 0) fragenBeantwortet++;
        });
        l.karteikarten.forEach(function (k) {
          fragenGesamt++;
          if (S.karten[k.id] && S.karten[k.id].gesehen > 0) fragenBeantwortet++;
        });
      });
    });
    var pct = fragenGesamt ? Math.round(fragenBeantwortet / fragenGesamt * 100) : 0;
    el('progBar').style.width = pct + '%';
    el('progPct').textContent = pct + ' %';
    el('progLbl').textContent = fragenBeantwortet + ' von ' + fragenGesamt + ' Elementen';
    el('brandSub').textContent = 'Level ' + S.level + ' · ' + lvl.name;
  }

  /* ---------------- Navigation ---------------- */
  var ANSICHT = 'start';
  var aktModul = 'm1';
  var aktLektion = null;
  var quizLauf = null;

  function zeichneNav() {
    var wd = faelligeKarten().length;
    var html =
      '<button data-nav="start" class="' + (ANSICHT === 'start' ? 'on' : '') + '">' + ic('start', 20) + 'Start</button>' +
      '<button data-nav="module" class="' + (ANSICHT === 'module' ? 'on' : '') + '">' + ic('module', 20) + 'Module</button>' +
      '<button data-nav="wd" class="' + (ANSICHT === 'wd' ? 'on' : '') + '">' + ic('wiederholung', 20) + 'Wiederholung' +
      (wd ? '<span class="badge">' + wd + '</span>' : '') + '</button>' +
      '<button data-nav="abzeichen" class="' + (ANSICHT === 'abzeichen' ? 'on' : '') + '">' + ic('abzeichen', 20) + 'Abzeichen</button>' +
      '<button data-nav="mehr" class="' + (ANSICHT === 'mehr' ? 'on' : '') + '">' + ic('mehr', 20) + 'Mehr</button>';
    el('nav').innerHTML = html;
    Array.prototype.forEach.call(el('nav').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        ANSICHT = b.getAttribute('data-nav');
        aktModul = S.letzteModule || 'm1';
        render();
        window.scrollTo(0, 0);
      });
    });
  }

  /* ---------------- Ansichten ---------------- */
  function render() {
    zeichneKopf();
    zeichneNav();
    var v = el('view');
    if (ANSICHT === 'start') v.innerHTML = viewStart();
    else if (ANSICHT === 'module') v.innerHTML = viewModule();
    else if (ANSICHT === 'lesson') v.innerHTML = viewLektion();
    else if (ANSICHT === 'quiz') v.innerHTML = viewQuiz();
    else if (ANSICHT === 'abschluss') v.innerHTML = viewAbschluss();
    else if (ANSICHT === 'wd') v.innerHTML = viewWiederholung();
    else if (ANSICHT === 'abzeichen') v.innerHTML = viewAbzeichen();
    else if (ANSICHT === 'mehr') v.innerHTML = viewMehr();
    bind();
  }

  /* ---------- Startseite ---------- */
  function viewStart() {
    var lvl = levelInfo(S.level);
    var naechste = levelInfo(Math.min(D.levels.length, S.level + 1));
    var faellig = faelligeKarten().length;

    var html = '<div class="hero">' +
      '<div class="lvl-badge">Level ' + lvl.nr + ' · ' + esc(lvl.name) + '</div>' +
      '<h1>Willkommen zurück' + (S.stats.antworten ? '' : '!') + '</h1>' +
      '<p>' + esc(lvl.beschreibung) + '</p>' +
      '</div>';

    html += '<div class="grid2" style="margin-bottom:14px">' +
      '<div class="kpi"><b style="color:var(--brand)">' + S.punkte + '</b><span>Punkte</span></div>' +
      '<div class="kpi"><b style="color:var(--orange)">' + S.streak + '</b><span>Tagesstreak</span></div>' +
      '<div class="kpi"><b style="color:var(--purple)">×' + multiplikator().toFixed(1).replace('.0', '') + '</b><span>Serie</span></div>' +
      '<div class="kpi"><b style="color:var(--green)">' + S.abzeichen.length + '/' + D.abzeichen.length + '</b><span>Abzeichen</span></div>' +
      '</div>';

    html += '<div class="panel tight"><h3 class="sub">Weiter zum Level „' + esc(naechste.name) + '“</h3>' +
      '<p class="tiny" style="margin-bottom:9px">Jedes bestandene Abschlussquiz (mindestens 80 %) schaltet das nächste Modul frei und hebt dein Level.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn pri" data-act="weiter">Weiterlernen</button>' +
      '<button class="btn" data-act="abschluss-m1">Abschlussquiz Modul 1</button>' +
      '</div></div>';

    // Fortschrittskarte je Modul
    html += '<h2 class="sec">Deine Module</h2>';
    D.module.forEach(function (m) {
      var frei = modulFrei(m);
      var best = modulBestanden(m.id);
      var z = S.moduleQuiz[m.id];
      var total = 0, fertig = 0;
      m.lektionen.forEach(function (l) {
        l.karteikarten.forEach(function (k) {
          total++; if (S.karten[k.id] && S.karten[k.id].gesehen > 0) fertig++;
        });
        l.quiz.forEach(function (q) {
          total++; if (S.karten[q.id] && S.karten[q.id].gesehen > 0) fertig++;
        });
      });
      var pct = total ? Math.round(fertig / total * 100) : 0;
      html += '<div class="mod' + (frei ? '' : ' locked') + '">' +
        '<div class="mod-h"><div class="mod-n">' + m.nr + '</div>' +
        '<div class="mod-t"><b>' + esc(m.titel) + '</b><span>' + esc(m.untertitel) + '</span></div>' +
        '<div class="mod-lock">' + (frei ? (best ? ic('schild', 16) : ic('schlossOffen', 16)) : ic('schloss', 16)) + '</div></div>' +
        '<div class="bar' + (best ? ' done' : '') + '"><i style="width:' + pct + '%"></i></div>' +
        '<div class="mod-meta">' +
        '<span><b>' + m.lektionen.length + '</b> Lektionen</span>' +
        '<span><b>' + fertig + '/' + total + '</b> Elemente</span>' +
        '<span>Quiz: <b>' + (z ? z.prozent + ' %' : 'offen') + '</b></span>' +
        (best ? '<span style="color:var(--green)">bestanden</span>' : '') +
        '</div>';
      if (frei) {
        html += '<div style="display:flex;gap:8px;margin-top:11px;flex-wrap:wrap">' +
          '<button class="btn sm pri" data-mod="' + m.id + '">Öffnen</button>' +
          '<button class="btn sm" data-act="abschluss-' + m.id + '">Abschlussquiz</button>' +
          '</div>';
      } else {
        html += '<div class="tiny" style="margin-top:9px">Gesperrt – schliesse das Abschlussquiz von Modul ' + (m.nr - 1) + ' ab.</div>';
      }
      html += '</div>';
    });

    // Wiederholungshinweis
    if (faellig) {
      html += '<div class="panel" style="border-color:rgba(223,178,157,.35);background:#1C2024">' +
        '<h3 class="sub" style="color:var(--orange)">' + ic('wiederholung', 15) + ' ' + faellig + ' Karte(n) zur Wiederholung fällig</h3>' +
        '<p class="tiny" style="margin-bottom:10px">Falsch beantwortete Karten kommen nach 1, 3 und 7 Tagen erneut, sicher beantwortete deutlich seltener.</p>' +
        '<button class="btn sm" data-nav2="wd">Zur Wiederholung</button></div>';
    }

    // Abzeichen
    html += '<h2 class="sec">Abzeichen</h2><div class="az">';
    D.abzeichen.forEach(function (a) {
      var got = S.abzeichen.indexOf(a.id) !== -1;
      html += '<div class="az-item' + (got ? ' got' : '') + '"><span class="sym">' +
        ic('abz-' + a.id, 22) + '</span>' +
        '<span class="nm">' + esc(a.name) + '</span>' +
        (got ? '' : '<span class="lock">' + ic('schloss', 12) + '</span>') + '</div>';
    });
    html += '</div>';

    // Verlauf
    if (S.verlauf.length) {
      html += '<h2 class="sec">Verlauf</h2><div class="panel tight"><div class="log">';
      S.verlauf.slice(0, 12).forEach(function (e) {
        var zeit = new Date(e.zeit);
        html += '<div class="log-row"><span class="log-dot ' + esc(e.typ) + '"></span>' +
          '<span>' + esc(e.text) + '</span>' +
          '<span class="log-t">' + pad(zeit.getHours()) + ':' + pad(zeit.getMinutes()) + '</span></div>';
      });
      html += '</div></div>';
    }
    return html;
  }

  /* ---------- Modulübersicht ---------- */
  function viewModule() {
    var m = modulVon(aktModul);
    if (!m) { aktModul = 'm1'; m = modulVon('m1'); }
    S.letzteModule = aktModul;
    var frei = modulFrei(m);
    var best = modulBestanden(m.id);
    var z = S.moduleQuiz[m.id];

    var html = '<button class="back" data-nav2="start">‹ Zur Startseite</button>';
    html += '<div class="lesson-h"><h1>Modul ' + m.nr + ' · ' + esc(m.titel) + '</h1>' +
      '<p class="muted" style="font-size:.85rem">' + esc(m.untertitel) + '</p></div>';

    if (!frei) {
      html += '<div class="panel" style="border-color:rgba(201,112,95,.35);background:#1C2024">' +
        '<h3 class="sub" style="color:var(--red)">' + ic('schloss', 15) + ' Dieses Modul ist noch gesperrt</h3>' +
        '<p class="tiny">Schliesse zuerst das Abschlussquiz von Modul ' + (m.nr - 1) + ' mit mindestens 80 % ab. ' +
        'Dann wird dieses Modul automatisch freigeschaltet und dein Level steigt.</p></div>';
      return html;
    }

    // Modul-Abschluss
    html += '<div class="panel' + (best ? '' : ' tight') + '">' +
      '<div style="display:flex;align-items:center;gap:11px;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:180px">' +
      '<h3 class="sub" style="margin-bottom:3px">' + (best ? ic('schild', 15) : ic('ziel', 15)) + ' ' + esc(m.abschlussQuiz.titel) + '</h3>' +
      '<p class="tiny">10 gemischte Fragen · bestanden ab ' + m.abschlussQuiz.bestandenAb + ' % · Belohnung ' + m.abschlussQuiz.bonusPunkte + ' Punkte</p>' +
      (z ? '<p class="tiny" style="color:' + (best ? 'var(--green)' : 'var(--red)') + ';margin-top:4px">Letzter Versuch: ' + z.prozent + ' % (' + z.richtig + '/' + z.gesamt + ')</p>' : '') +
      '</div>' +
      '<button class="btn pri" data-act="abschluss-' + m.id + '">' + (z ? 'Wiederholen' : 'Starten') + '</button>' +
      '</div></div>';

    // Lektionen
    html += '<h2 class="sec">Lektionen</h2>';
    m.lektionen.forEach(function (l, i) {
      var kz = l.karteikarten.filter(function (k) {
        return S.karten[k.id] && S.karten[k.id].gesehen > 0;
      }).length;
      var qz = l.quiz.filter(function (q) {
        return S.karten[q.id] && S.karten[q.id].gesehen > 0;
      }).length;
      var total = l.karteikarten.length + l.quiz.length;
      var fertig = kz + qz;
      var pct = Math.round(fertig / total * 100);
      html += '<div class="mod"><div class="mod-h">' +
        '<div class="mod-n">' + (i + 1) + '</div>' +
        '<div class="mod-t"><b>' + esc(l.titel) + '</b><span>' + l.karteikarten.length + ' Karteikarten · ' + l.quiz.length + ' Quizfragen</span></div>' +
        '</div>' +
        '<div class="bar' + (pct === 100 ? ' done' : '') + '"><i style="width:' + pct + '%"></i></div>' +
        '<div class="mod-meta"><span><b>' + fertig + '/' + total + '</b> erledigt</span>' +
        (pct === 100 ? '<span style="color:var(--green)">abgeschlossen</span>' : '') + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:11px;flex-wrap:wrap">' +
        '<button class="btn sm pri" data-lektion="' + l.id + '">Lektion öffnen</button>' +
        '<button class="btn sm" data-quiz="' + l.id + '">Quiz</button>' +
        '</div></div>';
    });
    return html;
  }

  /* ---------- Lektion ---------- */
  function viewLektion() {
    var e = lektionVon(aktLektion);
    if (!e) { ANSICHT = 'module'; return viewModule(); }
    var l = e.lektion, m = e.modul;

    var html = '<button class="back" data-nav2="module">‹ Modul ' + m.nr + '</button>';
    html += '<div class="lesson-h"><h1>' + esc(l.titel) + '</h1>' + quelleZeile(l.datei, l.abschnitt) + '</div>';

    // Zusammenfassung
    html += '<div class="panel"><h2 class="sec" style="margin-top:0">Zusammenfassung</h2><ul class="sum">';
    l.zusammenfassung.forEach(function (s) {
      html += '<li>' + esc(s.satz) + '</li>';
    });
    html += '</ul>';
    html += '</div>';

    // Karteikarten
    html += '<h2 class="sec">Karteikarten</h2><div class="karten">';
    l.karteikarten.forEach(function (k, i) {
      var zs = S.karten[k.id];
      html += '<div class="karte">' +
        '<div class="karte-q"><span class="karte-n">' + (i + 1) + '</span><span>' + esc(k.frage) + '</span></div>' +
        '<div class="karte-a">' + esc(k.antwort) + '</div>' +
        '<div class="karte-f"><span class="diff">Schwierigkeit <b>' + schwierigkeitPunkte(k.schwierigkeit) + '</b></span>' +
        '<span class="diff">· ' + D.punkte.karte + ' Punkte</span>' +
        (zs && zs.gesehen ? '<span class="diff" style="color:var(--green)">· ' + zs.gesehen + '× geübt</span>' : '') +
        '</div></div>';
    });
    html += '</div>';

    // Quiz
    html += '<h2 class="sec">Quiz zu dieser Lektion</h2>';
    html += '<div class="panel tight"><p class="tiny" style="margin-bottom:11px">' + l.quiz.length +
      ' Fragen · Punkte nach Schwierigkeit: 10 / 15 / 25 · Multiplikator bei Serie.</p>' +
      '<button class="btn pri wide" data-quiz="' + l.id + '">Quiz starten</button></div>';

    // Quizfragen als Vorschau
    html += '<div class="panel"><h3 class="sub">Fragen im Überblick</h3>';
    l.quiz.forEach(function (q, i) {
      html += '<div class="log-row"><span class="log-dot"></span>' +
        '<span><b>Frage ' + (i + 1) + '.</b> ' + esc(q.frage) + '</span>' +
        '<span class="log-t">' + schwierigkeitPunkte(q.schwierigkeit) + '</span></div>';
    });
    html += '</div>';

    html += '<div style="height:14px"></div>';
    return html;
  }

  /* ---------- Quiz (Lektion) ---------- */
  function viewQuiz() {
    if (!quizLauf) { ANSICHT = 'module'; return viewModule(); }
    var q = quizLauf;
    var frage = q.fragen[q.index];
    var html = '';

    if (q.beendet) {
      var r = q.richtig / q.fragen.length * 100;
      return quizErgebnis(q, r);
    }

    html += '<button class="back" data-act="quiz-abbrechen">‹ Abbrechen</button>';
    html += '<div class="quiz-top">' +
      '<span class="quiz-pos">Frage ' + (q.index + 1) + ' / ' + q.fragen.length + '</span>' +
      '<span class="streak-chip' + (multiplikator() > 1 ? ' hot' : '') + '">' + ic('flamme', 14) + ' Serie ' + S.serie +
      ' · ×' + multiplikator().toFixed(1).replace('.0', '') + '</span></div>';

    html += '<div class="panel">' +
      '<div class="q-text">' + esc(frage.frage) + '</div>' +
      '<div class="opts">';
    frage.optionen.forEach(function (o, i) {
      var cls = '';
      if (q.antwort !== null) {
        if (i === frage.richtig) cls = ' right';
        else if (i === q.antwort) cls = ' wrong';
        else cls = ' dim';
      }
      html += '<button class="opt' + cls + '" data-opt="' + i + '"' + (q.antwort !== null ? ' disabled' : '') + '>' +
        '<span class="opt-k">' + 'ABCD'.charAt(i) + '</span><span>' + esc(o) + '</span></button>';
    });
    html += '</div>';

    if (q.antwort !== null) {
      var richtig = q.antwort === frage.richtig;
      html += '<div class="fb ' + (richtig ? 'ok' : 'no') + '">' +
        '<div class="fb-h">' + ic(richtig ? 'check' : 'cross', 16) +
        (richtig ? 'Richtig' : 'Nicht ganz') +
        '<span class="fb-pts">' + (richtig ? '+' + q.punkte + ' Punkte' : '0 Punkte') + '</span></div>' +
        '<div class="fb-body">' + (richtig
          ? 'Genau richtig. ' + esc(frage.begruendung)
          : '<b>Richtig wäre:</b> ' + esc(frage.optionen[frage.richtig]) + '<br>' + esc(frage.begruendung)) +
        '</div>' +
        '<div class="fb-src">' + ic('datei', 12) + ' ' + quelleLink(frage.quelle) + (frage.abschnitt ? ' · ' + esc(frage.abschnitt) : '') + '</div>' +
        '</div>';
      html += '<button class="btn pri wide" style="margin-top:12px" data-act="quiz-weiter">' +
        (q.index + 1 >= q.fragen.length ? 'Ergebnis ansehen' : 'Nächste Frage') + '</button>';
    }
    html += '</div>';
    return html;
  }

  /* ---------- Quiz-Ergebnis ---------- */
  function quizErgebnis(q, prozent) {
    var html = '<button class="back" data-nav2="module">‹ Zurück</button>';
    html += '<div class="panel result ' + (prozent >= 80 ? 'pass' : 'fail') + '">' +
      '<div class="big">' + Math.round(prozent) + ' %</div>' +
      '<p style="font-size:.88rem;color:var(--muted)">' + q.richtig + ' von ' + q.fragen.length + ' Fragen richtig</p>' +
      '<p style="font-size:.82rem;margin-top:5px">' +
      (prozent >= 80 ? ic('check', 15) + ' Bestanden – dieses Modul ist abgeschlossen.' : ic('cross', 15) + ' Noch nicht bestanden. Ab 80 % klappt es.') + '</p>' +
      '</div>';
    if (q.punkte > 0) {
      html += '<div class="panel tight" style="text-align:center"><p class="tiny">Gesammelte Punkte</p>' +
        '<div style="font-size:1.8rem;font-weight:800;color:var(--brand);font-family:var(--mono)">+' + q.punkte + '</div></div>';
    }
    html += '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
      '<button class="btn pri" data-act="quiz-nochmal">Nochmal versuchen</button>' +
      '<button class="btn" data-nav2="module">Zurück zum Modul</button>' +
      '</div>';
    return html;
  }

  /* ---------- Abschlussquiz ---------- */
  function viewAbschluss() {
    if (!quizLauf) { ANSICHT = 'start'; return viewStart(); }
    var q = quizLauf;
    var m = modulVon(q.modulId);
    if (!q.beendet) {
      var frage = q.fragen[q.index];
      var html = '<button class="back" data-act="quiz-abbrechen">‹ Abbrechen</button>';
      html += '<div class="quiz-head">' +
        '<h2>' + esc(m.abschlussQuiz.titel) + '</h2>' +
        '<p class="tiny">Frage ' + (q.index + 1) + ' von ' + q.fragen.length + ' · bestanden ab ' + m.abschlussQuiz.bestandenAb + ' %</p></div>';
      html += '<div class="panel"><div class="q-text">' + esc(frage.frage) + '</div><div class="opts">';
      frage.optionen.forEach(function (o, i) {
        var cls = '';
        if (q.antwort !== null) {
          if (i === frage.richtig) cls = ' right';
          else if (i === q.antwort) cls = ' wrong';
          else cls = ' dim';
        }
        html += '<button class="opt' + cls + '" data-opt="' + i + '"' + (q.antwort !== null ? ' disabled' : '') + '>' +
          '<span class="opt-k">' + 'ABCD'.charAt(i) + '</span><span>' + esc(o) + '</span></button>';
      });
      html += '</div>';
      if (q.antwort !== null) {
        var richtig = q.antwort === frage.richtig;
        html += '<div class="fb ' + (richtig ? 'ok' : 'no') + '">' +
          '<div class="fb-h">' + ic(richtig ? 'check' : 'cross', 16) +
          (richtig ? 'Richtig' : 'Nicht ganz') +
          '<span class="fb-pts">' + (richtig ? '+' + q.punkte + ' Punkte' : '0 Punkte') + '</span></div>' +
          '<div class="fb-body">' + (richtig
            ? esc(frage.begruendung)
            : '<b>Richtig wäre:</b> ' + esc(frage.optionen[frage.richtig]) + '<br>' + esc(frage.begruendung)) +
          '</div>' +
          '<div class="fb-src">' + ic('datei', 12) + ' ' + quelleLink(frage.quelle) + (frage.abschnitt ? ' · ' + esc(frage.abschnitt) : '') + '</div></div>' +
          '<button class="btn pri wide" style="margin-top:12px" data-act="quiz-weiter">' +
          (q.index + 1 >= q.fragen.length ? 'Ergebnis ansehen' : 'Nächste Frage') + '</button>';
      }
      html += '</div>';
      return html;
    }

    // Ergebnis
    var prozent = q.richtig / q.fragen.length * 100;
    var bestanden = prozent >= m.abschlussQuiz.bestandenAb;
    var html2 = '<button class="back" data-nav2="module">‹ Zurück zum Modul</button>';
    html2 += '<div class="panel result ' + (bestanden ? 'pass' : 'fail') + '">' +
      '<div class="big">' + Math.round(prozent) + ' %</div>' +
      '<p style="font-size:.88rem;color:var(--muted)">' + q.richtig + ' von ' + q.fragen.length + ' richtig · ' + esc(m.abschlussQuiz.titel) + '</p>' +
      '<p style="font-size:.85rem;margin-top:7px">' + (bestanden
        ? ic('check', 15) + ' Bestanden! Du hast ' + m.abschlussQuiz.bonusPunkte + ' Bonuspunkte erhalten.'
        : ic('cross', 15) + ' Nicht bestanden – ab ' + m.abschlussQuiz.bestandenAb + ' % klappt es. Schau dir die Begründungen an und versuch es nochmal.') + '</p></div>';
    if (bestanden) {
      html2 += '<div class="panel tight"><div class="grid2">' +
        '<div class="kpi"><b style="color:var(--brand)">+' + m.abschlussQuiz.bonusPunkte + '</b><span>Bonuspunkte</span></div>' +
        '<div class="kpi"><b style="color:var(--blue)">Level ' + S.level + '</b><span>' + esc(levelInfo(S.level).name) + '</span></div>' +
        '</div></div>';
    }
    html2 += '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
      '<button class="btn pri" data-act="quiz-nochmal">Nochmal versuchen</button>' +
      '<button class="btn" data-nav2="start">Zur Startseite</button></div>';
    return html2;
  }

  /* ---------- Wiederholung ---------- */
  function viewWiederholung() {
    var faellig = faelligeKarten();
    var html = '<h2 class="sec" style="margin-top:14px">Wiederholung</h2>';
    html += '<div class="panel tight"><p class="tiny">' +
      'Falsch beantwortete Karten kommen nach <b>1, 3 und 7 Tagen</b> erneut. Sicher beantwortete Karten erst nach <b>14, 30 und 60 Tagen</b>. ' +
      'So bleibt das Gelernte langfristig abrufbar.</p></div>';

    if (!faellig.length) {
      html += '<div class="panel" style="text-align:center;padding:30px 16px">' +
        '<div class="empty-ico">' + ic('check', 40) + '</div>' +
        '<h3 class="sub" style="margin-top:7px">Alles wiederholt</h3>' +
        '<p class="tiny">Derzeit ist keine Karte zur Wiederholung fällig. Schau später wieder vorbei.</p></div>';
      return html;
    }

    html += '<p class="tiny" style="margin-bottom:11px">' + faellig.length + ' Karte(n) fällig:</p>';
    faellig.forEach(function (e) {
      var k = S.karten[e.karte.id];
      var stufe = k ? (k.falschStufe || 0) : 0;
      var tage = k ? tageAb(k.faellig) : 0;
      var dringend = k && k.falschStufe >= 2;
      html += '<div class="wd"><div class="wd-d"><b>' + (k ? Math.max(0, tage) : 0) + '</b><span>Tage</span></div>' +
        '<div class="wd-q">' + esc(e.karte.frage) +
        '<div class="tiny" style="margin-top:3px">' + esc(e.lektion.titel) + '</div></div>' +
        (dringend ? '<span class="wd-count">×' + stufe + '</span>' : '') +
        '<button class="btn sm" data-wd="' + esc(e.karte.id) + '">Prüfen</button></div>';
    });
    return html;
  }

  /* ---------- Abzeichen ---------- */
  function viewAbzeichen() {
    var html = '<h2 class="sec" style="margin-top:14px">Abzeichen</h2>';
    html += '<div class="panel tight"><p class="tiny">Du hast <b>' + S.abzeichen.length + ' von ' + D.abzeichen.length +
      '</b> Abzeichen gesammelt. Jedes Abzeichen wird automatisch vergeben, sobald du die Bedingung erfüllst.</p></div>';
    html += '<div class="az" style="grid-template-columns:repeat(auto-fill,minmax(104px,1fr))">';
    D.abzeichen.forEach(function (a) {
      var got = S.abzeichen.indexOf(a.id) !== -1;
      html += '<div class="az-item' + (got ? ' got' : '') + '" title="' + esc(a.beschreibung) + '">' +
        '<span class="sym">' + ic('abz-' + a.id, 22) + '</span><span class="nm">' + esc(a.name) + '</span>' +
        (got ? '' : '<span class="lock">' + ic('schloss', 12) + '</span>') + '</div>';
    });
    html += '</div>';
    html += '<h2 class="sec">Bedingungen</h2><div class="panel tight">';
    D.abzeichen.forEach(function (a) {
      var got = S.abzeichen.indexOf(a.id) !== -1;
      html += '<div class="log-row"><span class="log-dot ' + (got ? 'good' : '') + '"></span>' +
        '<span><b>' + ic(a.icon, 14) + ' ' + esc(a.name) + '</b><br><span class="tiny">' + esc(a.beschreibung) + '</span></span>' +
        '<span class="log-t">' + (got ? 'erhalten' : 'offen') + '</span></div>';
    });
    html += '</div>';
    return html;
  }

  /* ---------- Mehr / Einstellungen ---------- */
  function viewMehr() {
    var html = '<h2 class="sec" style="margin-top:14px">Lernstand & Einstellungen</h2>';
    html += '<div class="panel"><h3 class="sub">Dein Fortschritt</h3>' +
      '<div class="grid2">' +
      '<div class="kpi"><b>' + S.punkte + '</b><span>Punkte</span></div>' +
      '<div class="kpi"><b>' + S.stats.korrekt + '</b><span>Richtige Antworten</span></div>' +
      '<div class="kpi"><b>' + S.streak + '</b><span>Aktueller Streak</span></div>' +
      '<div class="kpi"><b>' + S.bestStreak + '</b><span>Bester Streak</span></div>' +
      '<div class="kpi"><b>' + S.bestSerie + '</b><span>Beste Serie</span></div>' +
      '<div class="kpi"><b>' + S.stats.kartenGesehen + '</b><span>Karten geübt</span></div>' +
      '</div></div>';

    html += '<div class="panel"><h3 class="sub">Sichern & Wiederherstellen</h3>' +
      '<p class="tiny" style="margin-bottom:11px">Dein Lernstand liegt ausschliesslich in diesem Browser (localStorage). ' +
      'Mit diesen Knöpfen kannst du ihn als JSON-Datei sichern und später wieder einspielen - etwa auf einem anderen Gerät.</p>' +
      '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
      '<button class="btn pri" data-act="export">' + ic('speichern', 16) + ' Als JSON sichern</button>' +
      '<button class="btn" data-act="import">' + ic('laden', 16) + ' JSON einspielen</button>' +
      '</div>' +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '</div>';

    html += '<div class="panel"><h3 class="sub">Zurücksetzen</h3>' +
      '<p class="tiny" style="margin-bottom:11px">Setzt Punkte, Level, Streak, Abzeichen und alle Wiederholungstermine zurück. ' +
      'Die Lerninhalte bleiben erhalten.</p>' +
      '<button class="btn danger" data-act="reset">' + ic('kreuz', 16) + ' Alles zurücksetzen</button></div>';

    html += '<div class="panel"><h3 class="sub">Über diese App</h3>' +
      '<p class="tiny">' + esc(D.hinweis) + '</p>' +
      '<p class="tiny" style="margin-top:9px">Diese App läuft vollständig offline: keine externen Bibliotheken, keine Serververbindung, ' +
      'keine Netzwerkzugriffe. Alle Daten bleiben auf deinem Gerät.</p></div>';
    return html;
  }

  /* ---------- Dialog & Toast ---------- */
  function dialog(titel, inhalt, knoepfe) {
    var html = '<h3>' + esc(titel) + '</h3><p>' + inhalt + '</p><div class="dlg-btns">';
    knoepfe.forEach(function (k, i) {
      html += '<button class="btn ' + (k.klasse || '') + '" data-dlg="' + i + '">' + esc(k.text) + '</button>';
    });
    html += '</div>';
    el('dlg').innerHTML = html;
    el('dlgBg').classList.add('on');
    Array.prototype.forEach.call(el('dlg').querySelectorAll('[data-dlg]'), function (b) {
      b.addEventListener('click', function () {
        var k = knoepfe[+b.getAttribute('data-dlg')];
        el('dlgBg').classList.remove('on');
        if (k.aktion) k.aktion();
      });
    });
  }
  function toast(text, gut) {
    var t = el('toast');
    t.textContent = text;
    t.className = 'toast on' + (gut ? ' gold' : '');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  /* ---------- Quiz-Steuerung ---------- */
  function quizStarten(fragen, modulId, bonusPunkte) {
    quizLauf = {
      fragen: fragen, index: 0, antwort: null, richtig: 0, punkte: 0,
      punkteFrage: 0, modulId: modulId || null, bonusPunkte: bonusPunkte || 0,
      beendet: false, perfekt: true
    };
    ANSICHT = modulId ? 'abschluss' : 'quiz';
    render();
    window.scrollTo(0, 0);
  }
  function antwortWaehlen(i) {
    if (!quizLauf || quizLauf.antwort !== null) return;
    var q = quizLauf;
    var frage = q.fragen[q.index];
    var richtig = i === frage.richtig;
    q.antwort = i;

    S.stats.antworten++;
    if (richtig) {
      S.stats.korrekt++;
      q.richtig++;
      S.serie++;
      if (S.serie > S.bestSerie) S.bestSerie = S.serie;
      var p = punkteFuer('quiz', frage.schwierigkeit);
      q.punkte += p;
      q.punkteFrage = p;
      S.punkte += p;
    } else {
      S.serie = 0;
      q.perfekt = false;
      q.punkteFrage = 0;
    }
    // Wiederholungsplan aktualisieren
    karteUpdate(frage.id, richtig);

    var st = streakPruefen();
    var neue = abzeichenPruefen();
    if (richtig && S.serie >= 3) toast('Serie ' + S.serie + ' · ×' + multiplikator().toFixed(1).replace('.0', ''), true);
    if (st && st.reset) toast('Streak zurückgesetzt – ' + st.vorher + ' Tage am Stück', false);
    neue.forEach(function (id) {
      var a = abzeichenVon(id);
      if (a) toast('Abzeichen erhalten: ' + a.name, true);
    });
    speichern();
    render();
  }
  function quizWeiter() {
    if (!quizLauf) return;
    var q = quizLauf;
    if (q.index + 1 >= q.fragen.length) {
      q.beendet = true;
      if (q.modulId) abschlussAuswerten(q);
      speichern();
      render();
      window.scrollTo(0, 0);
      return;
    }
    q.index++;
    q.antwort = null;
    q.punkteFrage = 0;
    render();
  }
  function abschlussAuswerten(q) {
    var m = modulVon(q.modulId);
    var prozent = Math.round(q.richtig / q.fragen.length * 100);
    var bestanden = prozent >= m.abschlussQuiz.bestandenAb;
    var alt = S.moduleQuiz[q.modulId];
    S.moduleQuiz[q.modulId] = {
      prozent: prozent, richtig: q.richtig, gesamt: q.fragen.length,
      bestanden: bestanden || !!(alt && alt.bestanden),
      punkte: q.punkte
    };
    if (bestanden) {
      if (!alt || !alt.bestanden) {
        S.punkte += m.abschlussQuiz.bonusPunkte;
        q.punkte += m.abschlussQuiz.bonusPunkte;
        protokoll('Modul ' + m.nr + ' abgeschlossen (' + prozent + ' %) – +' + m.abschlussQuiz.bonusPunkte + ' Punkte', 'gold');
        var neu = levelBerechnen();
        if (neu > S.level) {
          S.punkte += D.punkte.levelAufstieg;
          S.level = neu;
          protokoll('Level ' + neu + ' erreicht: ' + levelInfo(neu).name, 'gold');
        }
      }
    } else {
      protokoll('Abschlussquiz Modul ' + m.nr + ': ' + prozent + ' % – nicht bestanden', 'bad');
    }
    if (q.perfekt) {
      S.stats.perfekt++;
      protokoll('Fehlerfreies Quiz: 10/10', 'good');
    }
    abzeichenPruefen();
  }

  /* ---------- Wiederholung prüfen ---------- */
  function wdPruefen(kartenId) {
    var gef = null;
    alleKarten().forEach(function (e) { if (e.karte.id === kartenId) gef = e; });
    if (!gef) return;
    var k = gef.karte;
    var zs = S.karten[k.id] || { falschStufe: 0, richtigStufe: 0 };
    var richtig = zs.gesehen > 0 && zs.letzteRichtig;
    dialog('Karte prüfen',
      '<b>' + esc(k.frage) + '</b><br><br><span class="muted">' + esc(k.antwort) + '</span>' +
      '<br><span class="tiny">Quelle: ' + quelleLink(k.quelle) + '</span>',
      [
        { text: 'Nicht gewusst', klasse: 'danger', aktion: function () { wdVerbuchen(k, false); } },
        { text: 'Gewusst', klasse: 'pri', aktion: function () { wdVerbuchen(k, true); } }
      ]);
  }
  function wdVerbuchen(k, richtig) {
    var kz = karteZustand(k.id);
    kz.letzteRichtig = richtig;
    karteUpdate(k.id, richtig);
    S.stats.antworten++;
    if (richtig) {
      S.stats.korrekt++;
      S.serie++;
      if (S.serie > S.bestSerie) S.bestSerie = S.serie;
      var p = punkteFuer('karte', k.schwierigkeit);
      S.punkte += p;
    } else {
      S.serie = 0;
    }
    streakPruefen();
    abzeichenPruefen();
    speichern();
    render();
    toast(richtig ? 'Richtig · +' + punkteFuer('karte', k.schwierigkeit) + ' Punkte' : 'Kommt später wieder');
  }

  /* ---------- Backup ---------- */
  function exportieren() {
    var daten = JSON.stringify(S, null, 2);
    var blob = new Blob([daten], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'lernstand-claude-code-' + heute() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Lernstand gesichert', true);
  }
  function importieren() {
    var f = el('importFile');
    if (!f) return;
    f.click();
  }
  function importVerarbeiten(datei) {
    var leser = new FileReader();
    leser.onload = function (ev) {
      try {
        var p = JSON.parse(ev.target.result);
        if (!p || typeof p !== 'object' || typeof p.punkte !== 'number') {
          throw new Error('Format');
        }
        dialog('Lernstand einspielen?',
          'Der aktuelle Lernstand wird durch die Datei <b>' + esc(datei.name) + '</b> ersetzt. ' +
          'Punkte, Level, Streak, Abzeichen und alle Wiederholungstermine werden übernommen.',
          [
            { text: 'Abbrechen', klasse: 'ghost' },
            {
              text: 'Ersetzen', klasse: 'pri', aktion: function () {
                S = Object.assign(leererZustand(), p);
                S.stats = Object.assign(leererZustand().stats, p.stats || {});
                speichern();
                render();
                toast('Lernstand eingespielt', true);
              }
            }
          ]);
      } catch (err) {
        toast('Datei konnte nicht gelesen werden', false);
      }
    };
    leser.readAsText(datei);
  }

  /* ---------- Ereignisse ---------- */
  function bind() {
    var v = el('view');

    // Buttons mit data-act
    Array.prototype.forEach.call(v.querySelectorAll('[data-act]'), function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'weiter') {
          var frei = D.module.filter(modulFrei);
          var ziel = frei.length ? frei[frei.length - 1] : D.module[0];
          aktModul = ziel.id;
          ANSICHT = 'module';
          render(); window.scrollTo(0, 0);
        } else if (a.indexOf('abschluss-') === 0) {
          var id = a.replace('abschluss-', '');
          startAbschluss(id);
        } else if (a === 'export') {
          exportieren();
        } else if (a === 'import') {
          importieren();
        } else if (a === 'reset') {
          dialog('Wirklich alles zurücksetzen?',
            'Punkte, Level, Streak, Abzeichen und alle Wiederholungstermine werden gelöscht. ' +
            'Die Lerninhalte selbst bleiben erhalten. Dieser Schritt kann nicht rückgängig gemacht werden.',
            [
              { text: 'Abbrechen', klasse: 'ghost' },
              {
                text: 'Zurücksetzen', klasse: 'danger', aktion: function () {
                  S = leererZustand();
                  speichern(); render();
                  toast('Lernstand zurückgesetzt');
                }
              }
            ]);
        } else if (a === 'quiz-weiter') {
          quizWeiter();
        } else if (a === 'quiz-nochmal') {
          if (quizLauf && quizLauf.modulId) startAbschluss(quizLauf.modulId);
          else if (quizLauf) startLektionsQuiz(quizLauf.quelleId);
        } else if (a === 'quiz-abbrechen') {
          quizLauf = null;
          ANSICHT = aktLektion ? 'lesson' : 'module';
          render();
        }
      });
    });

    // Navigation innerhalb der Ansicht
    Array.prototype.forEach.call(v.querySelectorAll('[data-nav2]'), function (b) {
      b.addEventListener('click', function () {
        ANSICHT = b.getAttribute('data-nav2');
        if (ANSICHT === 'module' && aktLektion) {
          var e = lektionVon(aktLektion);
          if (e) aktModul = e.modul.id;
        }
        render(); window.scrollTo(0, 0);
      });
    });

    // Module öffnen
    Array.prototype.forEach.call(v.querySelectorAll('[data-mod]'), function (b) {
      b.addEventListener('click', function () {
        aktModul = b.getAttribute('data-mod');
        S.letzteModule = aktModul;
        ANSICHT = 'module';
        render(); window.scrollTo(0, 0);
      });
    });

    // Lektion öffnen
    Array.prototype.forEach.call(v.querySelectorAll('[data-lektion]'), function (b) {
      b.addEventListener('click', function () {
        aktLektion = b.getAttribute('data-lektion');
        ANSICHT = 'lesson';
        render(); window.scrollTo(0, 0);
      });
    });

    // Quiz starten
    Array.prototype.forEach.call(v.querySelectorAll('[data-quiz]'), function (b) {
      b.addEventListener('click', function () {
        startLektionsQuiz(b.getAttribute('data-quiz'));
      });
    });

    // Antworten
    Array.prototype.forEach.call(v.querySelectorAll('[data-opt]'), function (b) {
      b.addEventListener('click', function () {
        antwortWaehlen(+b.getAttribute('data-opt'));
      });
    });

    // Wiederholung prüfen
    Array.prototype.forEach.call(v.querySelectorAll('[data-wd]'), function (b) {
      b.addEventListener('click', function () {
        wdPruefen(b.getAttribute('data-wd'));
      });
    });

    // Datei-Import
    var f = el('importFile');
    if (f) {
      f.addEventListener('change', function () {
        if (f.files && f.files[0]) importVerarbeiten(f.files[0]);
        f.value = '';
      });
    }
  }

  function startLektionsQuiz(lektionsId) {
    var e = lektionVon(lektionsId);
    if (!e) return;
    var fragen = e.lektion.quiz.map(function (q) {
      return Object.assign({}, q);
    });
    // Fragen mischen, damit die Reihenfolge nicht immer gleich ist
    fragen.sort(function () { return Math.random() - 0.5; });
    quizLauf = {
      fragen: fragen, index: 0, antwort: null, richtig: 0, punkte: 0,
      punkteFrage: 0, modulId: null, bonusPunkte: 0, beendet: false,
      perfekt: true, quelleId: lektionsId
    };
    ANSICHT = 'quiz';
    render(); window.scrollTo(0, 0);
  }

  function startAbschluss(modulId) {
    var m = modulVon(modulId);
    if (!m) return;
    if (!modulFrei(m)) {
      toast('Dieses Modul ist noch gesperrt', false);
      return;
    }
    var fragen = m.abschlussQuiz.fragen.map(function (q) {
      return Object.assign({}, q);
    });
    quizLauf = {
      fragen: fragen, index: 0, antwort: null, richtig: 0, punkte: 0,
      punkteFrage: 0, modulId: modulId, bonusPunkte: m.abschlussQuiz.bonusPunkte,
      beendet: false, perfekt: true, quelleId: null
    };
    ANSICHT = 'abschluss';
    render(); window.scrollTo(0, 0);
  }

  /* ---------- Start ---------- */
  function init() {
    laden();
    S.level = Math.max(S.level, levelBerechnen());
    zeichneKopf();
    zeichneNav();
    render();

    // Tageswechsel erkennen: wenn die App über Nacht offen bleibt
    setInterval(function () {
      var h = heute();
      if (S.lastStudyDate && S.lastStudyDate !== h) {
        var diff = tageAb(S.lastStudyDate);
        if (diff > 1) {
          toast('Dein Streak wurde zurückgesetzt', false);
          render();
        }
      }
    }, 60000);
  }

  // Test-Hook: gibt die internen Funktionen fuer automatisierte Tests frei.
  // Wird nur aktiv, wenn die Seite im Testmodus geladen wird.
  if (typeof window !== 'undefined' && window.__CCM_TEST__) {
    window.__CCM__ = {
      state: function () { return S; },
      setState: function (s) { S = s; speichern(); render(); },
      render: render,
      init: init,
      antwortWaehlen: antwortWaehlen,
      quizWeiter: quizWeiter,
      quizStarten: quizStarten,
      startAbschluss: startAbschluss,
      startLektionsQuiz: startLektionsQuiz,
      karteUpdate: karteUpdate,
      karteZustand: karteZustand,
      multiplikator: multiplikator,
      punkteFuer: punkteFuer,
      streakPruefen: streakPruefen,
      abzeichenPruefen: abzeichenPruefen,
      levelBerechnen: levelBerechnen,
      modulFrei: modulFrei,
      modulBestanden: modulBestanden,
      faelligeKarten: faelligeKarten,
      alleKarten: alleKarten,
      tageAb: tageAb,
      heute: heute,
      plusTage: plusTage,
      leererZustand: leererZustand,
      laden: laden,
      speichern: speichern,
      view: function () { return el('view').innerHTML; },
      setzeAnsicht: function (a) { ANSICHT = a; render(); },
      setzeModul: function (m) { aktModul = m; render(); },
      setzeLektion: function (l) { aktLektion = l; render(); },
      quizLauf: function () { return quizLauf; },
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
