// Crowd -> statement -> black image stack -> statement -> spread -> home.
// Stack choreography is an original adaptation of the public Hyperiux preview:
// https://21st.dev/@hyperiux/components/stack-loader
(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!root.classList.contains('intro-pending')) return;
  let finish = () => root.classList.remove('intro-pending');
  // Independent fail-open: a failed image/script cannot hide the site forever.
  const watchdog = setTimeout(() => finish(), 16000);

  document.addEventListener('DOMContentLoaded', async () => {
    const intro = document.querySelector('.site-intro');
    if (!intro || !root.classList.contains('intro-pending')) return;
    const events = new AbortController();
    const previousFocus = document.activeElement;
    const siblings = [...document.body.children].filter(node => node !== intro && node.tagName !== 'SCRIPT');
    const previousInert = siblings.map(node => node.inert);
    siblings.forEach(node => { node.inert = true; });
    const skip = intro.querySelector('.intro-skip');
    let frame = 0, done = false, elapsed = 0, lastTime = 0, actionIndex = 0;
    let crowd = null;
    const animations = [];
    finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      clearTimeout(watchdog);
      events.abort();
      animations.forEach(animation => animation.cancel());
      siblings.forEach((node, index) => { node.inert = previousInert[index]; });
      root.classList.remove('intro-pending');
      intro.remove();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
    skip.addEventListener('click', finish, { signal: events.signal });
    intro.addEventListener('keydown', event => {
      if (event.key === 'Escape') finish();
      if (event.key !== 'Tab') return;
      const focusable = [...intro.querySelectorAll('button, a[href]')];
      const index = focusable.indexOf(document.activeElement);
      if ((event.shiftKey && index <= 0) || (!event.shiftKey && index === focusable.length - 1)) {
        event.preventDefault();
        focusable[event.shiftKey ? focusable.length - 1 : 0].focus();
      }
    }, { signal: events.signal });
    motion.addEventListener('change', () => { if (motion.matches) finish(); }, { signal: events.signal });
    window.addEventListener('pagehide', finish, { signal: events.signal });
    // Let the browser apply inert/layout before focus queries its geometry.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!done) skip.focus({ preventScroll: true });
    }));

    const animate = (node, keyframes, options = {}) => {
      const animation = node.animate(keyframes, { duration: 650, easing: 'cubic-bezier(.22,.8,.22,1)', fill: 'forwards', ...options });
      animations.push(animation);
      return animation;
    };
    const words = (selector, delay = 0) => {
      intro.querySelectorAll(`${selector} > span`).forEach((word, index) => {
        animate(word, [{ opacity: 0, transform: 'translateY(.7em)', filter: 'blur(5px)' },
          { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }], { delay: delay + index * 140 });
      });
    };
    const cards = [...intro.querySelectorAll('.intro-card')];
    const stackPose = index => `translate(-50%, -50%) translate(${(index - 3) * 4}px, ${(index - 3) * -3}px) rotate(${(index - 3) * 3}deg)`;
    const spreadPose = index => `translate(-50%, -50%) translate(${(index - 3) * Math.min(innerWidth * .19, 230)}px, ${Math.abs(index - 3) * 14}px) rotate(${(index - 3) * 5}deg)`;
    const actions = [
      [850, 'crowd-copy', () => words('.intro-first')],
      [3100, 'black', () => {
        animate(intro.querySelector('.intro-crowd-scene'), [{ opacity: 1 }, { opacity: 0 }], { duration: 550 });
        intro.classList.add('is-dark');
      }],
      [3650, 'stack', () => {
        intro.querySelector('.intro-stack-scene').style.opacity = '1';
        cards.forEach((card, index) => animate(card, [
          { opacity: 0, transform: `translate(-50%, 100vh) rotate(${(index - 3) * 6}deg) scale(.85)` },
          { opacity: 1, transform: stackPose(index) },
        ], { duration: 700, delay: index * 70 }));
      }],
      [4350, 'your-copy', () => words('.intro-second')],
      [6200, 'copy-lower', () => animate(intro.querySelector('.intro-second'), [
        { transform: 'translateY(0)' },
        { transform: 'translateY(clamp(20px, 4vh, 40px))' },
      ], { duration: 750 })],
      [6800, 'spread', () => cards.forEach((card, index) => animate(card, [
        { transform: stackPose(index) }, { transform: spreadPose(index) },
      ], { duration: 750, delay: index * 45 }))],
      [7900, 'reveal', () => {
        animate(intro, [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
          { duration: 1100, easing: 'cubic-bezier(.76, 0, .24, 1)' });
      }],
      [9150, 'complete', finish],
    ];
    const tick = timestamp => {
      if (done) return;
      const delta = lastTime ? timestamp - lastTime : 0;
      lastTime = timestamp;
      elapsed += delta;
      while (actionIndex < actions.length && elapsed >= actions[actionIndex][0]) {
        const [, phase, action] = actions[actionIndex++];
        intro.dataset.phase = phase;
        action();
        if (done) return;
      }
      if (elapsed < 3700) crowd?.render(Math.min(delta, 80));
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', () => {
      lastTime = 0;
      if (!crowd) return;
      if (document.hidden) {
        cancelAnimationFrame(frame);
        animations.forEach(animation => { if (animation.playState === 'running') animation.pause(); });
      } else {
        animations.forEach(animation => { if (animation.playState === 'paused') animation.play(); });
        if (!done) frame = requestAnimationFrame(tick);
      }
    }, { signal: events.signal });
    window.addEventListener('resize', () => crowd?.resize(), { signal: events.signal });
    try {
      const image = new Image();
      image.src = document.querySelector('[data-intro-sprite]').href;
      await image.decode();
      if (done) return;
      crowd = window.createIntroCrowd(intro.querySelector('canvas'), image);
      if (!crowd) { finish(); return; }
      intro.dataset.phase = 'crowd';
      crowd.render(0);
      if (!document.hidden) frame = requestAnimationFrame(tick);
    } catch { finish(); }
  }, { once: true });
})();
