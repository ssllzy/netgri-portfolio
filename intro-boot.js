// Inlined with a CSP hash at build time: no blocking JavaScript request.
(() => {
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches ||
      (location.hash && location.hash !== '#top') ||
      performance.getEntriesByType('navigation')[0]?.type === 'back_forward') return;
  root.classList.add('intro-pending');
  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'image';
  preload.fetchPriority = 'high';
  preload.href = innerWidth < 600 ? 'assets/open-peeps-mobile.webp' : 'assets/open-peeps-crowd.webp';
  preload.dataset.introSprite = '';
  document.head.append(preload);
  setTimeout(() => root.classList.remove('intro-pending'), 16000);
})();
