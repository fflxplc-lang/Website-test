(function () {
  var QUESTIONS = [
    { p: "Earning", q: "How stable and predictable is your household income?", o: ["Very stable with regular growth", "Stable but rarely grows", "Fluctuates month to month", "Uncertain / no regular income"] },
    { p: "Earning", q: "How many sources of income does your family have?", o: ["Three or more (salary, rent, dividends…)", "Two sources", "Only one source", "Depends fully on one person with no backup"] },
    { p: "Saving", q: "What share of your monthly income do you save or invest?", o: ["More than 30%", "20% – 30%", "10% – 20%", "Less than 10%"] },
    { p: "Saving", q: "How many months of expenses can your emergency fund cover?", o: ["6 months or more", "3 – 6 months", "Less than 3 months", "I don't have an emergency fund"] },
    { p: "Investing", q: "How do you choose your investments?", o: ["Mapped to specific life goals with a plan", "Based on advice from a professional", "Tips from friends, family or social media", "I don't invest yet"] },
    { p: "Investing", q: "When markets fall 20%, what do you usually do?", o: ["Stay invested or invest more", "Stay invested but feel anxious", "Stop my SIPs for a while", "Redeem to avoid further losses"] },
    { p: "Protection", q: "How much life cover do you have compared to your annual income?", o: ["10x or more (term plan)", "5x – 10x", "Less than 5x", "No life cover / only endowment policies"] },
    { p: "Protection", q: "Is your family covered by an adequate health insurance policy?", o: ["Yes, family floater plus top-up", "Yes, a personal family floater", "Only employer-provided cover", "No health cover"] },
    { p: "Planning", q: "Have you calculated the corpus you need for retirement?", o: ["Yes, and I'm on track with a plan", "Yes, but I'm not on track", "I have a rough idea", "Not at all"] },
    { p: "Planning", q: "How often do you review your finances and portfolio?", o: ["Every 6 months or more often", "Once a year", "Only when something goes wrong", "Never"] }
  ];
  var POINTS = [10, 7, 4, 0];
  var PILLARS = ["Earning", "Saving", "Investing", "Protection", "Planning"];
  var TIPS = {
    Earning: "Build a second income stream — rental, dividend or skill-based — so one disruption doesn't stall your goals.",
    Saving: "Automate a 'pay yourself first' SIP on salary day and park 6 months of expenses in a liquid emergency fund.",
    Investing: "Map every investment to a goal and time horizon; stay disciplined through market cycles with a goal-based portfolio.",
    Protection: "Secure a pure term cover of 10–15x annual income and a family health floater with a super top-up.",
    Planning: "Get a Freedom Blueprint — calculate your retirement corpus and review your plan at least twice a year."
  };
  var BANDS = [
    { min: 80, band: "Freedom Ready", color: "#27ae60", head: "Excellent! You are on the path to Financial Freedom.", sum: "Your money habits are strong. A periodic review and fine-tuning of asset allocation can help you reach your goals sooner." },
    { min: 60, band: "Wealth Builder", color: "#0A4A54", head: "Good going — a few gaps to close.", sum: "You have a solid base. Strengthening your weaker pillars can significantly improve your freedom timeline." },
    { min: 40, band: "Getting Started", color: "#F07A2A", head: "You've started — now build the system.", sum: "Your intent is right, but a structured plan will bring clarity and discipline to your money decisions." },
    { min: 0, band: "Needs Attention", color: "#C63204", head: "Time to take charge of your finances.", sum: "Don't worry — every freedom journey starts here. A guided blueprint can quickly put the right foundation in place." }
  ];

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
    $("fqPillarLabel").textContent = item.p;
    $("fqCounter").textContent = "Question " + (state.i + 1) + " of " + QUESTIONS.length;
    $("fqProgress").style.width = (state.i / QUESTIONS.length) * 100 + "%";
    $("fqQuestion").textContent = item.q;
    var box = $("fqOptions");
    box.innerHTML = "";
    item.o.forEach(function (text, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fq-option" + (state.answers[state.i] === idx ? " is-selected" : "");
      b.setAttribute("data-testid", "fq-option-" + idx);
      b.innerHTML = '<span class="fq-letter">' + "ABCD"[idx] + "</span><span></span>";
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

  function compute() {
    var pillars = {}, total = 0;
    PILLARS.forEach(function (p) { pillars[p] = 0; });
    QUESTIONS.forEach(function (item, i) {
      var pts = POINTS[state.answers[i]];
      pillars[item.p] += pts * 5;
      total += pts;
    });
    return { score: total, pillars: pillars };
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
    $("fqConnectBtns").hidden = false;
    msg($("fqSaveMsg"), "", "");
  }

  function finish() {
    $("fqProgress").style.width = "100%";
    var r = compute();
    r.band = BANDS.filter(function (b) { return r.score >= b.min; })[0];
    state.result = r;
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
    $("fqBand").textContent = band.band;
    $("fqBand").style.background = band.color;
    $("fqHeadline").textContent = band.head;
    $("fqSummary").textContent = band.sum;
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
        band: r.band.band,
        pillars: r.pillars,
        completedAt: state.completedAt,
        answers: QUESTIONS.map(function (item, i) {
          var idx = state.answers[i];
          return { pillar: item.p, question: item.q, option: "ABCD"[idx], answer: item.o[idx], points: POINTS[idx] };
        })
      }
    };
  }

  // Only if the LMS cannot be reached: hand over on WhatsApp so the request is not lost.
  function whatsappFallback() {
    var p = payload();
    var text = "Hi Finowise, I just took the FQ test and would like to connect with your team.\nName: " + p.name + "\nMobile: " + p.mobile +
      (p.email ? "\nEmail: " + p.email : "") + "\nCity: " + p.city + "\nReferral: " + p.referralName + "\nOccupation: " + p.occupation +
      "\nFQ Score: " + p.fq.score + "/100";
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
    $("fqConnectBtns").hidden = false;
    $("fqYes").disabled = false;
  }

  $("fqYes").addEventListener("click", function () {
    if (state.sent) return;
    var btn = this;
    btn.disabled = true;
    msg($("fqSaveMsg"), "ok", "Sending your details to our team…");
    if (!LMS_URL) { whatsappFallback(); return; }
    fetch(LMS_URL + "/api/public/website-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, d: d, status: res.status }; }); })
      .then(function (x) {
        if (x.ok && x.d && x.d.ok) {
          state.sent = true;
          $("fqConnectBtns").hidden = true;
          msg($("fqSaveMsg"), "ok", x.d.message || "Thank you! Our team will get in touch with you shortly.");
        } else if (x.status === 400 && x.d && x.d.message) {
          btn.disabled = false;
          msg($("fqSaveMsg"), "err", x.d.message);
        } else {
          whatsappFallback();
        }
      })
      .catch(whatsappFallback);
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
    var errs = [];
    if (referralName.length < 2) errs.push("Please enter the referral name.");
    if (!occupation) errs.push("Please select your occupation.");
    if (city.length < 2) errs.push("Please enter your city.");
    if (formErrors(this, errs)) return;
    state.profile = { referralName: referralName, occupation: occupation, city: city };
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

  $("fqNext").addEventListener("click", next);
  $("fqBack").addEventListener("click", function () { if (state.i > 0) { state.i--; renderQuestion(); } });
  $("fqRetake").addEventListener("click", function () {
    state.i = 0; state.answers = {};
    lockResult();
    renderQuestion();
    show("fqQuiz");
  });
})();
