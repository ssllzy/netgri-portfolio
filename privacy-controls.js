const analyticsId = document.querySelector('meta[name="analytics-id"]')?.content || '';
const key = 'netgri-privacy-v1';
const maxAge = 180 * 24 * 60 * 60 * 1000;
let loaded = false;
let lastFocus;
const banner = document.createElement('section');
banner.className = 'cookie-banner';
banner.hidden = true;
banner.setAttribute('aria-labelledby', 'cookie-title');
banner.innerHTML = `<h2 id="cookie-title">Gizlilik tercihleriniz</h2><p>${analyticsId ? 'Siteyi nasıl kullandığınızı anlamak için yalnızca izninizle analiz çerezleri kullanıyoruz. Reddetseniz de tüm özellikler çalışır.' : 'Bu sitede reklam veya analiz çerezi kullanılmıyor. Bu bildirimi kapattığınızda tercihiniz bu tarayıcıda saklanır.'} <a href="/cerez-politikasi.html">Ayrıntılar</a></p><div class="cookie-actions"><button type="button" data-consent="denied">${analyticsId ? 'Reddet' : 'Anladım'}</button>${analyticsId ? '<button type="button" data-consent="granted">Analize izin ver</button>' : ''}</div>`;
document.body.append(banner);
function preference() {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return stored && stored.id === analyticsId && Date.now() - stored.time < maxAge && ['granted','denied'].includes(stored.value) ? stored.value : null;
  } catch { return null; }
}
function startAnalytics() {
  if (!analyticsId || loaded || preference() !== 'granted') return;
  loaded = true;
  window[`ga-disable-${analyticsId}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('js', new Date());
  // Never send contact-field values or the page query string to Analytics.
  window.gtag('config', analyticsId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 15552000 });
  window.gtag('event', 'page_view', { page_location: location.origin + location.pathname, page_title: document.title });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`;
  document.head.append(script);
}
function clearAnalyticsCookies() {
  const domains = ['', ...location.hostname.split('.').map((_,i,parts) => '.' + parts.slice(i).join('.'))];
  document.cookie.split(';').forEach(pair => {
    const name = pair.trim().split('=')[0];
    if (!/^_ga(?:_|$)/.test(name)) return;
    domains.forEach(domain => { document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ''}`; });
  });
}
banner.addEventListener('click', event => {
  const choice = event.target.closest('[data-consent]');
  if (!choice) return;
  const value = choice.dataset.consent;
  try { localStorage.setItem(key, JSON.stringify({ value, id: analyticsId, time: Date.now() })); } catch {}
  banner.hidden = true;
  lastFocus?.focus({ preventScroll: true });
  if (value === 'granted') startAnalytics();
  else {
    window[`ga-disable-${analyticsId}`] = true;
    clearAnalyticsCookies();
    if (loaded) location.reload();
  }
});
document.querySelectorAll('[data-cookie-settings]').forEach(button => button.addEventListener('click', () => {
  lastFocus = button;
  banner.hidden = false;
  banner.querySelector('button').focus();
}));
const showAfterIntro = () => {
  if (document.documentElement.classList.contains('intro-pending')) return;
  if (!preference()) banner.hidden = false;
  else if (preference() === 'granted') startAnalytics();
  observer.disconnect();
};
const observer = new MutationObserver(showAfterIntro);
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
showAfterIntro();
window.addEventListener('storage', event => { if (event.key === key) location.reload(); });
