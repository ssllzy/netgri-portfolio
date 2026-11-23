const brandArt = document.querySelector('.brand-art');
const wordLoader = document.querySelector('.word-loader');
let heroVisible = true;
function syncLogoMotion() {
  const paused = !heroVisible || document.hidden;
  brandArt.classList.toggle('paused', paused);
  wordLoader.classList.toggle('paused', paused);
}
new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; syncLogoMotion(); }).observe(brandArt);
document.addEventListener('visibilitychange', syncLogoMotion);

window.NetgriTextRoll.applyFlip(document.querySelector('.hero-title h1 > span'));
window.NetgriTextRoll.apply(document.querySelector('.slogan-prefix'));
const slogans = ['sana ait olanı.', 'hatırlananı.', 'hissedileni.', 'işe yarayanı.'];
window.createWordLoader(wordLoader, slogans);
document.querySelector('#year').textContent = new Date().getFullYear();

