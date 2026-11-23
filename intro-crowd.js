// Canvas walking crowd adapted from the user-supplied Skiper39 example.
// Skiper UI / https://codepen.io/zadvorsky/pen/xxwbBQV
// Illustrations: Open Peeps (https://www.openpeeps.com/).
window.createIntroCrowd = (canvas, sprite) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const sourceWidth = sprite.naturalWidth / 15;
  const sourceHeight = sourceWidth * 1.35;
  const spriteCount = Math.round(sprite.naturalHeight / sourceHeight) * 15;
  let width = 0, height = 0, density = 1, walkers = [], pendingDelta = 0;
  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    // Small moving illustrations do not need a full DPR-3 framebuffer.
    density = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    const count = width < 600 ? 30 : 70;
    const personHeight = Math.min(245, Math.max(150, height * .34));
    walkers = Array.from({ length: count }, (_, index) => {
      const depth = Math.random();
      const h = personHeight * (.7 + depth * .38);
      return {
        index: index % spriteCount, x: Math.random() * (width + 220) - 110,
        y: height - h - (1 - depth) * height * .2 + depth * 60,
        w: h * sourceWidth / sourceHeight, h,
        direction: Math.random() > .5 ? 1 : -1,
        speed: 28 + Math.random() * 42, phase: Math.random() * Math.PI * 2,
        depth,
      };
    }).sort((a, b) => a.depth - b.depth);
  };
  const render = delta => {
    pendingDelta += delta;
    // Keep walking speed unchanged while drawing at 30 fps on every screen.
    if (delta && pendingDelta < 1000 / 30 - .5) return;
    delta = pendingDelta;
    pendingDelta = 0;
    ctx.setTransform(density, 0, 0, density, 0, 0);
    ctx.clearRect(0, 0, width, height);
    walkers.forEach(person => {
      person.x += delta / 1000 * person.speed * person.direction;
      person.phase += delta / 1000 * 9;
      if (person.x > width + person.w) person.x = -person.w;
      if (person.x < -person.w) person.x = width + person.w;
      ctx.save();
      ctx.translate(person.x, person.y - Math.abs(Math.sin(person.phase)) * 7);
      ctx.scale(person.direction, 1);
      ctx.drawImage(sprite, (person.index % 15) * sourceWidth,
        Math.floor(person.index / 15) * sourceHeight, sourceWidth, sourceHeight,
        -person.w / 2, 0, person.w, person.h);
      ctx.restore();
    });
  };
  resize();
  return { resize, render };
};
