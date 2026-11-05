/* Know Your FQ Score — the website's copy of the Finowise BOSS LMS FQ
   assessment: same questions (js/fq-bank.js), same scoring, same screens and
   styling (css/fq-boss.css), plus the website's own flow:

     landing → personalise (life stage, referral, occupation, city)
     → stage reveal → 20 questions, one at a time, with a milestone after
     each index → result locked until basic details → score and category
     → "connect with our team?" Yes → up to 3 optional times → sent to the
     LMS → full report.   No → nothing is sent.                          */
(function () {
  var BANK = window.FQ_BANK;
  var WEIGHTS = BANK.weights;
  var LMS_URL = String(window.FINOWISE_LMS_URL || "").replace(/\/+$/, "");
  var WHATSAPP = "919137654191";
  var TRUST = "Trusted by 2000+ happy families";
  var main = document.getElementById("fqMain");

  var run = {
    screen: "landing", stage: "", i: 0, picks: {}, mo: null,
    profile: { referralName: "", occupation: "", city: "" },
    client: null, result: null, completedAt: null,
    slots: ["", "", ""], note: "", sent: false, declined: false,
    banner: null, err: ""
  };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function stage(k) { return BANK.stages.filter(function (s) { return s.key === (k || run.stage); })[0] || null; }
  function questions() { var s = stage(); return s ? s.questions : []; }
  function firstName(n) { return String(n || "").trim().split(/\s+/)[0] || "Champion"; }
  function points(idx) { return Number(WEIGHTS[idx] !== undefined ? WEIGHTS[idx] : WEIGHTS[WEIGHTS.length - 1]) || 0; }
  function sectionNames() {
    var out = [];
    questions().forEach(function (q) { if (out.indexOf(q.section) < 0) out.push(q.section); });
    return out;
  }
  function quadOf(i) {
    var qs = questions(), q = qs[i];
    if (!q) return { name: "", pos: 0, of: 0 };
    var mates = qs.filter(function (x) { return x.section === q.section; });
    return { name: q.section, pos: mates.indexOf(q) + 1, of: mates.length };
  }
  function motivateFor(section) { return (BANK.motivate || []).filter(function (m) { return m.section === section; })[0] || null; }

  function render() {
    var body = run.screen === "landing" ? landingHtml()
      : run.screen === "lead" ? leadHtml()
      : run.screen === "reveal" ? revealHtml()
      : run.screen === "quiz" ? quizHtml()
      : run.screen === "milestone" ? milestoneHtml()
      : run.screen === "meet" ? meetHtml()
      : resultScreenHtml();
    main.innerHTML = body;
    var app = document.getElementById("fqApp");
    var top = app.getBoundingClientRect().top + window.scrollY - 110;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
  }
  function go(screen) { run.screen = screen; render(); }

  /* ---------------- landing (as the LMS) ---------------- */
  function landingHtml() {
    var stages = BANK.stages;
    return '<div style="display:flex;flex-direction:column;gap:40px">' +
      '<div class="fx-hero"><div style="display:flex;flex-direction:column;gap:24px">' +
        '<div><span class="fx-pill"><span class="fxg" style="width:28px;height:28px;border-radius:999px;display:grid;place-items:center;color:#fff;font-size:12px">FQ</span>' +
        ' Financial Quotient Assessment • 5 mins • Personalised by life stage</span></div>' +
        '<h1 class="fx-h1">Discover Your <span class="g">Financial</span> Quotient</h1>' +
        '<p class="fx-lede">Your life stage defines your financial pain. Your quotient defines your freedom.<br>' +
        '<b>20 questions. 4 indexes. One clear Freedom Blueprint.</b></p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">' +
          '<button class="fx-btn grad" data-act="start" data-testid="fq-landing-start">Start My FQ Assessment →</button>' +
          '<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(0,0,0,.6);padding:0 16px">' +
          '<span class="fx-avatars"><span style="background:#164B5E"></span><span style="background:#F25C2A"></span><span style="background:#0A1931"></span></span>4 life stages</div>' +
        '</div>' +
        '<div class="fx-brackets">' + stages.map(function (s) {
          return '<div class="fx-bracket"><div class="e">' + stageIcon(s) + '</div><div class="b">' + esc(s.label) + '</div></div>';
        }).join("") + '</div>' +
      '</div>' +
      '<div style="position:relative"><div style="position:absolute;inset:-24px;border-radius:32px;pointer-events:none;filter:blur(40px);background:linear-gradient(135deg,rgba(22,75,94,.1),rgba(242,92,42,.1),rgba(255,248,243,1))"></div>' +
        '<div class="fx-picker fx-glass fx-soft" style="position:relative">' +
          '<div style="display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600;letter-spacing:.02em">CHOOSE YOUR LIFE STAGE</div>' +
          '<div style="font-size:10px;padding:4px 8px;border-radius:999px;background:var(--fx-teal);color:#fff">4 BRACKETS</div></div>' +
          '<p style="font-size:12px;color:rgba(0,0,0,.6);margin:-12px 0 0">Tap any bracket to start - your questions adapt instantly</p>' +
          '<div style="display:grid;gap:16px">' + stages.map(function (s) {
            return '<button type="button" class="fx-stage fx-3d" data-act="pick" data-stage="' + s.key + '" data-testid="fq-pick-' + s.key + '">' +
              '<span class="ico" style="background:' + esc(s.color) + '12">' + stageIcon(s) + '</span>' +
              '<span style="min-width:0;flex:1;text-align:left"><span class="lbl" style="display:block">' + esc(s.label) + '</span>' +
              '<span class="tag" style="display:block">' + esc(s.tagline) + '</span></span><span class="go">→</span></button>';
          }).join("") + '</div>' +
          '<div class="fx-strip fxg"><div class="b">✦</div><div><div style="font-size:13px;font-weight:600">Personalized pain-based questions</div>' +
          '<div style="font-size:12px;opacity:.8">Not a generic quiz. Built for the stage you are actually in.</div></div></div>' +
        '</div></div>' +
      '</div>' +
      '<div class="fx-facts"><div><div class="n">20</div><div class="d">Precision questions per life stage</div></div>' +
      '<div><div class="n">4</div><div class="d">Indexes: Awareness • Clarity • Preparedness • Readiness</div></div>' +
      '<div><div class="n">5 min</div><div class="d">Get your FQ score + blueprint</div></div></div>' +
      '</div>';
  }
  var ICONS = { FQ_YOUNG: "🚀", FQ_YOUNGMARRIED: "💑", FQ_MARRIEDCHILD: "👨‍👩‍👧", FQ_GOLDEN: "👑" };
  function stageIcon(s) { return ICONS[s.key] || "✦"; }

  /* ---------------- personalise: life stage + the website's three fields ---------------- */
  var OCCUPATIONS = ["Salaried", "Business Owner", "Self-Employed Professional", "Government Employee", "Retired", "Homemaker", "Student", "Other"];
  function leadHtml() {
    var P = run.profile;
    return '<div class="fx-lead fx-glass fx-soft">' +
      '<div style="display:flex;gap:16px;align-items:flex-start;justify-content:space-between"><div>' +
        '<div style="font-size:12px;font-weight:600;letter-spacing:.12em;color:var(--fx-or)">PERSONALIZATION FIRST</div>' +
        '<h2 style="font-size:28px;font-weight:700;line-height:1.15;margin:4px 0 0">Let\'s Personalize Your Journey</h2>' +
        '<p style="color:rgba(0,0,0,.6);margin:8px 0 0;font-size:15px">We ask your life stage first because what matters at one stage is not what matters at another. Your questions will adapt.</p>' +
      '</div><div class="fxg" style="width:56px;height:56px;border-radius:16px;display:grid;place-items:center;color:#fff;font-size:20px;flex-shrink:0">✦</div></div>' +
      '<form class="fx-form" id="fqLeadForm" style="margin-top:20px" novalidate>' +
        '<div class="wide"><label for="fqStage">Choose Your Life Stage *</label>' +
          '<select class="fx-in" id="fqStage" data-testid="fq-stage-select"><option value="">Select your life stage</option>' +
          BANK.stages.map(function (s) { return '<option value="' + s.key + '"' + (run.stage === s.key ? " selected" : "") + '>' + esc(s.label) + ' — ' + esc(s.tagline) + '</option>'; }).join("") +
          '</select></div>' +
        '<div><label for="fqReferral">Referral Name *</label><input class="fx-in" id="fqReferral" maxlength="80" value="' + esc(P.referralName) + '" placeholder="Who referred you to us?" data-testid="fq-referral-input"></div>' +
        '<div><label for="fqOccupation">Occupation *</label><select class="fx-in" id="fqOccupation" data-testid="fq-occupation-select"><option value="">Select your occupation</option>' +
          OCCUPATIONS.map(function (o) { return '<option' + (P.occupation === o ? " selected" : "") + '>' + o + '</option>'; }).join("") + '</select></div>' +
        '<div class="wide"><label for="fqCity">City *</label><input class="fx-in" id="fqCity" maxlength="60" value="' + esc(P.city) + '" placeholder="e.g. Pune" data-testid="fq-city-input"></div>' +
        (run.err ? '<div class="wide"><div class="fx-note warn" style="margin:0;font-size:12.5px" data-testid="fq-form-error">' + run.err + '</div></div>' : "") +
        '<div class="wide" style="padding-top:8px"><button type="submit" class="fx-btn grad" style="width:100%" data-testid="fq-start-btn">Continue to Assessment →</button>' +
        '<div style="font-size:11px;color:rgba(0,0,0,.5);text-align:center;margin-top:12px">🔒 Your data is safe. We personalise the questions from the life stage you choose.</div></div>' +
      '</form></div>';
  }
  function leadSubmit() {
    var P = run.profile;
    run.stage = document.getElementById("fqStage").value;
    P.referralName = document.getElementById("fqReferral").value.trim();
    P.occupation = document.getElementById("fqOccupation").value;
    P.city = document.getElementById("fqCity").value.trim();
    var errs = [];
    if (!stage()) errs.push("Please choose your life stage.");
    if (P.referralName.length < 2) errs.push("Please enter the referral name.");
    if (!P.occupation) errs.push("Please select your occupation.");
    if (P.city.length < 2) errs.push("Please enter your city.");
    run.err = errs.map(esc).join("<br>");
    if (errs.length) { render(); return; }
    run.picks = {}; run.i = 0;
    go("reveal");
  }

  /* ---------------- stage reveal ---------------- */
  function revealHtml() {
    var s = stage(), n = questions().length, names = sectionNames();
    var asks = [["Awareness Index", "Do you see the leak?"], ["Clarity Index", "Do you know the number?"], ["Preparedness Index", "Are you protected?"]];
    return '<div class="fx-reveal fx-glass fx-soft fx-float"><div class="tile fxg">' + stageIcon(s) + '</div>' +
      '<div class="fx-chip" style="margin-top:20px">' + stageIcon(s) + ' ' + esc(s.label) + ' — ' + esc(s.tagline) + '</div>' +
      '<h2>You are in: ' + esc(s.label) + '</h2>' +
      '<p style="color:rgba(0,0,0,.6);margin:8px 0 0">We built ' + n + ' pain-based questions just for your life stage. Not generic finance gyaan.</p>' +
      '<div class="three">' + asks.filter(function (a) { return names.indexOf(a[0]) >= 0; }).map(function (a) {
        return '<div><div class="k">' + esc(a[0]) + '</div><div class="d">' + esc(a[1]) + '</div></div>'; }).join("") + '</div>' +
      '<button class="fx-btn grad" style="width:100%;margin-top:32px" data-act="begin" data-testid="fq-begin-btn">Start ' + n + ' Questions • 5 mins →</button>' +
      '<div style="margin-top:12px"><button class="fx-btn ghost" data-act="to-lead">← Change my details</button></div></div>';
  }

  /* ---------------- the questions: one at a time, in sets by index ---------------- */
  function quizHtml() {
    var s = stage(), qs = questions(), q = qs[run.i], total = qs.length, picked = run.picks[run.i], quad = quadOf(run.i);
    return '<div class="fx-quiz"><div class="fx-quiz-head">' +
        '<span class="fx-pill"><span style="width:24px;height:24px;border-radius:999px;display:grid;place-items:center;background:' + esc(s.color) + '15">' + stageIcon(s) + '</span> ' + esc(s.label) + '</span>' +
        '<button class="fx-btn ghost" data-act="to-reveal">← Back</button></div>' +
      '<div class="fx-quiz-card fx-glass fx-soft">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px">' +
          '<div class="fx-dots">' + qs.map(function (_, i) { return '<i class="' + (i < run.i ? "done" : i === run.i ? "now" : "") + '"></i>'; }).join("") + '</div>' +
          '<div class="fx-qidx" data-testid="fq-counter">Q ' + (run.i + 1) + ' of ' + total + ' • ' + esc(quad.name) + '</div></div>' +
        '<div style="margin-top:24px"><div class="fx-qsec" data-testid="fq-pillar-label">' + esc(quad.name) + '</div>' +
          '<h3 class="fx-q" data-testid="fq-question">' + esc(q.q) + '</h3></div>' +
        '<div class="fx-opts">' + q.a.map(function (o, i) {
          return '<button class="fx-opt' + (picked === i ? " sel" : "") + '" data-act="answer" data-i="' + i + '" data-testid="fq-option-' + i + '">' +
            '<span class="rad">' + (picked === i ? "<i></i>" : "") + '</span><span class="txt">' + esc(o) + '</span><span class="ltr">' + "ABCDEF"[i] + '</span></button>';
        }).join("") + '</div>' +
        '<div class="fx-qnav"><button class="fx-btn ghost" data-act="prev"' + (run.i === 0 ? " disabled" : "") + '>← Previous</button>' +
          '<div style="font-size:11px;color:rgba(0,0,0,.5)">' + esc(quad.name) + ' • ' + quad.pos + ' of ' + quad.of + '</div></div>' +
      '</div></div>';
  }
  function answer(i) {
    var qs = questions(), q = qs[run.i];
    run.picks[run.i] = i;
    render();
    var done = run.i + 1, next = qs[done];
    var ended = !!(next && next.section !== q.section);
    var mo = ended ? motivateFor(q.section) : null;
    setTimeout(function () {
      if (run.screen !== "quiz") return;
      if (done >= qs.length) { finish(); return; }
      if (mo) { run.mo = mo; go("milestone"); return; }
      run.i++; render();
    }, 350);
  }
  function milestoneHtml() {
    var m = run.mo || {}, quad = quadOf(run.i);
    return '<div class="fx-mile" data-testid="fq-milestone"><div class="top fxg"><div class="blob"></div><div class="kick">MILESTONE UNLOCKED</div>' +
      '<h3>' + esc(String(m.title || "").replace("{Name}", "Champion").replace(", Champion", "")) + '</h3><p>' + esc(m.msg || "") + '</p></div>' +
      '<div class="bot"><div style="display:flex;align-items:center;gap:12px"><div class="bolt">⚡</div>' +
        '<div><div style="font-size:13px;font-weight:600">' + (run.i + 1) + ' of ' + questions().length + ' completed</div>' +
        '<div style="font-size:12px;color:rgba(0,0,0,.6)">' + esc(quad.name) + ' done</div></div></div>' +
      '<button class="fx-btn grad" style="padding:12px 24px;font-size:15px;box-shadow:none" data-act="continue" data-testid="fq-continue-btn">Continue →</button></div></div>';
  }

  /* ---------------- scoring: the LMS's arithmetic ---------------- */
  function compute() {
    var s = stage(), top = Math.max.apply(null, WEIGHTS), sections = [], by = {}, raw = 0, max = 0;
    questions().forEach(function (q, i) {
      var pts = points(run.picks[i]);
      if (!by[q.section]) { by[q.section] = { name: q.section, score: 0, max: 0 }; sections.push(by[q.section]); }
      by[q.section].score += pts; by[q.section].max += top; raw += pts; max += top;
    });
    var pct = max > 0 ? Math.round(raw / max * 100) : 0;
    var band = s.bands.filter(function (b) { return pct >= b.minPct && pct <= b.maxPct; })[0] || s.bands[s.bands.length - 1];
    sections.forEach(function (q) { q.percent = q.max ? Math.round(q.score / q.max * 100) : 0; });
    var lowest = sections.reduce(function (a, b) { return b.percent < a.percent ? b : a; }, sections[0]);
    return { score: pct, raw: raw, max: max, band: band, sections: sections, lowest: lowest };
  }
  function sectionNote(q) { var n = BANK.sectionNotes[q.name]; return n ? (q.percent < 50 ? n.under : n.over) || "" : ""; }
  function analysisText(r) {
    var a = stage().analysis || {}, t = (r.lowest.percent < 50 ? a.under : a.over) || "";
    t = t.replace(/^At \{Age\},\s*(.)/, function (m, ch) { return ch.toUpperCase(); }).replace(/\{Age\}/g, "");
    return t.replace(/\{Lowest\}/g, r.lowest.name).replace(/\{lowest\}/g, r.lowest.name.toLowerCase()).replace(/\{Percent\}/g, String(r.lowest.percent));
  }
  function finish() {
    run.result = compute();
    run.completedAt = new Date().toISOString();
    run.sent = false; run.declined = false; run.banner = null; run.slots = ["", "", ""]; run.note = "";
    go("result");
  }

  /* ---------------- the result ---------------- */
  function ringHtml(score) {
    var circ = 326.56;
    return '<div class="fx-ring"><svg viewBox="0 0 120 120" aria-label="FQ score ' + score + ' out of 100">' +
      '<defs><linearGradient id="fxg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#164B5E"></stop><stop offset="100%" stop-color="#F25C2A"></stop></linearGradient></defs>' +
      '<circle cx="60" cy="60" r="52" fill="none" stroke="#EEE8E2" stroke-width="12"></circle>' +
      '<circle cx="60" cy="60" r="52" fill="none" stroke="url(#fxg1)" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (score / 100 * circ).toFixed(2) + ' ' + circ + '"></circle></svg>' +
      '<div class="mid"><div><div class="num" data-testid="fq-score">' + esc(String(score)) + '</div><div class="cap">FQ SCORE</div></div></div></div>';
  }
  function radarHtml(quads) {
    var n = Math.max(3, quads.length);
    function at(i, r) { var a = (i * (360 / n) - 45) * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; }
    function poly(r) { return quads.map(function (q, i) { var p = at(i, r === null ? q.percent / 100 * 80 : r); return p[0].toFixed(2) + "," + p[1].toFixed(2); }).join(" "); }
    return '<svg viewBox="0 0 200 200" width="100%" height="220" style="max-width:300px"><defs><linearGradient id="fxg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#164B5E"></stop><stop offset="100%" stop-color="#F25C2A"></stop></linearGradient></defs><g transform="translate(100,100)">' +
      [1, 2, 3, 4].map(function (k) { return '<polygon points="' + poly(k * 20) + '" fill="none" stroke="#EEE8E2" stroke-width="1"></polygon>'; }).join("") +
      quads.map(function (q, i) { var p = at(i, 80); return '<line x1="0" y1="0" x2="' + p[0].toFixed(2) + '" y2="' + p[1].toFixed(2) + '" stroke="#EEE8E2" stroke-width="1"></line>'; }).join("") +
      '<polygon points="' + poly(null) + '" fill="url(#fxg2)" fill-opacity="0.25" stroke="url(#fxg2)" stroke-width="2"></polygon>' +
      quads.map(function (q, i) { var p = at(i, q.percent / 100 * 80); return '<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="4" fill="#F25C2A" stroke="white" stroke-width="2"></circle>'; }).join("") +
      '</g>' + quads.map(function (q, i) { var p = at(i, 98);
        return '<text x="' + (100 + p[0]).toFixed(2) + '" y="' + (100 + p[1]).toFixed(2) + '" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="#0A1931">' + esc(q.name.replace(" Index", "")) + '</text>'; }).join("") +
      '</svg>';
  }
  function logoHtml() { return '<img src="../images/logo.png" alt="Finowise" class="fq-logo">'; }

  // Left panel: ring, category, stage chip. With full=true, the radar too.
  function leftPanelHtml(r, full, scoreShown) {
    var s = stage();
    return '<div class="fx-res-left fx-glass fx-soft"><div style="display:flex;align-items:center;gap:12px">' + logoHtml() +
      '<div style="font-size:11px;padding:4px 10px;border-radius:999px;background:var(--fx-teal);color:#fff;font-weight:600;letter-spacing:.02em">FQ REPORT</div></div>' +
      '<div style="margin-top:24px;display:flex;flex-direction:column;align-items:center;text-align:center">' +
        ringHtml(scoreShown ? r.score : 0).replace('data-testid="fq-score">0<', scoreShown ? 'data-testid="fq-score">' + r.score + '<' : 'data-testid="fq-score">??<') +
        '<h3 class="fx-band" data-testid="fq-band">' + esc(scoreShown ? r.band.category : "Your category") + '</h3>' +
        '<p class="fx-banddesc">' + esc(scoreShown ? r.band.note : "Submit your basic details to see where you stand.") + '</p>' +
        '<div class="fx-chip" style="margin-top:16px">' + stageIcon(s) + ' ' + esc(s.label) + (run.client ? ' • ' + esc(firstName(run.client.name)) : "") + '</div></div>' +
      (full ? '<div style="margin-top:32px"><div class="fx-sechead" style="margin-bottom:12px">YOUR ' + r.sections.length + '-AXIS RADAR</div>' +
        '<div style="background:#fff;border:1px solid rgba(0,0,0,.05);border-radius:20px;padding:16px;display:flex;justify-content:center">' + radarHtml(r.sections) + '</div></div>' : "") +
      '</div>';
  }
  // Right side of the full report: index cards, analysis, action steps.
  function fullRightHtml(r) {
    var s = stage();
    return '<div style="display:flex;flex-direction:column;gap:24px" data-testid="fq-full-result">' +
      '<div class="fx-quads">' + r.sections.map(function (q) {
        var tag = q.percent >= 75 ? ["s", "Strong"] : q.percent >= 50 ? ["a", "Average"] : ["w", "Needs Work"];
        return '<div class="fx-quad"><div class="row"><div class="nm">' + esc(q.name) + '</div><div class="tag ' + tag[0] + '">' + tag[1] + '</div></div>' +
          '<div style="margin-top:8px;display:flex;align-items:flex-end;gap:8px"><div class="big">' + q.percent + '%</div><div class="of">' + q.score + '/' + q.max + '</div></div>' +
          '<div class="bar"><i class="fxg" style="width:' + q.percent + '%"></i></div><div class="say">' + esc(sectionNote(q)) + '</div></div>';
      }).join("") + '</div>' +
      '<div class="fx-anal"><div class="kick">PERSONALIZED ANALYSIS FOR ' + esc(s.label.toUpperCase()) + '</div>' +
        '<h4 data-testid="fq-lowest">Your lowest is ' + esc(r.lowest.name) + ' — that\'s your freedom bottleneck</h4>' +
        '<p>' + esc(analysisText(r)) + '</p>' +
        (s.actions.length ? '<div style="margin-top:20px"><div class="fx-sechead">YOUR ' + s.actions.length + ' IMMEDIATE ACTION STEPS</div><div style="margin-top:12px;display:grid;gap:8px">' +
          s.actions.map(function (a, i) { return '<div class="fx-step"><div class="n fxg">' + (i + 1) + '</div><div class="t">' + esc(a) + '</div></div>'; }).join("") + '</div></div>' : "") +
      '</div>' +
      '<div class="fx-cta fxg"><div class="in"><h4>Your Freedom Blueprint is waiting</h4>' +
        '<div class="sub">Our team has your full report and will reach out for your personalised 1:1 blueprint with exact numbers, not generic advice.</div>' +
        '<div style="margin-top:16px;display:flex;align-items:center;gap:8px;font-size:11px;color:rgba(0,0,0,.5);justify-content:center"><span class="fx-dot"></span> ' + TRUST + '</div></div></div>' +
      '</div>';
  }

  function detailsFormHtml() {
    return '<div class="fx-lead fx-glass fx-soft" style="max-width:none">' +
      '<div style="font-size:12px;font-weight:600;letter-spacing:.12em;color:var(--fx-or)">ONE LAST STEP</div>' +
      '<h2 style="font-size:24px;font-weight:700;line-height:1.2;margin:4px 0 0">Unlock your FQ score</h2>' +
      '<p style="color:rgba(0,0,0,.6);margin:8px 0 0;font-size:14px">Share your basic details to see your score.</p>' +
      '<form class="fx-form" id="fqDetailsForm" style="margin-top:20px" novalidate data-testid="fq-details-form">' +
        '<div class="wide"><label for="fqName">Full Name *</label><input class="fx-in" id="fqName" maxlength="80" placeholder="e.g. Aarav Mehta" data-testid="fq-name-input"></div>' +
        '<div><label for="fqPhone">Mobile (+91) *</label><input class="fx-in" id="fqPhone" type="tel" maxlength="16" placeholder="98765 43210" data-testid="fq-phone-input"></div>' +
        '<div><label for="fqEmail">Email ID</label><input class="fx-in" id="fqEmail" type="email" maxlength="120" placeholder="aarav@email.com" data-testid="fq-email-input"></div>' +
        (run.err ? '<div class="wide"><div class="fx-note warn" style="margin:0;font-size:12.5px" data-testid="fq-form-error">' + run.err + '</div></div>' : "") +
        '<div class="wide" style="padding-top:4px"><button type="submit" class="fx-btn grad" style="width:100%" data-testid="fq-unlock-btn">🔓 Unlock My FQ Score</button></div>' +
      '</form></div>';
  }
  function connectHtml() {
    return '<div class="fq-connect fx-glass fx-soft" data-testid="fq-connect"><h3>Would you like to connect with our team to understand your FQ score and get more detailed insights?</h3>' +
      '<div class="row"><button class="fx-btn grad" data-act="yes" data-testid="fq-yes-btn">Yes</button>' +
      '<button class="fx-btn ghost" data-act="no" data-testid="fq-no-btn">No</button></div></div>';
  }
  function bannerHtml() {
    if (!run.banner) return "";
    return '<div class="fq-banner ' + run.banner.cls + '" data-testid="fq-save-msg">' + run.banner.html + '</div>';
  }
  function footHtml() {
    return '<div class="fx-foot"><button class="fx-btn ghost" data-act="retake" data-testid="fq-retake-btn">Retake Assessment</button>' +
      '<button class="fx-btn ghost" data-act="home">Back to Start</button></div>';
  }

  function resultScreenHtml() {
    var r = run.result;
    if (!run.client) {
      // Locked: the score is worked out but not on the page until they give their details.
      return '<div class="fx-res"><div class="fx-res-grid">' +
        '<div class="fq-lock is-locked"><div class="fq-lock-body" aria-hidden="true">' + leftPanelHtml(r, false, false) + '</div>' +
        '<div class="fq-lock-badge" data-testid="fq-lock-note">🔒 Submit your basic details to unlock your FQ score</div></div>' +
        detailsFormHtml() + '</div>' + footHtml() + '</div>';
    }
    if (run.sent) {
      return '<div class="fx-res">' + bannerHtml() + '<div class="fx-res-grid">' + leftPanelHtml(r, true, true) + fullRightHtml(r) + '</div>' + footHtml() + '</div>';
    }
    return '<div class="fx-res"><div class="fq-stack" style="max-width:768px;margin:0 auto;width:100%">' + leftPanelHtml(r, false, true) +
      (run.declined ? "" : connectHtml()) + bannerHtml() + '</div>' + footHtml() + '</div>';
  }
  function detailsSubmit() {
    var name = document.getElementById("fqName").value.trim();
    var phone = document.getElementById("fqPhone").value.trim();
    var email = document.getElementById("fqEmail").value.trim();
    var digits = phone.replace(/\D/g, "").slice(-10);
    var errs = [];
    if (name.length < 2) errs.push("Please enter your full name.");
    if (!/^[6-9]\d{9}$/.test(digits)) errs.push("Please enter a valid 10-digit mobile number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("Please enter a valid email.");
    run.err = errs.map(esc).join("<br>");
    if (errs.length) {
      render();
      document.getElementById("fqName").value = name; document.getElementById("fqPhone").value = phone; document.getElementById("fqEmail").value = email;
      return;
    }
    run.client = { name: name, phone: digits, email: email || null };
    render();
  }

  /* ---------------- connect to team: up to 3 optional times ---------------- */
  function meetHtml() {
    var min = new Date(Date.now() + 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return '<div class="fx-lead fx-glass fx-soft" data-testid="fq-slots-form">' +
      '<div style="display:flex;gap:16px;align-items:flex-start;justify-content:space-between"><div>' +
        '<div style="font-size:12px;font-weight:600;letter-spacing:.12em;color:var(--fx-or)">CONNECT TO TEAM</div>' +
        '<h2 style="font-size:28px;font-weight:700;line-height:1.15;margin:4px 0 0">When suits you?</h2>' +
        '<p style="color:rgba(0,0,0,.6);margin:8px 0 0;font-size:15px">Name up to 3 times that work for you and our team will confirm one of them — or leave the time to us and we will offer you one.</p>' +
      '</div><div class="fxg" style="width:56px;height:56px;border-radius:16px;display:grid;place-items:center;color:#fff;font-size:20px;flex-shrink:0">🗓</div></div>' +
      '<form class="fx-form" id="fqSlots" style="margin-top:20px" novalidate>' +
        [0, 1, 2].map(function (i) {
          return '<div class="' + (i === 2 ? "wide" : "") + '"><label for="fqSlot' + (i + 1) + '">Preferred time ' + (i + 1) + ' <span style="font-weight:400;opacity:.65">(optional)</span></label>' +
            '<input class="fx-in" type="datetime-local" id="fqSlot' + (i + 1) + '" min="' + min + '" value="' + esc(run.slots[i]) + '" data-testid="fq-slot-' + (i + 1) + '"></div>';
        }).join("") +
        '<div class="wide"><label for="fqNote">Anything you would like to cover (optional)</label><textarea class="fx-in" id="fqNote" maxlength="500" style="min-height:84px" data-testid="fq-note">' + esc(run.note) + '</textarea></div>' +
        (run.err ? '<div class="wide"><div class="fx-note warn" style="margin:0;font-size:12.5px" data-testid="fq-form-error">' + run.err + '</div></div>' : "") +
        (run.banner ? '<div class="wide">' + bannerHtml() + '</div>' : "") +
        '<div class="wide" style="padding-top:8px"><button type="submit" class="fx-btn grad" style="width:100%" id="fqSlotsSend" data-testid="fq-slots-send">Send my preferred times →</button>' +
          '<div style="text-align:center;margin-top:12px"><button type="button" class="fx-btn ghost" data-act="skip" id="fqSlotsSkip" data-testid="fq-slots-skip">I\'ll leave the time to you →</button></div>' +
          '<div style="text-align:center;margin-top:8px"><button type="button" class="fx-btn ghost" data-act="to-result">← Back to my result</button></div></div>' +
      '</form></div>';
  }
  function readMeet() {
    run.slots = [1, 2, 3].map(function (n) { return document.getElementById("fqSlot" + n).value.trim(); });
    run.note = document.getElementById("fqNote").value.trim();
  }
  function slotErrors(slots) {
    var seen = {}, errs = [];
    slots.forEach(function (v) {
      if (seen[v]) errs.push("Two of those are the same time. Please give different ones.");
      seen[v] = 1;
      if (isNaN(new Date(v).getTime())) errs.push("Please set both the date and the time, or leave the box empty.");
      else if (new Date(v).getTime() <= Date.now()) errs.push("One of those times has already passed. Please pick times still to come.");
    });
    return errs.filter(function (e, k) { return errs.indexOf(e) === k; });
  }

  function payload(slots) {
    var r = run.result, s = stage();
    return {
      name: run.client.name, mobile: run.client.phone, email: run.client.email || "",
      city: run.profile.city, referralName: run.profile.referralName, occupation: run.profile.occupation,
      consent: true, slots: slots, note: run.note,
      fq: {
        score: r.score, points: r.raw, max: r.max, band: r.band.category, stage: s.key, stageLabel: s.label,
        sections: r.sections.map(function (q) { return { name: q.name, score: q.score, max: q.max }; }),
        pillars: r.sections.reduce(function (o, q) { o[q.name] = q.percent; return o; }, {}),
        completedAt: run.completedAt,
        answers: questions().map(function (q, i) {
          var idx = run.picks[i];
          return { pillar: q.section, question: q.q, option: "ABCDEF"[idx], answer: q.a[idx], points: points(idx) };
        })
      }
    };
  }
  function whatsappBanner(slots) {
    var p = payload(slots);
    var text = "Hi Finowise, I just took the FQ test and would like to connect with your team.\nName: " + p.name + "\nMobile: " + p.mobile +
      (p.email ? "\nEmail: " + p.email : "") + "\nCity: " + p.city + "\nReferral: " + p.referralName + "\nOccupation: " + p.occupation +
      "\nLife stage: " + p.fq.stageLabel + "\nFQ Score: " + p.fq.score + "/100 (" + p.fq.band + ")" +
      (slots.length ? "\nPreferred times: " + slots.map(function (v) { return new Date(v).toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }).join(", ") : "") +
      (p.note ? "\nNote: " + p.note : "");
    run.banner = { cls: "err", html: "We could not reach our team just now. Please tap below to send your request on WhatsApp.<br>" +
      '<a class="fx-btn ghost" target="_blank" rel="noopener" data-testid="fq-whatsapp-btn" href="https://wa.me/' + WHATSAPP + "?text=" + encodeURIComponent(text) + '">Send on WhatsApp</a>' };
  }
  function send(slots) {
    if (run.sent) return;
    run.err = ""; run.banner = { cls: "ok", html: "Sending your details to our team…" };
    render();
    if (!LMS_URL) { whatsappBanner(slots); render(); return; }
    fetch(LMS_URL + "/api/public/website-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(slots)) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, d: d, status: res.status }; }); })
      .then(function (x) {
        if (x.ok && x.d && x.d.ok) {
          run.sent = true;
          run.banner = { cls: "ok", html: esc(x.d.message || "Thank you! Our team will get in touch with you shortly.") +
            (slots.length ? " We will confirm one of the times you gave." : " We will suggest a time that suits you.") };
          run.screen = "result";
        } else if (x.status === 400 && x.d && x.d.message) {
          run.banner = null; run.err = esc(x.d.message);
        } else {
          whatsappBanner(slots);
        }
        render();
      })
      .catch(function () { whatsappBanner(slots); render(); });
  }

  /* ---------------- events ---------------- */
  main.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var act = b.getAttribute("data-act");
    if (act === "start") { run.err = ""; go("lead"); }
    else if (act === "pick") { run.stage = b.getAttribute("data-stage"); run.err = ""; go("lead"); }
    else if (act === "to-lead") { go("lead"); }
    else if (act === "begin") { run.i = 0; run.picks = {}; go("quiz"); }
    else if (act === "to-reveal") { go("reveal"); }
    else if (act === "answer") { answer(Number(b.getAttribute("data-i"))); }
    else if (act === "prev") { if (run.i > 0) { run.i--; render(); } }
    else if (act === "continue") { run.mo = null; run.i++; go("quiz"); }
    else if (act === "yes") { run.err = ""; run.banner = null; go("meet"); }
    else if (act === "no") { run.declined = true; run.banner = { cls: "ok", html: "No problem! Thank you for taking the FQ test. You can reach us any time if you would like to talk." }; render(); }
    else if (act === "skip") { run.slots = ["", "", ""]; readMeetNoteOnly(); send([]); }
    else if (act === "to-result") { run.err = ""; run.banner = null; go("result"); }
    else if (act === "retake") { run.i = 0; run.picks = {}; run.banner = null; run.err = ""; go("quiz"); }
    else if (act === "home") { run.i = 0; run.picks = {}; run.result = null; run.banner = null; run.err = ""; go("landing"); }
  });
  function readMeetNoteOnly() { var n = document.getElementById("fqNote"); run.note = n ? n.value.trim() : ""; }
  main.addEventListener("submit", function (e) {
    e.preventDefault();
    if (e.target.id === "fqLeadForm") leadSubmit();
    else if (e.target.id === "fqDetailsForm") detailsSubmit();
    else if (e.target.id === "fqSlots") {
      readMeet();
      var slots = run.slots.filter(Boolean);
      var errs = slotErrors(slots);
      run.err = errs.map(esc).join("<br>");
      if (errs.length) { run.banner = null; render(); return; }
      send(slots);
    }
  });

  render();
})();
