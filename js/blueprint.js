/* Goal cards → the matching Investment Blueprint Input Form in Finowise BOSS.

   The forms are not rebuilt here. A card asks who the person is, the LMS
   creates (or finds, by mobile) their lead and hands back the address of its
   own client form for that blueprint — every field, section, calculation and
   validation exactly as BOSS has them, with the risk questionnaire after it.
   What they submit there is saved on their LMS lead.

     data-blueprint-goal="single"       Single Goal       → Goal Based Investment
     data-blueprint-goal="multiple"     Multiple Goal     → Goal Based Investment
     data-blueprint-goal="inspiring"    Inspiring Goal    → Financial Success Ladder
     data-blueprint-goal="sevenevents"  7 Events Plan     → Comprehensive Freedom Blueprint (7 Events)
     data-blueprint-goal="goldenage"    Golden Age        → Golden Age Blueprint            */
(function () {
  var LMS_URL = String(window.FINOWISE_LMS_URL || "").replace(/\/+$/, "");
  var WHATSAPP = "919137654191";
  var GOALS = {
    single: { title: "Single Goal", form: "Goal Based Investment Blueprint Input Form" },
    multiple: { title: "Multiple Goal", form: "Goal Based Investment Blueprint Input Form" },
    inspiring: { title: "Inspiring Goal", form: "Financial Success Ladder Investment Blueprint Input Form" },
    sevenevents: { title: "Comprehensive Freedom Blueprint (7 Events) Plan", form: "Comprehensive Freedom Blueprint (7 Events) Investment Blueprint Input Form" },
    goldenage: { title: "Golden Age Blueprint", form: "Golden Age Blueprint Investment Blueprint Input Form" }
  };
  var KEY = "fw_bp_contact";
  var modal, goal = null;

  function remembered() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function remember(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private window */ } }

  function build() {
    modal = document.createElement("div");
    modal.className = "bp-modal";
    modal.hidden = true;
    modal.setAttribute("data-testid", "bp-modal");
    modal.innerHTML =
      '<div class="bp-dialog" role="dialog" aria-modal="true" aria-labelledby="bpTitle">' +
        '<button type="button" class="bp-close" aria-label="Close" data-bp-close>&times;</button>' +
        '<span class="bp-tag" id="bpGoal"></span>' +
        '<h3 id="bpTitle">Start your Investment Blueprint</h3>' +
        '<p class="bp-sub" id="bpSub"></p>' +
        '<form id="bpForm" novalidate>' +
          '<div class="form-row">' +
            '<div class="form-group"><label for="bpName">Full Name *</label><input type="text" id="bpName" maxlength="80" autocomplete="name" data-testid="bp-name"></div>' +
            '<div class="form-group"><label for="bpMobile">Mobile *</label><input type="tel" id="bpMobile" maxlength="16" autocomplete="tel" data-testid="bp-mobile"></div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label for="bpEmail">Email *</label><input type="email" id="bpEmail" maxlength="120" autocomplete="email" data-testid="bp-email"></div>' +
            '<div class="form-group"><label for="bpCity">City *</label><input type="text" id="bpCity" maxlength="60" autocomplete="address-level2" data-testid="bp-city"></div>' +
          '</div>' +
          '<label class="bp-consent"><input type="checkbox" id="bpConsent" data-testid="bp-consent"> I agree to share these details with the Finowise team and to be contacted about my blueprint.</label>' +
          '<div id="bpMsg"></div>' +
          '<button type="submit" class="btn btn-primary" id="bpSubmit" data-testid="bp-submit">Open My Blueprint Form <i class="fa-solid fa-arrow-right"></i></button>' +
          '<p class="bp-note">Your full input form opens next. Fill it in and submit — it goes straight to your Finowise relationship manager.</p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) { if (e.target === modal || e.target.hasAttribute("data-bp-close")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });
    modal.querySelector("#bpForm").addEventListener("submit", submit);
  }
  function $(id) { return document.getElementById(id); }
  function msg(cls, html) { $("bpMsg").innerHTML = html ? '<div class="bp-msg ' + cls + '" data-testid="bp-msg">' + html + "</div>" : ""; }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function open(key) {
    if (!GOALS[key]) return;
    if (!modal) build();
    goal = key;
    var g = GOALS[key], r = remembered();
    $("bpGoal").textContent = g.title;
    $("bpSub").textContent = "Tell us who you are and we will open your " + g.form + ".";
    $("bpName").value = r.name || ""; $("bpMobile").value = r.mobile || ""; $("bpEmail").value = r.email || ""; $("bpCity").value = r.city || "";
    $("bpConsent").checked = !!r.consent;
    $("bpSubmit").disabled = false;
    msg("", "");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    $("bpName").focus();
  }
  function close() { modal.hidden = true; document.body.style.overflow = ""; }

  function submit(e) {
    e.preventDefault();
    var v = {
      name: $("bpName").value.trim(), mobile: $("bpMobile").value.replace(/\D/g, "").slice(-10),
      email: $("bpEmail").value.trim(), city: $("bpCity").value.trim(), consent: $("bpConsent").checked
    };
    var errs = [];
    if (v.name.length < 2) errs.push("Please enter your full name.");
    if (!/^[6-9]\d{9}$/.test(v.mobile)) errs.push("Please enter a valid 10-digit mobile number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errs.push("Please enter a valid email.");
    if (v.city.length < 2) errs.push("Please enter your city.");
    if (!v.consent) errs.push("Please tick the box to agree to be contacted.");
    if (errs.length) { msg("err", errs.map(esc).join("<br>")); return; }
    remember(v);
    // A tab opened now, inside the click, is not stopped by a pop-up blocker;
    // it is pointed at the form once the LMS answers.
    var tab = null;
    try { tab = window.open("", "_blank"); if (tab) tab.document.write("<p style=\"font-family:sans-serif;padding:24px\">Opening your blueprint form…</p>"); } catch (x) { tab = null; }
    $("bpSubmit").disabled = true;
    msg("ok", "Opening your blueprint form…");
    var body = { goal: goal, name: v.name, mobile: v.mobile, email: v.email, city: v.city, consent: true };
    fetch(LMS_URL + "/api/public/website-blueprint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, status: res.status, d: d }; }); })
      .then(function (x) {
        $("bpSubmit").disabled = false;
        if (x.ok && x.d && x.d.ok && x.d.path) {
          var url = LMS_URL + x.d.path;
          if (tab && !tab.closed) { tab.location.href = url; }
          msg("ok", "Your " + esc(x.d.form || "blueprint") + " form " + (tab && !tab.closed ? "has opened in a new tab" : "is ready") +
            '. <a href="' + esc(url) + '" target="_blank" rel="noopener" data-testid="bp-open-link">Open my form <i class="fa-solid fa-arrow-up-right-from-square"></i></a>' +
            "<br>Fill it in and press Submit there — our team will be in touch.");
          return;
        }
        if (tab && !tab.closed) tab.close();
        if (x.status === 400 && x.d && x.d.message) { msg("err", esc(x.d.message)); return; }
        if (x.status === 429) { msg("err", "Too many tries just now. Please wait a minute and try again."); return; }
        fallback(v);
      })
      .catch(function () { $("bpSubmit").disabled = false; if (tab && !tab.closed) tab.close(); fallback(v); });
  }
  function fallback(v) {
    var text = "Hi Finowise, I would like to start my " + GOALS[goal].title + " blueprint.\nName: " + v.name + "\nMobile: " + v.mobile + "\nEmail: " + v.email + "\nCity: " + v.city;
    msg("err", "We could not open the form just now. Please try again in a moment, or " +
      '<a href="https://wa.me/' + WHATSAPP + "?text=" + encodeURIComponent(text) + '" target="_blank" rel="noopener" data-testid="bp-whatsapp">send your request on WhatsApp</a>.');
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-blueprint-goal]");
    if (!b) return;
    e.preventDefault();
    open(b.getAttribute("data-blueprint-goal"));
  });
})();
