// Shared, dependency-free equivalent of the supplied TextRoll component.
window.NetgriTextRoll = {
  apply(element, label = element.textContent.trim()) {
    const letters = Array.from(label);
    const accessible = document.createElement('span');
    accessible.className = 'sr-only';
    accessible.textContent = label;
    const roll = document.createElement('span');
    roll.className = 'text-roll';
    roll.setAttribute('aria-hidden', 'true');
    for (const layer of ['top', 'bottom']) {
      const row = document.createElement('span');
      row.className = `text-roll-row text-roll-${layer}`;
      letters.forEach((letter, index) => {
        const character = document.createElement('span');
        character.className = 'text-roll-char';
        character.textContent = letter;
        character.style.setProperty('--roll-delay', `${.035 * Math.abs(index - (letters.length - 1) / 2)}s`);
        row.append(character);
      });
      roll.append(row);
    }
    element.classList.add('text-roll-trigger');
    element.replaceChildren(accessible, roll);
  },
  // Hover-triggered adaptation of Motion Primitives' rotateX Text Roll.
  // https://motion-primitives.com/docs/text-roll
  applyFlip(element) {
    const label = element.textContent.trim();
    const accessible = document.createElement('span');
    accessible.className = 'sr-only';
    accessible.textContent = label;
    const roll = document.createElement('span');
    roll.className = 'text-roll flip-roll-row';
    roll.setAttribute('aria-hidden', 'true');
    const cells = Array.from(label, (letter, index) => {
      const cell = document.createElement('span');
      cell.className = 'flip-roll-cell';
      for (const layer of ['enter', 'exit', 'size']) {
        const face = document.createElement('span');
        face.className = `flip-roll-${layer}`;
        face.textContent = letter === ' ' ? '\u00a0' : letter;
        cell.append(face);
      }
      roll.append(cell);
      return cell;
    });
    element.classList.add('flip-roll');
    element.replaceChildren(accessible, roll);
    const enabled = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let animations = [], running = false;
    const reset = () => {
      animations.forEach(animation => animation.cancel());
      animations = [];
      running = false;
    };
    element.addEventListener('pointerenter', event => {
      if (!enabled.matches || event.pointerType === 'touch' || running) return;
      reset();
      running = true;
      cells.forEach((cell, index) => {
        const timing = { duration: 500, easing: 'ease-in', fill: 'forwards' };
        animations.push(cell.querySelector('.flip-roll-enter').animate([
          { transform: 'rotateX(0deg)', opacity: 1 },
          { transform: 'rotateX(90deg)', opacity: 0 },
        ], { ...timing, delay: index * 100 }));
        animations.push(cell.querySelector('.flip-roll-exit').animate([
          { transform: 'rotateX(90deg)', opacity: 0 },
          { transform: 'rotateX(0deg)', opacity: 1 },
        ], { ...timing, delay: index * 100 + 200 }));
      });
      // Complete the whole word even if the pointer leaves during the animation.
      Promise.all(animations.map(animation => animation.finished)).then(() => {
        running = false;
      }).catch(() => {});
    });
    enabled.addEventListener('change', reset);
  },
};
