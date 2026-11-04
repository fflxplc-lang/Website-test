/* Finowise — homepage motion layer: cinematic banner depth + smooth momentum scroll */
(function () {
  function init() {
    /* Scroll parallax on the banner imagery — only the visible slide, using the independent `translate`
       property so it never fights the Ken Burns `transform` animation, and only while the banner is on screen. */
    var banner = document.getElementById('bannerSlider');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var onScreen = true;
    if (banner && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        banner.classList.toggle('is-offscreen', !onScreen);
      }).observe(banner);
    }
    if (banner && !reduceMotion) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking || !onScreen) return;
        ticking = true;
        requestAnimationFrame(function () {
          var img = banner.querySelector('.banner-slide.active .banner-img, .banner-slide.active .welcome-scene');
          if (img) img.style.translate = '0 ' + Math.round((window.scrollY || 0) * 0.22) + 'px';
          ticking = false;
        });
      }, { passive: true });
    }

    /* Smooth momentum scrolling (lenis) — loaded from CDN, gracefully optional */
    if (!reduceMotion && typeof window.Lenis === 'function') {
      try {
        var lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
      } catch (e) { /* native scrolling is the fallback */ }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();