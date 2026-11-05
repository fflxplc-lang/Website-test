(function () {
  // Questions, scoring, bands and analysis come from the BOSS LMS's own FQ
  // assessment (js/fq-bank.js): 20 questions for the client's age group,
  // answers worth 8 / 4 / 2 / 1, score = points as a percentage of the maximum.
  var BANK = window.FQ_BANK;
  var WEIGHTS = BANK.weights;
  var QUESTIONS = [];
  var STAGE = null;
  function stageByKey(k) { return BANK.stages.filter(function (s) { return s.key === k; })[0] || null; }

  var $ = function (id) { return document.getElementById(id); };
  var LMS_URL = String(window.FINOWISE_LMS_URL || "").replace(/\/+$/, "");
  // profile: from the first form. client: from the details form. result: set on finish.
  var state = { i: 0, answers: {}, profile: null, client: null, result: null, completedAt: null, sent: false };

  function show(id) {
    ["fqIntro", "fqQuiz", "fqResult"].forEach(function (s) { $(s).classList.toggle("is-active", s === id); });
    var card = $("fqIntro").closest(".fq-card");
    var top = card.getBoundingClientRect().top + window.scrollY - 120;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
  }

  function msg(el, cls, text) {
    el.innerHTML = "";
    if (!text) return;
    var d = document.createElement("div");
    d.className = "fq-msg " + cls;
    d.textContent = text;
    el.appendChild(d);
    return d;
  }

  function formErrors(form, errs) {
    var old = form.querySelector(".fq-msg");
    if (old) old.remove();
    if (!errs.length) return false;
    var d = document.createElement("div");
    d.className = "fq-msg err";
    d.setAttribute("data-testid", "fq-form-error");
    d.innerHTML = errs.join("<br>");
    form.prepend(d);
    return true;
  }

  function renderQuestion() {
    var item = QUESTIONS[state.i];
    $("fqPillarLabel").textContent = item.section;
    $("fqCounter").textContent = "Question " + (state.i + 1) + " of " + QUESTIONS.length;
    $("fqProgress").style.width = (state.i / QUESTIONS.length) * 100 + "%";
    $("fqQuestion").textContent = item.q;
    var box = $("fqOptions");
    box.innerHTML = "";
    item.a.forEach(function (text, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fq-option" + (state.answers[state.i] === idx ? " is-selected" : "");
      b.setAttribute("data-testid", "fq-option-" + idx);
      b.innerHTML = '<span class="fq-letter">' + "ABCDEFGH"[idx] + "</span><span></span>";
      b.lastChild.textContent = text;
      b.addEventListener("click", function () {
        state.answers[state.i] = idx;
        renderQuestion();
        setTimeout(next, 280);
      });
      box.appendChild(b);
    });
    $("fqBack").style.visibility = state.i === 0 ? "hidden" : "visible";
    $("fqNext").disabled = state.answers[state.i] === undefined;
    $("fqNext").innerHTML = state.i === QUESTIONS.length - 1 ? 'See My FQ Score <i class="fa-solid fa-check"></i>' : 'Next <i class="fa-solid fa-arrow-right"></i>';
  }

  function next() {
    if (state.answers[state.i] === undefined) return;
    if (state.i < QUESTIONS.length - 1) { state.i++; renderQuestion(); } else { finish(); }
  }

  function points(idx) { return Number(WEIGHTS[idx] !== undefined ? WEIGHTS[idx] : WEIGHTS[WEIGHTS.length - 1]) || 0; }

  // Same arithmetic as the LMS (computeFQScore / fqaResultCtx).
  function compute() {
    var top = Math.max.apply(null, WEIGHTS);
    var sections = [], byName = {}, raw = 0, max = 0;
    QUESTIONS.forEach(function (item, i) {
      var pts = points(state.answers[i]);
      if (!byName[item.section]) { byName[item.section] = { name: item.section, score: 0, max: 0 }; sections.push(byName[item.section]); }
      byName[item.section].score += pts;
      byName[item.section].max += top;
      raw += pts;
      max += top;
    });
    var pct = max > 0 ? Math.round(raw / max * 100) : 0;
    var band = STAGE.bands.filter(function (b) { return pct >= b.minPct && pct <= b.maxPct; })[0] || STAGE.bands[STAGE.bands.length - 1];
    sections.forEach(function (q) { q.percent = q.max ? Math.round(q.score / q.max * 100) : 0; });
    var lowest = sections.reduce(function (a, b) { return b.percent < a.percent ? b : a; }, sections[0]);
    return { score: pct, raw: raw, max: max, band: band, sections: sections, lowest: lowest };
  }

  function sectionNote(q) {
    var n = BANK.sectionNotes[q.name];
    return n ? (q.percent < 50 ? n.under : n.over) || "" : "";
  }

  function analysisText(r) {
    var a = STAGE.analysis || {};
    var t = (r.lowest.percent < 50 ? a.under : a.over) || "";
    t = t.replace(/^At \{Age\},\s*(.)/, function (m, ch) { return ch.toUpperCase(); }).replace(/\{Age\}/g, "");
    return t.replace(/\{Lowest\}/g, r.lowest.name).replace(/\{lowest\}/g, r.lowest.name.toLowerCase()).replace(/\{Percent\}/g, String(r.lowest.percent));
  }

  // The full report: index-wise breakdown, analysis and action steps.
  // Shown only after the client says Yes and their details reach the team.
  function showFull() {
    var r = state.result;
    var bars = $("fqBars");
    bars.innerHTML = "";
    r.sections.forEach(function (q) {
      var row = document.createElement("div");
      row.className = "fq-bar-row";
      row.innerHTML = '<span></span><div class="fq-bar"><span style="width:0"></span></div><span>' + q.percent + "%</span>";
      row.firstChild.textContent = q.name;
      bars.appendChild(row);
      var note = sectionNote(q);
      if (note) {
        var d = document.createElement("div");
        d.className = "fq-bar-note";
        d.textContent = q.score + "/" + q.max + " · " + note;
        bars.appendChild(d);
      }
      setTimeout(function () { row.querySelector(".fq-bar span").style.width = q.percent + "%"; }, 60);
    });
    $("fqLowestHead").textContent = "Your lowest is " + r.lowest.name + " — that's your freedom bottleneck";
    $("fqAnalysis").textContent = analysisText(r);
    $("fqTips").innerHTML = "";
    (STAGE.actions || []).forEach(function (a) {
      var li = document.createElement("li");
      li.textContent = a;
      $("fqTips").appendChild(li);
    });
    $("fqFull").hidden = false;
  }

  // The result step starts locked: the score is worked out but not written
  // into the page until the client has given their basic details.
  function lockResult() {
    $("fqScoreBox").classList.add("is-locked");
    $("fqLockNote").hidden = false;
    $("fqScore").textContent = "??";
    $("fqBand").textContent = "Your FQ band";
    $("fqBand").style.background = "";
    $("fqHeadline").textContent = "Your FQ score is ready";
    $("fqSummary").textContent = "Submit your basic details to see where you stand.";
    $("fqRingArc").style.strokeDashoffset = 465;
    $("fqRingArc").style.stroke = "#C63204";
    $("fqDetailsForm").hidden = false;
    $("fqConnect").hidden = true;
    $("fqFull").hidden = true;
    $("fqSlots").hidden = true;
    state.slots = [];
    $("fqConnectBtns").hidden = false;
    msg($("fqSaveMsg"), "", "");
  }

  function finish() {
    $("fqProgress").style.width = "100%";
    state.result = compute();
    state.completedAt = new Date().toISOString();
    state.sent = false;
    lockResult();
    show("fqResult");
    if (state.client) {
      // Retake: their details are already in hand, so the new score is shown straight away.
      unlock();
    }
  }

  // Score and band only: the pillar breakdown and analysis stay with the team.
  function unlock() {
    var r = state.result, band = r.band;
    $("fqScoreBox").classList.remove("is-locked");
    $("fqLockNote").hidden = true;
    $("fqDetailsForm").hidden = true;
    $("fqBand").textContent = STAGE.label;
    $("fqBand").style.background = STAGE.color;
    $("fqHeadline").textContent = band.category;
    $("fqSummary").textContent = band.note;
    $("fqRingArc").style.stroke = band.color;
    var n = 0, el = $("fqScore");
    el.textContent = "0";
    var t = setInterval(function () { n = Math.min(r.score, n + 2); el.textContent = n; if (n >= r.score) clearInterval(t); }, 18);
    requestAnimationFrame(function () { $("fqRingArc").style.strokeDashoffset = 465 - (465 * r.score) / 100; });
    $("fqConnect").hidden = false;
  }

  function payload() {
    var r = state.result;
    return {
      name: state.client.name,
      mobile: state.client.phone,
      email: state.client.email || "",
      city: state.profile.city,
      referralName: state.profile.referralName,
      occupation: state.profile.occupation,
      consent: true,
      fq: {
        score: r.score,
        points: r.raw,
        max: r.max,
        band: r.band.category,
        stage: STAGE.key,
        stageLabel: STAGE.label,
        sections: r.sections.map(function (q) { return { name: q.name, score: q.score, max: q.max }; }),
        pillars: r.sections.reduce(function (o, q) { o[q.name] = q.percent; return o; }, {}),
        completedAt: state.completedAt,
        answers: QUESTIONS.map(function (item, i) {
          var idx = state.answers[i];
          return { pillar: item.section, question: item.q, option: "ABCDEFGH"[idx], answer: item.a[idx], points: points(idx) };
        })
      }
    };
  }

  // Only if the LMS cannot be reached: hand over on WhatsApp so the request is not lost.
  function whatsappFallback() {
    var p = payload();
    var text = "Hi Finowise, I just took the FQ test and would like to connect with your team.\nName: " + p.name + "\nMobile: " + p.mobile +
      (p.email ? "\nEmail: " + p.email : "") + "\nCity: " + p.city + "\nReferral: " + p.referralName + "\nOccupation: " + p.occupation +
      "\nFQ Score: " + p.fq.score + "/100" +
      (state.slots && state.slots.length ? "\nPreferred times: " + state.slots.map(function (v) { return new Date(v).toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }).join(", ") : "");
    var box = msg($("fqSaveMsg"), "err", "We could not reach our team just now. Please tap below to send your request on WhatsApp.");
    var a = document.createElement("a");
    a.className = "btn btn-outline-dark";
    a.style.marginTop = "12px";
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("data-testid", "fq-whatsapp-btn");
    a.href = "https://wa.me/919137654191?text=" + encodeURIComponent(text);
    a.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Send on WhatsApp';
    box.appendChild(document.createElement("br"));
    box.appendChild(a);
  }

  // Yes: ask for up to 3 preferred times (all optional), then send.
  $("fqYes").addEventListener("click", function () {
    if (state.sent) return;
    $("fqConnectBtns").hidden = true;
    var min = new Date(Date.now() + 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    ["fqSlot1", "fqSlot2", "fqSlot3"].forEach(function (id) { $(id).min = min; });
    $("fqSlots").hidden = false;
    msg($("fqSaveMsg"), "", "");
  });

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

  function send(slots, btn) {
    if (state.sent) return;
    btn.disabled = true;
    state.slots = slots;
    msg($("fqSaveMsg"), "ok", "Sending your details to our team…");
    if (!LMS_URL) { whatsappFallback(); btn.disabled = false; return; }
    var body = payload();
    body.slots = slots;
    fetch(LMS_URL + "/api/public/website-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, d: d, status: res.status }; }); })
      .then(function (x) {
        btn.disabled = false;
        if (x.ok && x.d && x.d.ok) {
          state.sent = true;
          $("fqConnect").hidden = true;
          msg($("fqSaveMsg"), "ok", (x.d.message || "Thank you! Our team will get in touch with you shortly.") +
            (slots.length ? " We will confirm one of the times you gave." : " We will suggest a time that suits you."));
          showFull();
        } else if (x.status === 400 && x.d && x.d.message) {
          msg($("fqSaveMsg"), "err", x.d.message);
        } else {
          whatsappFallback();
        }
      })
      .catch(function () { btn.disabled = false; whatsappFallback(); });
  }

  $("fqSlots").addEventListener("submit", function (e) {
    e.preventDefault();
    var slots = ["fqSlot1", "fqSlot2", "fqSlot3"].map(function (id) { return $(id).value.trim(); }).filter(Boolean);
    var errs = slotErrors(slots);
    if (formErrors(this, errs)) return;
    send(slots, $("fqSlotsSend"));
  });
  $("fqSlotsSkip").addEventListener("click", function () {
    ["fqSlot1", "fqSlot2", "fqSlot3"].forEach(function (id) { $(id).value = ""; });
    formErrors($("fqSlots"), []);
    send([], this);
  });

  $("fqNo").addEventListener("click", function () {
    $("fqConnectBtns").hidden = true;
    msg($("fqSaveMsg"), "ok", "No problem! Thank you for taking the FQ test. You can reach us any time if you would like to talk.");
  });

  $("fqLeadForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = new FormData(this);
    var referralName = (f.get("referralName") || "").trim();
    var occupation = (f.get("occupation") || "").trim();
    var city = (f.get("city") || "").trim();
    var stage = stageByKey(f.get("stage") || "");
    var errs = [];
    if (referralName.length < 2) errs.push("Please enter the referral name.");
    if (!occupation) errs.push("Please select your occupation.");
    if (city.length < 2) errs.push("Please enter your city.");
    if (!stage) errs.push("Please select your age group.");
    if (formErrors(this, errs)) return;
    state.profile = { referralName: referralName, occupation: occupation, city: city };
    STAGE = stage;
    QUESTIONS = stage.questions;
    state.i = 0;
    state.answers = {};
    renderQuestion();
    show("fqQuiz");
  });

  $("fqDetailsForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = new FormData(this);
    var name = (f.get("name") || "").trim();
    var phone = (f.get("phone") || "").trim();
    var email = (f.get("email") || "").trim();
    var digits = phone.replace(/\D/g, "").slice(-10);
    var errs = [];
    if (name.length < 2) errs.push("Please enter your full name.");
    if (!/^[6-9]\d{9}$/.test(digits)) errs.push("Please enter a valid 10-digit mobile number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("Please enter a valid email.");
    if (formErrors(this, errs)) return;
    state.client = { name: name, phone: digits, email: email || null };
    unlock();
  });

  BANK.stages.forEach(function (st) {
    var o = document.createElement("option");
    o.value = st.key;
    o.textContent = st.label;
    $("fqStage").appendChild(o);
  });

  $("fqNext").addEventListener("click", next);
  $("fqBack").addEventListener("click", function () { if (state.i > 0) { state.i--; renderQuestion(); } });
  $("fqRetake").addEventListener("click", function () {
    state.i = 0; state.answers = {};
    lockResult();
    renderQuestion();
    show("fqQuiz");
  });
})();
