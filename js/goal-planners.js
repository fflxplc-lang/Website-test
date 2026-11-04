/* Freedom LifeX Group — Single Goal & Multiple Goals planners
   Formulas follow the company's Excel sheets exactly:
     Target / Future Value      = FV(inflation, years, , -current value)      = CV × (1+inflation)^years
     Lumpsum Investment Required = PV(return, years, , -target)                 = target ÷ (1+return)^years
     Required SIP (monthly)      = PMT((1+return)^(1/12)-1, years×12, , -target)
   Retirement row (Multiple Goals sheet):
     Monthly income at FF year   = current monthly lifestyle × (1+inflation)^years
     Financial Freedom Fund      = PV(return − inflation, life expectancy − FF age, −monthly income×12, 0, 1)
     Lumpsum / SIP               = as above, discounted at (return − inflation) — as in the sheet */
(function () {
  'use strict';
  var inr = function (n) {
    if (!isFinite(n) || n <= 0) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(n));
  };
  var num = function (el) { var v = parseFloat(String(el.value).replace(/,/g, '')); return isFinite(v) ? v : 0; };
  var pct = function (el) { return num(el) / 100; };

  function fv(rate, years, pv) { return pv * Math.pow(1 + rate, years); }
  function pvOf(rate, years, target) { return target / Math.pow(1 + rate, years); }
  function sip(annualRate, years, target) {
    var i = Math.pow(1 + annualRate, 1 / 12) - 1, n = years * 12;
    if (n <= 0) return 0;
    if (i === 0) return target / n;
    return target * i / (Math.pow(1 + i, n) - 1);
  }
  // PV of an annuity-due (payments at the start of each year), like Excel PV(rate, nper, -pmt, 0, 1)
  function pvAnnuityDue(rate, nper, pmt) {
    if (nper <= 0) return 0;
    if (rate === 0) return pmt * nper;
    return pmt * (1 - Math.pow(1 + rate, -nper)) / rate * (1 + rate);
  }

  /* ---------- Single Goal ---------- */
  document.querySelectorAll('[data-planner="single"]').forEach(function (root) {
    var q = function (k) { return root.querySelector('[data-f="' + k + '"]'); };
    function calc() {
      var y = num(q('years')), cv = num(q('cv')), inf = pct(q('inf')), r = pct(q('ret'));
      var target = fv(inf, y, cv);
      q('target').textContent = inr(target);
      q('lumpsum').textContent = inr(y > 0 ? pvOf(r, y, target) : 0);
      q('sip').textContent = inr(sip(r, y, target));
      var name = (q('name').value || '').trim();
      q('goal-label').textContent = name ? 'for “' + name + '”' : '';
    }
    root.addEventListener('input', calc);
    calc();
  });

  /* ---------- Multiple Goals ---------- */
  document.querySelectorAll('[data-planner="multiple"]').forEach(function (root) {
    // start with one goal row; "Add Another Goal" reveals the next (up to 8)
    var rows = [].slice.call(root.querySelectorAll('tr[data-goal]'));
    var addBtn = root.querySelector('[data-add-goal]');
    rows.forEach(function (tr, i) { if (i > 0) tr.hidden = true; });
    if (addBtn) addBtn.addEventListener('click', function () {
      var next = rows.filter(function (tr) { return tr.hidden; })[0];
      if (next) { next.hidden = false; var f = next.querySelector('[data-f="name"]'); if (f) f.focus(); }
      if (!rows.some(function (tr) { return tr.hidden; })) addBtn.hidden = true;
    });
    function calc() {
      root.querySelectorAll('tr[data-goal]').forEach(function (tr) {
        var g = function (k) { return tr.querySelector('[data-f="' + k + '"]'); };
        var y = num(g('years')), inf = pct(g('inf')), cv = num(g('cv')), r = pct(g('ret'));
        var has = y > 0 && cv > 0;
        var f = has ? fv(inf, y, cv) : 0;
        g('fv').textContent = has ? inr(f) : '';
        g('lumpsum').textContent = has ? inr(pvOf(r, y, f)) : '';
        g('sip').textContent = has ? inr(sip(r, y, f)) : '';
      });
      // Retirement goal
      var a = function (k) { return root.querySelector('[data-f="' + k + '"]'); };
      var inf = pct(a('a-inf')), ret = pct(a('a-ret')), le = num(a('a-le'));
      var y = num(a('r-years')), age = num(a('r-age')), life = num(a('r-life'));
      var monthly = fv(inf, y, life);
      var real = ret - inf;
      var yearsInFF = le - (age + y);
      var fund = (y > 0 && life > 0 && yearsInFF > 0) ? pvAnnuityDue(real, yearsInFF, monthly * 12) : 0;
      a('r-income').textContent = life > 0 ? inr(monthly) : '';
      a('r-fund').textContent = fund ? inr(fund) : '';
      a('r-lumpsum').textContent = fund ? inr(pvOf(real, y, fund)) : '';
      a('r-sip').textContent = fund ? inr(sip(real, y, fund)) : '';
    }
    root.addEventListener('input', calc);
    calc();
  });
})();

/* "Calculate Your Goal" button: recalculate and bring the results into view with a short highlight */
document.querySelectorAll('[data-calc-go]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var box = btn.closest('.single-goal-calc').querySelector('.goal-planner');
    box.dispatchEvent(new Event('input', { bubbles: true }));
    var res = box.querySelector('.gp-results, .gp-table-wrap');
    if (res) {
      res.scrollIntoView({ behavior: 'smooth', block: 'center' });
      box.classList.remove('gp-flash'); void box.offsetWidth; box.classList.add('gp-flash');
    }
  });
});
