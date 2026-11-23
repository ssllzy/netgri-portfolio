// A floating gallery: first activation selects, the next follows the real link.
document.querySelectorAll('.works-space').forEach(section => {
  const cards = [...section.querySelectorAll('.works-card')];
  const buttons = [...section.querySelectorAll('[data-work-index]')];
  const status = section.querySelector('.works-status');
  let selected = -1;

  function select(index) {
    selected = index;
    cards.forEach((card, i) => {
      card.classList.toggle('is-selected', i === index);
      card.setAttribute('aria-label', `${card.dataset.title}: ${i === index ? 'siteyi aç (yeni sekme)' : 'projeyi öne çıkar'}`);
      card.querySelector('.works-action').textContent = i === index ? 'Siteyi gör' : 'Projeyi seç';
    });
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    status.textContent = index < 0 ? '' : `${cards[index].dataset.title} seçildi. Siteyi açmak için tekrar tıklayın.`;
  }
  cards.forEach((card, index) => card.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (selected !== index) {
      event.preventDefault();
      select(index);
    }
  }));
  buttons.forEach(button => button.addEventListener('click', () => select(Number(button.dataset.workIndex))));
  section.addEventListener('keydown', event => { if (event.key === 'Escape') select(-1); });

  const stars = section.querySelector('.works-stars');
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 85; i++) {
    const star = document.createElement('i');
    star.style.cssText = `left:${(i * 61.8034) % 100}%;top:${(i * i * 17.37) % 100}%;--star-size:${i % 9 === 0 ? 2 : 1}px;--twinkle:${3 + i % 5}s;--delay:-${i % 7}s`;
    fragment.append(star);
  }
  stars.append(fragment);
  let visible = false;
  const updateMotion = () => section.classList.toggle('is-resting', !visible || document.hidden);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateMotion();
  }).observe(section);
  document.addEventListener('visibilitychange', updateMotion);
  select(-1);
  section.classList.add('space-ready');
});
