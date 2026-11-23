(() => {
  const originalNav = document.querySelector('.nav');
  originalNav.querySelectorAll('nav a').forEach(link => {
    link.classList.add('nav-roll-link');
    window.NetgriTextRoll.apply(link);
  });
  const brand = originalNav.querySelector('.scroll-brand');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const glassNav = document.createElement('div');
  glassNav.className = 'scroll-nav';
  glassNav.innerHTML = `<div class="nav-glass" aria-hidden="true"></div>
    <svg class="nav-roots" viewBox="0 0 1200 68" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width=".8" aria-hidden="true">
      <path pathLength="100" d="M600 34C558 34 541 14 498 22S424 50 377 36S285 14 231 29S120 52 0 34"/>
      <path pathLength="100" d="M600 34C642 34 659 54 702 46S776 18 823 32S915 54 969 39S1080 16 1200 34"/>
      <path pathLength="100" d="M600 34C535 36 493 52 452 45S402 8 367 0M452 45C386 52 346 58 315 68"/>
      <path pathLength="100" d="M600 34C665 32 707 16 748 23S798 60 833 68M748 23C814 16 854 10 885 0"/>
      <path pathLength="100" d="M600 34C510 38 424 50 377 36S300 26 264 9L230 0M377 36C322 44 272 38 240 57L217 68"/>
      <path pathLength="100" d="M600 34C690 30 776 18 823 32S900 42 936 59L970 68M823 32C878 24 928 30 960 11L983 0"/>
      <path pathLength="100" d="M600 34C460 14 352 40 231 29S155 6 126 0M231 29C178 33 124 68 65 68"/>
      <path pathLength="100" d="M600 34C740 54 848 28 969 39S1045 62 1074 68M969 39C1022 35 1076 0 1135 0"/>
    </svg>`;
  glassNav.append(brand);
  document.body.append(glassNav);

  const clamp = value => Math.max(0, Math.min(1, value));
  function updateNavbar(scrollY) {
    // Every visual value comes directly from scroll; reversing scroll reverses growth.
    const p = clamp(scrollY / 260);
    const brandProgress = clamp((p - .16) / .7);
    const left = 50 - 55 * p;
    const right = 50 + 55 * p;
    const branch = 7 * Math.sin(p * Math.PI);
    const shape = motion.matches ? 'inset(0)' : `polygon(
      ${left + branch}% 0, ${right - branch}% 0,
      ${right - branch * 2}% 18%, ${right}% 34%,
      ${right - branch}% 54%, ${right}% 74%, ${right - branch}% 100%,
      ${left + branch}% 100%, ${left}% 78%, ${left + branch}% 56%,
      ${left}% 37%, ${left + branch * 2}% 19%)`;
    glassNav.style.setProperty('--glass-shape', shape);
    glassNav.style.setProperty('--glass-opacity', String(motion.matches ? p : clamp(p * 3)));
    glassNav.style.setProperty('--root-offset', String(100 * (1 - p)));
    glassNav.style.setProperty('--root-opacity', String(motion.matches ? 0 : .2 * Math.sin(p * Math.PI) + .06 * p));
    glassNav.style.setProperty('--brand-opacity', String(brandProgress));
    glassNav.style.setProperty('--brand-clip', `${motion.matches ? 0 : 50 * (1 - brandProgress)}%`);
    originalNav.style.opacity = String(1 - clamp(p * 3.5));
    originalNav.inert = p >= 1 / 3.5;
    glassNav.inert = brandProgress < .1;
    glassNav.setAttribute('aria-hidden', String(brandProgress < .1));
  }
  function scheduleNavbar() {
    window.NetgriFrame.schedule('navbar', () => window.scrollY, updateNavbar);
  }
  window.addEventListener('scroll', scheduleNavbar, { passive: true });
  window.addEventListener('pageshow', scheduleNavbar);
  motion.addEventListener('change', scheduleNavbar);
  scheduleNavbar();
})();

