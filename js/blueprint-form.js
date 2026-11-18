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
  function iseqPageHtml() {
    var T = iseqDef(), age = ageOf(state.basics.me_dob);
    var done = T.fields.filter(function (f) { return state.iseq[f.k] !== undefined; }).length, total = T.fields.length;
    var who = (state.basics.me_name || "").trim();
    return '<div class="bp-card bp-intro"><span class="bp-tag">Step 2 of 2</span><h2>' + esc(IQ.label) + '</h2><p>' + (who ? esc(who) + " — t" : "T") +
      "hese " + total + " question" + (total === 1 ? "" : "s") + " are the ones that suit your age" + (age === null ? "" : " (" + age + ")") + ". There are no right answers, only what is true for you.</p></div>" +
      '<div class="bp-card bp-iseq-prog"><div class="bp-dots">' + T.fields.map(function (f) { return '<i class="' + (state.iseq[f.k] !== undefined ? "on" : "") + '"></i>'; }).join("") +
      '</div><div class="bp-muted" data-testid="bp-iseq-count">' + done + " of " + total + " answered</div></div>" +
      T.fields.map(function (f, qi) {
        return '<div class="bp-card bp-iseq-q" id="iseqq_' + esc(f.k) + '"><div class="bp-tag">Question ' + (qi + 1) + " of " + total + "</div><h3>" + esc(f.l) + "</h3>" +
          (f.note ? '<p class="bp-help">' + esc(f.note) + "</p>" : "") + '<div class="bp-opts">' +
          (f.opts || []).map(function (o, i) {
            var on = state.iseq[f.k] === o;
            return '<button type="button" class="bp-opt' + (on ? " on" : "") + '" data-iseq="' + esc(f.k) + '" data-i="' + i + '" data-testid="bp-iseq-' + esc(f.k) + "-" + i + '">' +
              '<span class="bp-rad">' + (on ? "<i></i>" : "") + '</span><span class="bp-txt">' + esc(o) + '</span><span class="bp-ltr">' + "ABCDEF".charAt(i) + "</span></button>";
          }).join("") + "</div></div>";
      }).join("") +
      '<div class="bp-card bp-submit"><label class="bp-consent"><input type="checkbox" id="bpConsent" data-testid="bp-consent"' + (state.consent ? " checked" : "") + "> I agree to share these details with the Finowise team and to be contacted about my blueprint.</label>" +
      '<div id="bpMsg"></div><div class="bp-nav"><button type="button" class="btn btn-outline-dark" id="bpBack" data-testid="bp-back">← Back to your Input Form</button>' +
      '<button type="button" class="btn btn-primary" id="bpSendAll" data-testid="bp-send-all"' + (state.sending ? " disabled" : "") + ">" + (state.sending ? "Sending…" : 'Submit everything <i class="fa-solid fa-paper-plane"></i>') + "</button></div>" +
      '<p class="bp-help" style="margin-top:12px">Your Input Form is held as you left it — nothing is sent until you press Submit.</p></div>';
  }
  // What the client sees once it is in: that it arrived, their risk profile, what happens next.
  function donePageHtml() {
    var r = state.result, circ = 326.56, pct = r && r.max ? Math.max(0, Math.min(100, Math.round(r.score / r.max * 100))) : 0;
    return '<div class="bp-card bp-done" data-testid="bp-done"><div class="bp-tick">✓</div><h2>Thank you for your submission</h2><p>' + esc(state.done) + "</p></div>" +
      (r ? '<div class="bp-card bp-iseq-res" data-testid="bp-iseq-result"><span class="bp-tag">ISEQ result</span>' +
        '<div class="bp-ring"><svg viewBox="0 0 120 120" aria-label="ISEQ score ' + esc(num(r.score)) + " out of " + esc(num(r.max)) + '"><circle cx="60" cy="60" r="52" fill="none" stroke="#EEE8E2" stroke-width="12"></circle>' +
        '<circle cx="60" cy="60" r="52" fill="none" stroke="var(--primary)" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (pct / 100 * circ).toFixed(2) + " " + circ + '" transform="rotate(-90 60 60)"></circle></svg>' +
        '<div class="bp-ring-mid"><b data-testid="bp-iseq-score">' + esc(num(r.score)) + "</b><small>OF " + esc(num(r.max)) + "</small></div></div>" +
        '<h3 data-testid="bp-iseq-category">' + esc(r.category) + "</h3>" + (r.note ? '<p class="bp-help" style="font-size:.92rem">' + esc(r.note) + "</p>" : "") +
        (r.alloc ? '<h4 class="bp-tt">Primary asset allocation recommended for you</h4><div class="bp-alloc"><div><b>' + esc(r.alloc.equity) + "</b><span>Equity</span></div><div><b>" + esc(r.alloc.debt) + "</b><span>Debt</span></div><div><b>" + esc(r.alloc.gold) + "</b><span>Gold</span></div></div>" : "") +
        (r.matrix ? '<h4 class="bp-tt">And what to hold, by how long the money is for</h4><div class="bp-tw"><table class="bp-t"><thead><tr><th>Investment duration</th><th>Time horizon</th><th>' + esc(r.category) + "</th></tr></thead><tbody>" +
          r.matrix.map(function (m) { return "<tr><td>" + esc(m.duration) + "</td><td>" + esc(m.horizon) + "</td><td><b>" + esc(m.what) + "</b></td></tr>"; }).join("") + "</tbody></table></div>" : "") +
        '<p class="bp-help" style="margin-top:10px">Your financial goals are time bound, so the horizon matters as much as the score' + (r.matrix ? ": the row your money falls in is the one to read" : "") + ". " +
        (r.alloc ? "The split above is set against this score; c" : "C") + "hanging it needs your consent in writing.</p></div>" : "") +
      '<div class="bp-card"><span class="bp-tag">What happens next</span><p style="margin:6px 0 0">Our team will connect with you shortly.</p><p style="margin-top:14px"><a class="btn btn-primary" href="solutions.html">Back to Solutions</a></p></div>';
  }

  /* ---------------- the page ---------------- */
  function render() {
    if (state.done) {
      root.innerHTML = donePageHtml();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (state.step === 2 && iseqDef()) {
      var keep2 = window.scrollY;
      root.innerHTML = iseqPageHtml();
      window.scrollTo(0, keep2);
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
    state.step = 2; saveDraft(); render(); window.scrollTo(0, root.getBoundingClientRect().top + window.scrollY - 120);
  });
  root.addEventListener("click", function (e) {
    var o = e.target.closest("[data-iseq]");
    if (o) {
      var f = iseqDef().fields.filter(function (x) { return x.k === o.getAttribute("data-iseq"); })[0];
      if (f) { state.iseq[f.k] = f.opts[Number(o.getAttribute("data-i"))]; saveDraft(); render(); }
      return;
    }
    if (e.target.closest("#bpBack")) { state.step = 1; render(); window.scrollTo(0, 0); return; }
    if (e.target.closest("#bpSendAll")) sendAll();
  });
  function sendAll() {
    if (state.sending) return;
    var miss = missing();
    if (miss.length) { state.step = 1; render(); msg("err", "<b>Please answer these on your Input Form first:</b><ul>" + miss.slice(0, 25).map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>"); return; }
    var T = iseqDef();
    T.fields.forEach(function (f) { if (f.req && state.iseq[f.k] === undefined) miss.push(IQ.label + " — Question " + (T.fields.indexOf(f) + 1)); });
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
