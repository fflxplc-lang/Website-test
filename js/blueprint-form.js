/* The Investment Blueprint Input Form, on the website.

   Nothing here is a form of our own. Every section, field, list, table and
   rule comes from Finowise BOSS (js/blueprint-forms.js, generated from BOSS's
   own client form definitions), and what is filled in is written into the
   same answer sheet BOSS keeps — so when it is sent to the LMS it lands on the
   lead exactly as if the client had filled in BOSS's own page.

     ?goal=single | multiple   -> Goal Based Investment
     ?goal=inspiring           -> Financial Success Ladder (FSL)
     ?goal=sevenevents         -> Comprehensive Freedom Blueprint (7 Events)
     ?goal=goldenage           -> Golden Age Blueprint (GAB)                  */
(function () {
  var DEF = window.BOSS_BLUEPRINT_FORMS;
  var LMS_URL = String(window.FINOWISE_LMS_URL || "").replace(/\/+$/, "");
  var WHATSAPP = "919137654191";
  var GOALS = {
    single: { type: "MULTIGOAL", title: "Single Goal" },
    multiple: { type: "MULTIGOAL", title: "Multiple Goal" },
    inspiring: { type: "FSL", title: "Inspiring Goal" },
    sevenevents: { type: "SEVENEVENTS", title: "Comprehensive Freedom Blueprint (7 Events) Plan" },
    goldenage: { type: "GAB", title: "Golden Age Blueprint" }
  };
  var root = document.getElementById("bpRoot");
  var goalKey = (new URLSearchParams(location.search).get("goal") || "").toLowerCase();
  var goal = GOALS[goalKey];
  if (!root) return;
  if (!goal || !DEF || !DEF.forms[goal.type]) {
    root.innerHTML = '<div class="bp-card"><h2>Choose a goal first</h2><p>Please pick one of the goal cards on the <a href="solutions.html">Solutions</a> page.</p></div>';
    return;
  }
  var F = DEF.forms[goal.type];
  var isSheet = !!F.sheet;
  var R = F.rules || {};
  var DRAFT_KEY = "fw_bp_draft_" + goalKey;
  var state = { basics: {}, sheet: null, consent: false, sending: false, done: null, step: 1, iseq: {}, result: null };
  var IQ = DEF.iseq;

  /* ---------------- small helpers ---------------- */
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function blank(v) { return v === "" || v === null || v === undefined; }
  function getIn(o, path) {
    var parts = String(path).split("."), cur = o;
    for (var i = 0; i < parts.length; i++) { if (cur == null) return undefined; cur = cur[parts[i]]; }
    return cur;
  }
  function setIn(o, path, val) {
    var parts = String(path).split("."), cur = o;
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i], nextNum = /^\d+$/.test(parts[i + 1]);
      if (cur[k] == null || typeof cur[k] !== "object") cur[k] = nextNum ? [] : {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = val;
  }
  function rid(p) { return (p || "SER") + "-" + Math.random().toString(36).slice(2, 7).toUpperCase() + Date.now().toString().slice(-4); }
  function opts(def) {
    if (def.opts) return def.opts;
    if (def.listRef && DEF.lists[def.listRef]) return DEF.lists[def.listRef];
    return [];
  }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function inr(n) { n = Number(n) || 0; return n >= 1e7 ? "₹" + (n / 1e7).toFixed(n % 1e7 ? 2 : 0) + " Cr" : "₹" + n.toLocaleString("en-IN"); }
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ basics: state.basics, sheet: isSheet ? Object.assign({}, state.sheet, { docs: [] }) : state.sheet, iseq: state.iseq, at: Date.now() })); } catch (e) { /* full or private */ }
  }
  function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { return null; } }

  /* ---------------- value <-> input ---------------- */
  // Numbers are kept as numbers, percentages as fractions, as BOSS keeps them.
  function toStore(t, raw) {
    if (raw === "" || raw == null) return "";
    if (t === "num" || t === "number") { var n = Number(raw); return isNaN(n) ? "" : n; }
    if (t === "pct") { var p = Number(raw); return isNaN(p) ? "" : Math.round(p * 100) / 10000; }
    return raw;
  }
  function toShow(t, v) {
    if (blank(v)) return "";
    if (t === "pct") return String(Math.round(Number(v) * 10000) / 100);
    return String(v);
  }
  // One input for one value, by BOSS's field type.
  function inputHtml(path, def, value, extra) {
    var t = def.t, attrs = ' data-path="' + esc(path) + '" data-t="' + esc(t || "text") + '"' + (extra || "");
    var label = def.label || def.l || "";
    if (t === "sel" || t === "code" || t === "select") {
      var list = def._opts || opts(def);
      var has = list.some(function (o) { return String(o[0]) === String(value); });
      return '<select' + attrs + ' aria-label="' + esc(label) + '"><option value=""></option>' +
        (!has && !blank(value) ? '<option value="' + esc(value) + '" selected>' + esc(value) + "</option>" : "") +
        list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") +
        "</select>";
    }
    var type = t === "date" ? "date" : (t === "num" || t === "number" || t === "pct") ? "number" : t === "email" ? "email" : t === "phone" ? "tel" : "text";
    // A text column with a list (7 Events' expense descriptions) suggests from it, as BOSS does, and still takes anything typed.
    if (type === "text" && def.listRef && DEF.lists[def.listRef]) attrs += ' list="bpdl-' + esc(def.listRef.replace(/[^A-Za-z0-9]/g, "_")) + '"';
    return '<input type="' + type + '"' + (type === "number" ? ' step="any"' : "") + attrs + ' aria-label="' + esc(label) + '" value="' + esc(toShow(t, value)) + '"' +
      (def.ph ? ' placeholder="' + esc(def.ph) + '"' : "") + ">";
  }
  function fieldHtml(path, def, value, req) {
    var label = def.label || def.l || "";
    return '<div class="bp-field' + (def.wide || def.span === 2 ? " bp-wide" : "") + '"><label>' + esc(label) + (req ? ' <span class="bp-req">*</span>' : "") + "</label>" +
      inputHtml(path, def, value) + (def.note ? '<div class="bp-help">' + esc(def.note) + "</div>" : "") + "</div>";
  }

  /* ---------------- "Your details" (BOSS's first section) ---------------- */
  var reqBasics = (DEF.requiredBasics || {})[goal.type] || ["me_name", "me_mobile", "me_email", "me_dob"];
  function basicsHtml() {
    return sectionWrap("1", "Your details", "So we know who the plan is for",
      '<div class="bp-grid">' + DEF.basics.map(function (f) {
        var def = { label: f.l, t: f.t === "phone" ? "phone" : f.t, ph: f.ph, note: f.note, listRef: f.listRef };
        if (f.t === "select") def.t = "select";
        return fieldHtml("basics." + f.k, def, state.basics[f.k], reqBasics.indexOf(f.k) >= 0 || f.req);
      }).join("") + "</div>");
  }
  function sectionWrap(n, title, sub, body, id) {
    return '<section class="bp-sec"' + (id ? ' id="' + esc(id) + '"' : "") + '><div class="bp-sec-head"><span class="bp-n">' + esc(n) + "</span><div><h3>" + esc(title) + "</h3>" +
      (sub ? '<p class="bp-sub">' + esc(sub) + "</p>" : "") + "</div></div>" + body + "</section>";
  }

  /* ---------------- workbook sections ---------------- */
  // Fields "Your details" already asked are not asked twice; they are copied in on submit.
  function fromBasicsFields() {
    var out = [];
    (F.sections || []).forEach(function (s) { (s.fields || []).forEach(function (f) { if (f.fromBasics) out.push(f); }); });
    return out;
  }
  function relOptions() {
    var all = DEF.lists["sel:REL"] || [];
    var m = getIn(state.sheet, "basic.marital");
    var allowed = R.maritalRelations && m && R.maritalRelations[m];
    return allowed ? all.filter(function (o) { return allowed.indexOf(o[1]) >= 0 || allowed.indexOf(o[0]) >= 0; }) : all;
  }
  function fieldsSec(sec) {
    var fields = sec.fields.filter(function (f) { return !f.fromBasics; });
    if (!fields.length) return "";
    return '<div class="bp-grid">' + fields.map(function (f) { return fieldHtml("sheet." + f.k, f, getIn(state.sheet, f.k), f.req); }).join("") + "</div>";
  }
  function tableHead(cols, lead) {
    return "<thead><tr><th>#</th>" + (lead ? "<th>" + esc(lead) + "</th>" : "") + cols.map(function (c) { return "<th>" + esc(c.label || c.l) + (c.req ? ' <span class="bp-req">*</span>' : "") + "</th>"; }).join("") + "<th></th></tr></thead>";
  }
  function multiSec(sec) {
    return sec.tables.map(function (t) {
      var rows = getIn(state.sheet, t.path) || [];
      var body = rows.map(function (row, i) {
        var lbl = t.labelled ? "<td>" + ((t.free && (t.freeFrom === undefined || i >= t.freeFrom))
          ? inputHtml("sheet." + t.path + "." + i + ".label", { t: "text", ph: "Describe it" }, row.label)
          : '<span class="bp-lbl">' + esc(row.label || "") + "</span>") + "</td>" : "";
        return "<tr><td class=\"bp-sn\">" + (i + 1) + "</td>" + lbl +
          t.cols.map(function (c) { return "<td>" + inputHtml("sheet." + t.path + "." + i + "." + c.k, c, row[c.k]) + "</td>"; }).join("") +
          "<td>" + (t.add ? '<button type="button" class="bp-x" data-del="' + esc(t.path) + '" data-i="' + i + '" aria-label="Remove">×</button>' : "") + "</td></tr>";
      }).join("") || '<tr><td colspan="9" class="bp-empty">Nothing listed. ' + (t.add ? "Add a line if there is one." : "") + "</td></tr>";
      return (t.t ? '<h4 class="bp-tt">' + esc(t.t) + "</h4>" : "") + (t.note ? '<p class="bp-help">' + esc(t.note) + "</p>" : "") +
        '<div class="bp-tw"><table class="bp-t">' + tableHead(t.cols, t.labelled ? "Description" : "") + "<tbody>" + body + "</tbody></table></div>" +
        (t.add ? '<button type="button" class="bp-add" data-add="' + esc(t.path) + '" data-blank="' + esc(JSON.stringify(t.blank || {})) + '">+ ' + esc(t.add) + "</button>" : "");
    }).join("");
  }
  function tableSec(sec) {
    var rows = getIn(state.sheet, sec.path) || [];
    var body = rows.map(function (row, i) {
      var self = sec.selfRow && i === 0;
      return "<tr><td class=\"bp-sn\">" + (i + 1) + "</td>" + sec.cols.map(function (c) {
        if (self && (c.k === "relation")) return '<td><span class="bp-lbl">Self</span></td>';
        if (self && ["name", "dob", "mobile", "email"].indexOf(c.k) >= 0) return '<td><span class="bp-lbl bp-muted">From your details</span></td>';
        var def = c;
        if (c.listRef === "sel:REL") def = Object.assign({}, c, { _opts: relOptions() });
        return "<td>" + inputHtml("sheet." + sec.path + "." + i + "." + c.k, def, row[c.k]) + "</td>";
      }).join("") + "<td>" + (self || sec.noAdd ? "" : '<button type="button" class="bp-x" data-del="' + esc(sec.path) + '" data-i="' + i + '" aria-label="Remove">×</button>') + "</td></tr>";
    }).join("") || '<tr><td colspan="12" class="bp-empty">Nothing listed yet.</td></tr>';
    return (sec.note ? '<p class="bp-help">' + esc(sec.note) + "</p>" : "") +
      '<div class="bp-tw"><table class="bp-t">' + tableHead(sec.cols, "") + "<tbody>" + body + "</tbody></table></div>" +
      (sec.noAdd ? "" : '<button type="button" class="bp-add" data-add="' + esc(sec.path) + '" data-se="1">+ ' + esc(sec.addLabel || "Add a line") + "</button>");
  }
  function children() {
    return (getIn(state.sheet, "family") || []).map(function (f, i) { return { f: f, i: i }; })
      .filter(function (x) { return x.i > 0 && (R.childRelations || []).indexOf(x.f.relation) >= 0; });
  }
  function childSec(sec) {
    var kids = children();
    if (!kids.length) return '<p class="bp-help">No children listed yet. Add a family member whose relationship is a child (' + esc((R.childRelations || []).join(" / ")) + ') and their goals appear here.</p>';
    var body = "";
    kids.forEach(function (k, ki) {
      if (!k.f.id) k.f.id = rid("SEF");
      body += '<tr class="bp-grp"><td colspan="' + (sec.cols.length + 2) + '">Child ' + (ki + 1) + " · <b>" + esc(k.f.name || "") + "</b></td></tr>";
      (R.childGoals || []).forEach(function (lbl, gi) {
        var base = "childGoals." + k.f.id + "." + gi;
        body += '<tr><td class="bp-sn">' + (gi + 1) + "</td><td>" + esc(lbl) + "</td>" +
          sec.cols.map(function (c) { return "<td>" + inputHtml("sheet." + base + "." + c.k, c, getIn(state.sheet, base + "." + c.k)) + "</td>"; }).join("") + "</tr>";
      });
    });
    return (sec.note ? '<p class="bp-help">' + esc(sec.note) + "</p>" : "") +
      '<div class="bp-tw"><table class="bp-t"><thead><tr><th>#</th><th>Goal</th>' + sec.cols.map(function (c) { return "<th>" + esc(c.label) + "</th>"; }).join("") + "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }
  // Which annexure a holding needs, by BOSS's own routing table.
  function annexRoute(listPath, row) {
    var field = listPath === "pureIns" ? "type" : "name";
    var val = String((row && row[field]) || "").trim();
    var routes = R.annexRoutes || [];
    var hit = routes.filter(function (r) { return r[0] === listPath && r[1] === val; })[0] || routes.filter(function (r) { return r[0] === listPath && r[1] === "*"; })[0];
    return hit ? { type: hit[2], sub: hit[3] || "" } : null;
  }
  function annexParents() {
    var out = {};
    [["finAssets.bank"], ["finAssets.small"], ["finAssets.market"], ["finAssets.other"], ["empRet"], ["pureIns"], ["invIns"]].forEach(function (x) {
      (getIn(state.sheet, x[0]) || []).forEach(function (row) {
        var r = annexRoute(x[0], row); if (!r) return;
        var named = String(row.name || row.type || row.plan || "").trim(); if (!named) return;
        (out[r.type] = out[r.type] || []).push({ row: row, named: named });
      });
    });
    return out;
  }
  function annexSec() {
    var parents = annexParents(), defs = R.annexDefs || {};
    var types = (R.annexOrder || []).filter(function (t) { return parents[t] && parents[t].length && defs[t]; });
    if (!types.length) return '<p class="bp-help">The annexures fill themselves from the holdings above. Enter a deposit, a fund or a policy and the annexure it needs appears here.</p>';
    return types.map(function (t) {
      var A = defs[t], rows = getIn(state.sheet, "annex." + t) || [];
      var cols = A.cols.map(function (c) { return { k: c[0], label: c[1], t: c[2] === "num" ? "num" : c[2] === "pct" ? "pct" : c[2] === "date" ? "date" : (c[2] === "sel" && c[3]) ? "sel" : "text", listRef: c[3] ? "sel:" + c[3] : undefined }; });
      return '<div class="bp-annex"><h4 class="bp-tt">' + esc(A.title) + '</h4><p class="bp-help">Covers ' + esc(parents[t].map(function (p) { return p.named; }).join(", ")) + "</p>" +
        '<div class="bp-tw"><table class="bp-t">' + tableHead(cols, "") + "<tbody>" +
        (rows.map(function (r, i) {
          return '<tr><td class="bp-sn">' + (i + 1) + "</td>" + cols.map(function (c) { return "<td>" + inputHtml("sheet.annex." + t + "." + i + "." + c.k, c, r[c.k]) + "</td>"; }).join("") +
            '<td><button type="button" class="bp-x" data-del="annex.' + esc(t) + '" data-i="' + i + '" aria-label="Remove">×</button></td></tr>';
        }).join("") || '<tr><td colspan="' + (cols.length + 2) + '" class="bp-empty">Nothing detailed yet.</td></tr>') +
        '</tbody></table></div><button type="button" class="bp-add" data-add="annex.' + esc(t) + '" data-annex="1">+ Add a line</button></div>';
    }).join("");
  }
  function docsSec() {
    var docs = Array.isArray(state.sheet.docs) ? state.sheet.docs : [];
    return '<div class="bp-docs"><input type="file" id="bpDocs" multiple data-testid="bp-docs"> <span class="bp-help">Up to ' + esc(R.docMaxMb || 5) + " MB each. Optional — you can send the form without any.</span></div>" +
      (docs.length ? '<ul class="bp-doclist">' + docs.map(function (d, i) { return "<li>" + esc(d.name) + ' <span class="bp-muted">(' + Math.round((d.size || 0) / 1024) + ' KB)</span> <button type="button" class="bp-x" data-deldoc="' + i + '" aria-label="Remove">×</button></li>'; }).join("") + "</ul>" : "");
  }
  function ladderSec(sec) {
    return '<div class="bp-ladder">' + (sec.levels || []).map(function (l) {
      return '<div class="bp-rung"><div class="bp-lvl">Level ' + esc(l.lvl) + '</div><div class="bp-amt">' + esc(inr(l.target)) + '</div><div class="bp-stage">' + esc(l.stage || "") + '</div><div class="bp-help">' + esc(l.purpose || "") + "</div></div>";
    }).join("") + "</div>";
  }
  function assetsSec(sec) {
    var rows = getIn(state.sheet, "assets") || [];
    return '<div class="bp-tw"><table class="bp-t"><thead><tr><th>#</th><th>Asset description</th>' + sec.cols.map(function (c) { return "<th>" + esc(c.label) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (a, i) { return '<tr><td class="bp-sn">' + (i + 1) + "</td><td>" + esc(a.name) + "</td>" + sec.cols.map(function (c) { return "<td>" + inputHtml("sheet.assets." + i + "." + c.k, { t: "num", ph: "0" }, a[c.k]) + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div>";
  }
  function sheetSectionsHtml() {
    var n = 1, html = "";
    F.sections.forEach(function (sec) {
      var body = sec.kind === "fields" ? fieldsSec(sec) : sec.kind === "multi" ? multiSec(sec) : sec.kind === "table" ? tableSec(sec)
        : sec.kind === "childTable" ? childSec(sec) : sec.kind === "annex" ? annexSec() : sec.kind === "docs" ? docsSec()
        : sec.kind === "ladder" ? ladderSec(sec) : sec.kind === "assets" ? assetsSec(sec) : "";
      if (!body) return;
      n++;
      var title = sec.card || sec.label, own = sec.label && String(title).toLowerCase().indexOf(String(sec.label).toLowerCase()) < 0 ? sec.label : "";
      html += sectionWrap(String(n), title + (own && !/^(Basic details)$/.test(title) ? " · " + own : ""), sec.hint || "", body, "bp-sec-" + sec.key);
    });
    return html;
  }

  /* ---------------- Goal Based Investment (a template) ---------------- */
  function templateHtml() {
    var html = "", n = 1, open = false, buf = "";
    function flush(title, note) { if (open) { html += sectionWrap(String(n), open.title, open.note, '<div class="bp-grid">' + buf + "</div>"); } open = title ? { title: title, note: note } : false; buf = ""; }
    F.fields.forEach(function (f) {
      if (f.t === "section") { n++; flush(f.l, f.note); return; }
      if (!open) { n++; open = { title: F.label, note: "" }; }
      if (f.t === "note") { buf += '<p class="bp-help bp-wide">' + esc(f.note) + "</p>"; return; }
      if (f.t === "table") {
        var rows = state.sheet[f.k] || [];
        var cols = f.cols.map(function (c) { return { k: c.k, label: c.l, t: c.t === "number" ? "number" : "text", req: c.req }; });
        buf += '<div class="bp-wide"><label>' + esc(f.l) + '</label><div class="bp-tw"><table class="bp-t">' + tableHead(cols, "") + "<tbody>" +
          rows.map(function (r, i) {
            return '<tr><td class="bp-sn">' + (i + 1) + "</td>" + cols.map(function (c) { return "<td>" + inputHtml("sheet." + f.k + "." + i + "." + c.k, c, r[c.k]) + "</td>"; }).join("") +
              "<td>" + (rows.length > 1 ? '<button type="button" class="bp-x" data-del="' + esc(f.k) + '" data-i="' + i + '" aria-label="Remove">×</button>' : "") + "</td></tr>";
          }).join("") + "</tbody></table></div>" +
          (rows.length < (f.maxRows || 8) ? '<button type="button" class="bp-add" data-add="' + esc(f.k) + '" data-tpl="1">+ Add ' + esc(f.rowLabel || "row") + "</button>" : "") + "</div>";
        return;
      }
      buf += fieldHtml("sheet." + f.k, { label: f.l, t: f.t, ph: f.ph, note: f.note, opts: f.opts, listRef: f.listRef }, state.sheet[f.k], f.req);
    });
    flush();
    return html;
  }

  /* ---------------- the ISEQ, as BOSS's unified client page asks it ----------------
     It opens after the Input Form, on its own page, and which questionnaire it
     is comes off the date of birth in "Your details": under 50 or 50 and over.
     Scored the way BOSS scores it: the points each answer carries, times the
     version's multiplier, read against its bands. */
  function ageOf(dob) {
    var d = new Date(String(dob || "") + "T00:00:00"); if (isNaN(d)) return null;
    var n = new Date(), a = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
    return a >= 0 && a <= 120 ? a : null;
  }
  function iseqType() { var a = ageOf(state.basics.me_dob); return a === null ? "" : (a < IQ.ageSplit ? IQ.under : IQ.over); }
  function iseqDef() { return IQ.types[iseqType()] || null; }
  function iseqScore() {
    var T = iseqDef(); if (!T) return null;
    var raw = 0, rawMax = 0;
    T.fields.forEach(function (f) {
      var pts = Object.keys(f.scores || {}).map(function (k) { return Number(f.scores[k]); }).filter(function (n) { return !isNaN(n); });
      rawMax += pts.length ? Math.max.apply(null, pts) : 0;
      var a = state.iseq[f.k];
      if (a !== undefined && f.scores && f.scores[a] !== undefined) raw += Number(f.scores[a]);
    });
    var m = Number(T.multiplier) || 1, score = raw * m, max = rawMax * m, band = null;
    T.bands.forEach(function (b) { if (Number(b.min) <= score) band = b; });
    var cat = band ? band.category : "";
    var alloc = T.alloc[cat] || null, matrix = IQ.matrix[cat] || null;
    return { type: iseqType(), raw: raw, score: score, max: max, category: cat, note: T.notes[cat] || "", alloc: alloc, matrix: matrix,
      horizons: matrix ? matrix.map(function (r) { return r.horizon + " \u2014 " + r.what; }).join("\n") : "" };
  }
  function num(v) { var n = Number(v); return isFinite(n) ? String(Math.round(n * 100) / 100) : ""; }
  /* One question at a time, as BOSS's own ISEQ and FQ pages ask it: progress
     dots, the question, lettered options; choosing one settles for a moment
     and moves on. After the last, a short review and Submit everything. */
  function iseqPos() {
    var T = iseqDef(), n = T.fields.length;
    if (typeof state.iqi !== "number" || state.iqi < 0) state.iqi = 0;
    if (state.iqi > n) state.iqi = n;
    return state.iqi;   // n means "all answered — review"
  }
  function iseqPageHtml() {
    var T = iseqDef(), age = ageOf(state.basics.me_dob), total = T.fields.length, i = iseqPos();
    var answered = T.fields.filter(function (f) { return state.iseq[f.k] !== undefined; }).length;
    var who = (state.basics.me_name || "").trim();
    var head = '<div class="fx-quiz-head"><span class="fx-pill"><span class="fxg bp-pill-ico">✦</span> ' + esc(IQ.label) + "</span>" +
      '<button type="button" class="fx-btn ghost" id="bpBack" data-testid="bp-back">← Back to your Input Form</button></div>';
    var intro = '<div class="bp-iq-intro">' + (who ? esc(who.split(/\s+/)[0]) + " — t" : "T") + "hese " + total + " question" + (total === 1 ? "" : "s") +
      " are the ones that suit your age" + (age === null ? "" : " (" + age + ")") + ". There are no right answers, only what is true for you.</div>";
    var dots = '<div class="fx-dots">' + T.fields.map(function (f, k) {
      return '<i class="' + (k === i ? "now" : state.iseq[f.k] !== undefined ? "done" : "") + '"></i>'; }).join("") + "</div>";
    var body;
    if (i < total) {
      var f = T.fields[i], picked = state.iseq[f.k];
      body = '<div class="fx-quiz-card fx-glass fx-soft" data-testid="bp-iseq-card">' +
        '<div class="bp-iq-top">' + dots + '<div class="fx-qidx" data-testid="bp-iseq-counter">Q ' + (i + 1) + " of " + total + " • " + esc(T.label) + "</div></div>" +
        '<div style="margin-top:24px"><div class="fx-qsec">Investor Suitability</div><h3 class="fx-q" data-testid="bp-iseq-question">' + esc(f.l) + "</h3>" +
        (f.note ? '<div class="bp-iq-note">' + esc(f.note) + "</div>" : "") + "</div>" +
        '<div class="fx-opts">' + (f.opts || []).map(function (o, k) {
          var on = picked === o;
          return '<button type="button" class="fx-opt' + (on ? " sel" : "") + '" data-iseq="' + esc(f.k) + '" data-i="' + k + '" data-testid="bp-iseq-' + esc(f.k) + "-" + k + '">' +
            '<span class="rad">' + (on ? "<i></i>" : "") + '</span><span class="txt">' + esc(o) + '</span><span class="ltr">' + "ABCDEF".charAt(k) + "</span></button>";
        }).join("") + "</div>" +
        '<div class="fx-qnav"><button type="button" class="fx-btn ghost" id="bpIqPrev"' + (i === 0 ? " disabled" : "") + ">← Previous</button>" +
        '<div class="bp-iq-count" data-testid="bp-iseq-count">' + answered + " of " + total + " answered</div>" +
        (picked !== undefined ? '<button type="button" class="fx-btn ghost" id="bpIqNext">Next →</button>' : '<span></span>') + "</div></div>";
    } else {
      body = '<div class="fx-reveal fx-glass fx-soft" data-testid="bp-iseq-review"><div class="tile fxg">✓</div>' +
        '<h2>All ' + total + " questions answered</h2>" +
        '<p class="bp-iq-sub">Your Input Form and your risk questionnaire are ready to go to your Finowise relationship manager. You can still go back and change any answer.</p>' +
        '<div class="bp-iq-review">' + T.fields.map(function (q, k) {
          return '<button type="button" class="bp-iq-row" data-iqgo="' + k + '"><span class="n">' + (k + 1) + '</span><span class="q">' + esc(q.l) + '</span><span class="a">' + esc(state.iseq[q.k] || "—") + "</span></button>";
        }).join("") + "</div>" +
        '<label class="bp-consent bp-iq-consent"><input type="checkbox" id="bpConsent" data-testid="bp-consent"' + (state.consent ? " checked" : "") + "> I agree to share these details with the Finowise team and to be contacted about my blueprint.</label>" +
        '<div id="bpMsg"></div>' +
        '<button type="button" class="fx-btn grad" style="width:100%" id="bpSendAll" data-testid="bp-send-all"' + (state.sending ? " disabled" : "") + ">" + (state.sending ? "Sending…" : "Submit everything →") + "</button>" +
        '<div class="bp-iq-foot">Your Input Form is held as you left it — nothing is sent until you press Submit.</div></div>';
    }
    return '<div class="fqx bp-fqx"><div class="fx-quiz">' + head + intro + body + "</div></div>";
  }
  // What the client sees once it is in, in the FQ / ISEQ result's clothes:
  // that it arrived, their risk profile, what happens next.
  function donePageHtml() {
    var r = state.result, circ = 326.56, pct = r && r.max ? Math.max(0, Math.min(100, Math.round(r.score / r.max * 100))) : 0;
    var who = (state.basics.me_name || "").trim().split(/\s+/)[0];
    var thanks = '<div class="fx-glass fx-soft fx-plate bp-iq-thanks" data-testid="bp-done"><div class="bp-iq-tick">✓</div>' +
      '<h3 class="fx-band">Thank you for your submission</h3><p class="fx-banddesc">' + esc(state.done) + "</p></div>";
    var res = r ? '<div class="fx-res-grid bp-iq-resgrid" data-testid="bp-iseq-result">' +
      '<div class="fx-res-left fx-glass fx-soft"><div class="bp-iq-badge">ISEQ RESULT</div>' +
        '<div style="margin-top:22px;display:flex;flex-direction:column;align-items:center;text-align:center">' +
        '<div class="fx-ring"><svg viewBox="0 0 120 120" aria-label="ISEQ score ' + esc(num(r.score)) + " out of " + esc(num(r.max)) + '"><defs><linearGradient id="fxiseq" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#164B5E"></stop><stop offset="100%" stop-color="#F25C2A"></stop></linearGradient></defs>' +
        '<circle cx="60" cy="60" r="52" fill="none" stroke="#EEE8E2" stroke-width="12"></circle><circle cx="60" cy="60" r="52" fill="none" stroke="url(#fxiseq)" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (pct / 100 * circ).toFixed(2) + " " + circ + '"></circle></svg>' +
        '<div class="mid"><div><div class="num" data-testid="bp-iseq-score">' + esc(num(r.score)) + '</div><div class="cap">OF ' + esc(num(r.max)) + "</div></div></div></div>" +
        '<h3 class="fx-band" data-testid="bp-iseq-category">' + esc(r.category) + "</h3>" + (r.note ? '<p class="fx-banddesc">' + esc(r.note) + "</p>" : "") +
        '<div class="fx-chip" style="margin-top:16px">Investor Suitability' + (who ? " • " + esc(who) : "") + "</div></div></div>" +
      '<div style="display:flex;flex-direction:column;gap:20px">' +
        (r.alloc ? '<div class="fx-glass fx-soft fx-plate"><div class="fx-sechead">PRIMARY ASSET ALLOCATION RECOMMENDED FOR YOU</div><div class="fx-quads" style="margin-top:12px">' +
          [["Equity", r.alloc.equity], ["Debt", r.alloc.debt], ["Gold", r.alloc.gold]].map(function (x) {
            return '<div class="fx-quad"><div class="row"><div class="nm">' + esc(x[0]) + '</div></div><div class="big" style="margin-top:8px">' + esc(x[1]) + "</div></div>"; }).join("") + "</div></div>" : "") +
        (r.matrix ? '<div class="fx-glass fx-soft fx-plate"><div class="fx-sechead">AND WHAT TO HOLD, BY HOW LONG THE MONEY IS FOR</div><div class="bp-tw" style="margin-top:12px"><table class="bp-t"><thead><tr><th>Investment duration</th><th>Time horizon</th><th>' + esc(r.category) + "</th></tr></thead><tbody>" +
          r.matrix.map(function (m) { return "<tr><td>" + esc(m.duration) + "</td><td>" + esc(m.horizon) + "</td><td><b>" + esc(m.what) + "</b></td></tr>"; }).join("") + "</tbody></table></div>" +
          '<div class="bp-iq-note" style="margin-top:10px">Your financial goals are time bound, so the horizon matters as much as the score: the row your money falls in is the one to read. ' +
          (r.alloc ? "The split above is set against this score; c" : "C") + "hanging it needs your consent in writing.</div></div>" : "") +
      "</div></div>" : "";
    var next = '<div class="fx-cta fxg"><div class="in"><h4>What happens next</h4><div class="sub">Our team will connect with you shortly. Your relationship manager has your Input Form and your risk profile.</div>' +
      '<div style="margin-top:16px;text-align:center"><a class="fx-btn grad bp-iq-home" href="solutions.html">Back to Solutions</a></div></div></div>';
    return '<div class="fqx bp-fqx"><div class="fx-res bp-iq-done">' + thanks + res + next + "</div></div>";
  }

  /* ---------------- the page ---------------- */
  function render() {
    if (state.done) {
      root.innerHTML = donePageHtml();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (state.step === 2 && iseqDef()) {
      root.innerHTML = iseqPageHtml();
      var top = root.getBoundingClientRect().top + window.scrollY - 100;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
      return;
    }
    var keep = window.scrollY;
    root.innerHTML =
      '<div class="bp-card bp-intro"><span class="bp-tag">' + esc(goal.title) + "</span><h2>" + esc(F.label) + ' — Investment Blueprint Input Form</h2><p>Fill in what applies to you and press Submit. Leave a line blank if it does not apply. It goes straight to your Finowise relationship manager.</p></div>' +
      Object.keys(DEF.lists).map(function (k) { return '<datalist id="bpdl-' + esc(k.replace(/[^A-Za-z0-9]/g, "_")) + '">' + DEF.lists[k].map(function (o) { return '<option value="' + esc(o[1]) + '">'; }).join("") + "</datalist>"; }).join("") +
      '<form id="bpForm" novalidate>' + basicsHtml() + (isSheet ? sheetSectionsHtml() : templateHtml()) +
      '<div class="bp-card bp-submit"><div id="bpMsg"></div><button type="submit" class="btn btn-primary" id="bpSend" data-testid="bp-send">Next → ' + esc(IQ.label) + "</button>" +
      '<p class="bp-help" style="margin-top:12px">When this part is done, Next takes you to the risk questionnaire. Nothing is sent until you submit there.</p></div></form>';
    window.scrollTo(0, keep);
  }
  function msg(cls, html) { var el = document.getElementById("bpMsg"); if (el) el.innerHTML = html ? '<div class="bp-msg ' + cls + '" data-testid="bp-msg">' + html + "</div>" : ""; }

  /* ---------------- reading input ---------------- */
  function onInput(el) {
    var path = el.getAttribute("data-path"); if (!path) return;
    var t = el.getAttribute("data-t");
    var val = toStore(t, el.value);
    if (path.indexOf("basics.") === 0) state.basics[path.slice(7)] = el.value.trim();
    else setIn(state.sheet, path.slice(6), val);
    saveDraft();
  }
  // A change that alters what the page shows (a child added, a holding that needs an annexure, a marital status).
  function redrawOn(path) {
    return /^sheet\.(family\.|basic\.marital|finAssets\.|empRet\.|pureIns\.|invIns\.)/.test(path) && /(relation|marital|name|type|plan)$/.test(path);
  }
  root.addEventListener("input", function (e) { if (e.target.matches("[data-path]")) onInput(e.target); });
  root.addEventListener("change", function (e) {
    if (e.target.id === "bpConsent") { state.consent = e.target.checked; return; }
    if (e.target.id === "bpDocs") { addDocs(e.target); return; }
    if (e.target.matches("[data-path]")) {
      onInput(e.target);
      if (e.target.getAttribute("data-path") === "basics.me_pin") pinFill(e.target.value.trim());
      if (redrawOn(e.target.getAttribute("data-path"))) render();
    }
  });
  // The PIN fills City and State, as on BOSS's own page; what is typed there is never overwritten.
  function pinFill(pin) {
    if (!/^[1-9][0-9]{5}$/.test(pin) || !LMS_URL) return;
    fetch(LMS_URL + "/api/public/website-pincode/" + pin).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) return;
      var changed = false;
      [["me_city", d.city], ["me_state", d.state], ["me_country", d.city || d.state ? "India" : ""]].forEach(function (x) {
        if (x[1] && blank(state.basics[x[0]])) { state.basics[x[0]] = x[1]; changed = true; }
      });
      if (changed) { saveDraft(); render(); }
    }).catch(function () { /* the client can still type them */ });
  }
  root.addEventListener("click", function (e) {
    var a = e.target.closest("[data-add]"), d = e.target.closest("[data-del]"), dd = e.target.closest("[data-deldoc]");
    if (a) {
      var path = a.getAttribute("data-add");
      var list = getIn(state.sheet, path);
      if (!Array.isArray(list)) { setIn(state.sheet, path, []); list = getIn(state.sheet, path); }
      if (a.hasAttribute("data-annex")) list.push({ id: rid("SEA") });
      else if (a.hasAttribute("data-tpl")) list.push({});
      else if (a.hasAttribute("data-se")) {
        var sec = F.sections.filter(function (s) { return s.path === path; })[0] || {};
        var row = clone(sec.newRow || {}); Object.keys(row).forEach(function (k) { if (k !== "id" && k !== "mode") row[k] = row[k] === undefined ? "" : row[k]; });
        row.id = rid(path === "family" ? "SEF" : "SER"); list.push(row);
      } else list.push(JSON.parse(a.getAttribute("data-blank") || "{}"));
      saveDraft(); render();
    } else if (d) {
      var p = d.getAttribute("data-del"), i = Number(d.getAttribute("data-i"));
      var l = getIn(state.sheet, p); if (Array.isArray(l)) { l.splice(i, 1); saveDraft(); render(); }
    } else if (dd) {
      state.sheet.docs.splice(Number(dd.getAttribute("data-deldoc")), 1); render();
    }
  });
  function addDocs(input) {
    var files = Array.prototype.slice.call(input.files || []), max = (R.docMaxMb || 5) * 1024 * 1024, big = [];
    state.sheet.docs = Array.isArray(state.sheet.docs) ? state.sheet.docs : [];
    Promise.all(files.map(function (f) {
      if (f.size > max) { big.push(f.name); return null; }
      return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res({ name: f.name, type: f.type || "", size: f.size, data: r.result, at: new Date().toISOString() }); }; r.readAsDataURL(f); });
    })).then(function (got) {
      got.filter(Boolean).forEach(function (x) { state.sheet.docs.push(x); });
      render();
      if (big.length) msg("err", "Too large to attach (over " + esc(R.docMaxMb || 5) + " MB): " + esc(big.join(", ")) + ". Everything else was attached.");
    });
  }

  /* ---------------- checks, as BOSS makes them ---------------- */
  function missing() {
    var out = [], B = state.basics, thisYear = new Date().getFullYear();
    DEF.basics.forEach(function (f) { if ((reqBasics.indexOf(f.k) >= 0 || f.req) && blank(B[f.k])) out.push("Your details — " + f.l); });
    if (!blank(B.me_mobile) && !/^[6-9]\d{9}$/.test(String(B.me_mobile).replace(/\D/g, "").slice(-10))) out.push("Your details — Mobile Number is not a valid 10-digit mobile");
    if (!blank(B.me_email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(B.me_email)) out.push("Your details — Email ID is not valid");
    if (!blank(B.me_pan) && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(B.me_pan).toUpperCase())) out.push("Your details — PAN should look like ABCDE1234F");
    if (!isSheet) {
      F.fields.forEach(function (f) {
        if (f.t === "table") { (state.sheet[f.k] || []).forEach(function (r, i) { var any = f.cols.some(function (c) { return !blank(r[c.k]); }); if (any) f.cols.forEach(function (c) { if (c.req && blank(r[c.k])) out.push(f.l + " row " + (i + 1) + " — " + c.l); }); }); return; }
        if (f.req && blank(state.sheet[f.k])) out.push(f.l);
      });
      return out;
    }
    var S = state.sheet;
    F.sections.forEach(function (sec) {
      var title = sec.label || sec.card;
      if (sec.kind === "fields") sec.fields.forEach(function (f) { if (!f.fromBasics && f.req && blank(getIn(S, f.k))) out.push(title + " — " + f.label); });
      if (sec.kind === "table") (getIn(S, sec.path) || []).forEach(function (row, i) {
        if (sec.selfRow && i === 0) return;
        var touched = sec.cols.some(function (c) { return !blank(row[c.k]); });
        if (touched) sec.cols.forEach(function (c) { if (c.req && blank(row[c.k])) out.push(title + " row " + (i + 1) + " — " + c.label); });
      });
      if (sec.kind === "multi") sec.tables.forEach(function (t) { (getIn(S, t.path) || []).forEach(function (row, i) { var touched = t.cols.some(function (c) { return !blank(row[c.k]); }); if (touched) t.cols.forEach(function (c) { if (c.req && blank(row[c.k])) out.push(title + " row " + (i + 1) + " — " + c.label); }); }); });
    });
    if (goal.type === "SEVENEVENTS" && (R.termPlans || []).length) {
      var pure = F.sections.filter(function (s) { return s.key === "pureIns"; })[0];
      if (pure && !(getIn(S, "pureIns") || []).some(function (r) { return R.termPlans.indexOf(r.type) >= 0; }))
        out.push((pure.label || "Insurance") + " — Term Plan details (sum assured; enter 0 if there is none)");
    }
    if (goal.type === "GAB") {
      var num = function (v) { return Number(v) || 0; };
      if (!(num(S.s1.retYear) >= thisYear && num(S.s1.retYear) < thisYear + 60)) out.push("Personal details — A planned retirement year, this year or later");
      if (!(S.s2 || []).some(function (r) { return num(r.monthly) > 0 || num(r.annual) > 0; })) out.push("Living expenses — At least one living expense");
      if (!((S.s4 || {}).rows || []).some(function (r) { return num(r.existing) > 0 || num(r.monthly) > 0; })) out.push("Corpus investments — At least one investment towards the corpus");
      if (!((S.s3 || {}).goals || []).every(function (g) { return !(num(g.cur) > 0) || !blank(g.years); })) out.push("Goals — A time frame for every goal that has a cost");
      if (!((S.s8 || {}).holdings || []).every(function (h) { return blank(h.scheme) || num(h.current) > 0; })) out.push("Holdings — A current value for every holding listed");
    }
    if (goal.type === "FSL") {
      var y = Number(S.years);
      if (!(Number.isInteger(y) && y >= 1 && y <= 50)) out.push("The horizon must be a whole number of years between 1 and 50");
    }
    return out;
  }

  /* ---------------- sending ---------------- */
  function touchedKeys() {
    var keys = {};
    F.sections.forEach(function (s) {
      (s.fields || []).forEach(function (f) { keys[String(f.k).split(".")[0]] = 1; });
      if (s.path) keys[String(s.path).split(".")[0]] = 1;
      (s.tables || []).forEach(function (t) { keys[String(t.path).split(".")[0]] = 1; });
      if (s.kind === "childTable") keys.childGoals = 1;
      if (s.kind === "annex") keys.annex = 1;
      if (s.kind === "docs") keys.docs = 1;
      if (s.kind === "assets") keys.assets = 1;
    });
    return Object.keys(keys);
  }
  root.addEventListener("submit", function (e) {
    e.preventDefault();
    var miss = missing();
    if (!miss.length && !iseqDef()) miss.push("Your details — Date of Birth (the questions you are asked next are worked out from it)");
    if (miss.length) { msg("err", "<b>Please answer these before going on:</b><ul>" + miss.slice(0, 25).map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>"); return; }
    state.step = 2;
    var TT = iseqDef(); state.iqi = TT.fields.filter(function (x) { return state.iseq[x.k] !== undefined; }).length >= TT.fields.length ? TT.fields.length
      : Math.max(0, TT.fields.findIndex(function (x) { return state.iseq[x.k] === undefined; }));
    saveDraft(); render(); window.scrollTo(0, root.getBoundingClientRect().top + window.scrollY - 120);
  });
  root.addEventListener("click", function (e) {
    var o = e.target.closest("[data-iseq]");
    if (o) {
      var f = iseqDef().fields.filter(function (x) { return x.k === o.getAttribute("data-iseq"); })[0];
      if (f) {
        state.iseq[f.k] = f.opts[Number(o.getAttribute("data-i"))]; saveDraft(); render();
        // It settles for a moment so the choice is seen, then moves on.
        var at = state.iqi;
        setTimeout(function () { if (state.step === 2 && !state.done && state.iqi === at) { state.iqi = at + 1; render(); } }, 350);
      }
      return;
    }
    if (e.target.closest("#bpIqPrev")) { if (state.iqi > 0) { state.iqi--; render(); } return; }
    if (e.target.closest("#bpIqNext")) { state.iqi++; render(); return; }
    var go = e.target.closest("[data-iqgo]");
    if (go) { state.iqi = Number(go.getAttribute("data-iqgo")); render(); return; }
    if (e.target.closest("#bpBack")) { state.step = 1; render(); window.scrollTo(0, 0); return; }
    if (e.target.closest("#bpSendAll")) sendAll();
  });
  function sendAll() {
    if (state.sending) return;
    var miss = missing();
    if (miss.length) { state.step = 1; render(); msg("err", "<b>Please answer these on your Input Form first:</b><ul>" + miss.slice(0, 25).map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>"); return; }
    var T = iseqDef();
    var firstGap = T.fields.findIndex(function (f) { return f.req && state.iseq[f.k] === undefined; });
    if (firstGap >= 0) { state.iqi = firstGap; render(); return; }
    if (!state.consent) miss.push("Please tick the box to agree to be contacted");
    if (miss.length) { msg("err", "<b>Please answer these before sending:</b><ul>" + miss.slice(0, 25).map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>"); return; }
    var R2 = iseqScore();
    var answers = {}; T.fields.forEach(function (f) { if (state.iseq[f.k] !== undefined) answers[f.k] = state.iseq[f.k]; });
    var B = Object.assign({}, state.basics);
    B.me_mobile = String(B.me_mobile || "").replace(/\D/g, "").slice(-10);
    if (B.me_pan) B.me_pan = B.me_pan.toUpperCase();
    var sheet = clone(state.sheet);
    // What "Your details" answered, carried into the sheet as BOSS does on submit.
    if (isSheet) fromBasicsFields().forEach(function (f) { if (!blank(B[f.fromBasics])) setIn(sheet, f.k, f.t === "num" ? Number(B[f.fromBasics]) : B[f.fromBasics]); });
    var body = { goal: goalKey, basics: B, sheet: sheet, touched: isSheet ? touchedKeys() : undefined, consent: true,
      iseq: { type: R2.type, answers: answers, raw: R2.raw, score: R2.score, max: R2.max, category: R2.category, note: R2.note,
        equity: R2.alloc ? R2.alloc.equity : "", debt: R2.alloc ? R2.alloc.debt : "", gold: R2.alloc ? R2.alloc.gold : "", horizons: R2.horizons } };
    state.sending = true; render(); msg("ok", "Sending your form to our team…");
    fetch(LMS_URL + "/api/public/website-blueprint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, status: res.status, d: d }; }); })
      .then(function (x) {
        state.sending = false;
        if (x.ok && x.d && x.d.ok) { try { localStorage.removeItem(DRAFT_KEY); } catch (er) { /* ignore */ } state.result = R2; state.done = x.d.message || "Your form has reached our team."; render(); return; }
        render();
        if (x.status === 400 && x.d && x.d.message) { msg("err", esc(x.d.message)); return; }
        if (x.status === 429) { msg("err", "Too many tries just now. Please wait a minute and press Submit again — nothing you typed is lost."); return; }
        fallback(B);
      })
      .catch(function () { state.sending = false; render(); fallback(B); });
  }
  function fallback(B) {
    var text = "Hi Finowise, I filled in the " + goal.title + " blueprint form on your website but could not send it.\nName: " + (B.me_name || "") + "\nMobile: " + (B.me_mobile || "") + "\nEmail: " + (B.me_email || "");
    msg("err", "We could not send your form just now. Everything you typed is saved on this device — please try Submit again in a moment, or " +
      '<a href="https://wa.me/' + WHATSAPP + "?text=" + encodeURIComponent(text) + '" target="_blank" rel="noopener" data-testid="bp-whatsapp">message us on WhatsApp</a>.');
  }

  /* ---------------- start ---------------- */
  var draft = loadDraft();
  state.sheet = isSheet ? clone(F.blank) : {};
  if (!isSheet) F.fields.forEach(function (f) { if (f.t === "table") state.sheet[f.k] = [{}]; else if (!blank(f.def)) state.sheet[f.k] = f.def; });
  if (isSheet && goal.type === "SEVENEVENTS") (state.sheet.family || []).forEach(function (f) { if (!f.id) f.id = rid("SEF"); });
  state.basics.me_date = today();
  try { var c = JSON.parse(localStorage.getItem("fw_bp_contact") || "{}"); ["name", "mobile", "email", "city"].forEach(function (k) { if (c[k]) state.basics["me_" + k] = c[k]; }); } catch (er) { /* none */ }
  if (draft && draft.sheet) { state.basics = Object.assign(state.basics, draft.basics || {}); state.sheet = Object.assign(state.sheet, draft.sheet); state.iseq = draft.iseq || {}; }
  document.title = F.label + " — Blueprint Input Form | Freedom LifeX Group";
  render();
})();
