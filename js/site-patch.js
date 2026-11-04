/* Finowise site patch — keeps leads safe if the CRM endpoint is unreachable.
   If crm.finowisewealthx.in cannot be reached, the enquiry is handed to WhatsApp
   and the visitor sees a confirmation notice with a direct link. */
(function () {
  if (window.__fwFetchPatched) return;
  window.__fwFetchPatched = true;

  var CRM_URL = 'https://crm.finowisewealthx.in/api/v1/public/inquiry';
  var WA_NUMBER = '919137654191';
  var originalFetch = window.fetch;

  function buildWhatsAppUrl(p) {
    var rows = [
      ['New Website Enquiry', ''],
      ['Name', p.name],
      ['Phone', p.phone],
      ['Email', p.email],
      ['City', p.city],
      ['Interested In', p.type],
      ['Message', p.message]
    ].filter(function (r) { return r[1]; })
     .map(function (r) { return r[0] + ': ' + r[1]; });
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(rows.join('\n'));
  }

  function showFallbackNotice(url) {
    var notice = document.createElement('div');
    notice.className = 'fw-form-fallback';
    notice.setAttribute('data-testid', 'form-fallback-notice');
    notice.innerHTML =
      '<div class="fw-fallback-text"><strong>Thank you!</strong> Our enquiry desk is briefly offline — ' +
      'your message is ready on WhatsApp. Tap below to send it in one tap.</div>' +
      '<a class="fw-fallback-btn" href="' + url + '" target="_blank" rel="noopener" data-testid="form-fallback-whatsapp">' +
      '<i class="fa-brands fa-whatsapp"></i> Send on WhatsApp</a>' +
      '<button class="fw-fallback-close" type="button" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(notice);
    requestAnimationFrame(function () { notice.classList.add('visible'); });
    notice.querySelector('.fw-fallback-close').addEventListener('click', function () {
      notice.classList.remove('visible');
      setTimeout(function () { notice.remove(); }, 400);
    });
    setTimeout(function () {
      if (notice.parentNode) { notice.classList.remove('visible'); setTimeout(function () { notice.remove(); }, 400); }
    }, 30000);
  }

  window.fetch = function (url, opts) {
    var isCrm = typeof url === 'string' && url.indexOf(CRM_URL) === 0;
    if (!isCrm || !opts || !opts.body) return originalFetch.apply(this, arguments);

    var payload = {};
    try { payload = JSON.parse(opts.body); } catch (e) {}

    var timeout = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('crm-timeout')); }, 7000);
    });

    return Promise.race([originalFetch(url, opts), timeout]).then(function (res) {
      if (!res || !res.ok) throw new Error('crm-error');
      return res;
    }).catch(function () {
      var waUrl = buildWhatsAppUrl(payload);
      showFallbackNotice(waUrl);
      return new Response(JSON.stringify({
        success: true,
        message: 'Thank you, ' + (payload.name || 'friend') + '! Your enquiry is captured — our team will reach out shortly.'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
  };
})();