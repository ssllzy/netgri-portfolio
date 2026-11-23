// Move the quick-access icon into the contact icon as it enters the viewport.
(() => {
  const contactLink = document.querySelector('.contact-links a[href^="https://wa.me/"]');
  const contactIcon = contactLink?.querySelector('svg');
  if (!contactIcon) return;

  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const dock = document.createElement('div');
  dock.className = 'whatsapp-quick';
  const quickLink = contactLink.cloneNode(true);
  quickLink.className = 'whatsapp-quick-link';
  quickLink.setAttribute('aria-label', 'WhatsApp ile iletişime geç');
  dock.append(quickLink);
  document.body.append(dock);
  const quickIcon = quickLink.querySelector('svg');
  const mobileQuery = matchMedia('(max-width: 760px)');

  function measure() {
    // Mobile never docks: avoid measuring offscreen contact geometry at all.
    if (mobileQuery.matches) return { x: 0, y: 0, scale: 1, merged: false, mobile: true };
    const target = contactIcon.getBoundingClientRect();
    const origin = dock.getBoundingClientRect();
    const targetX = target.left + target.width / 2;
    const targetY = target.top + target.height / 2;
    const viewportHeight = document.documentElement.clientHeight;
    const distance = Math.max(0, Math.min(1, (viewportHeight + 40 - targetY) / 140));
    const mobile = false;
    const merged = !mobile && distance === 1;
    const progress = mobile ? 0 : motionPreference.matches ? Number(merged) : distance * distance * (3 - 2 * distance);
    const x = (targetX - origin.left - origin.width / 2) * progress;
    const y = (targetY - origin.top - origin.height / 2) * progress;
    const iconWidth = quickIcon.clientWidth || 32;
    const scale = 1 + (target.width / iconWidth - 1) * progress;
    return { x, y, scale, merged, mobile };
  }
  function update({ x, y, scale, merged, mobile }) {
    quickLink.style.transform = `translate(${x}px, ${y}px)`;
    quickIcon.style.transform = `scale(${scale})`;
    quickLink.style.opacity = merged ? '0' : '1';
    contactIcon.style.opacity = mobile || merged ? '1' : '0';
    quickLink.style.pointerEvents = merged ? 'none' : 'auto';
    if (merged && document.activeElement === quickLink) contactLink.focus({ preventScroll: true });
    quickLink.tabIndex = merged ? -1 : 0;
    quickLink.setAttribute('aria-hidden', String(merged));
    dock.dataset.merged = String(merged);
  }

  function scheduleUpdate() {
    window.NetgriFrame.schedule('whatsapp', measure, update);
  }
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  motionPreference.addEventListener('change', scheduleUpdate);
  new ResizeObserver(scheduleUpdate).observe(document.querySelector('#contact'));
  document.fonts.ready.then(scheduleUpdate);
  scheduleUpdate();
})();

