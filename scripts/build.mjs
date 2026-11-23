import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { supportingPages } from './pages.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(root, 'site.config.json'), 'utf8'));
export function siteOrigin(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL must be a public HTTPS origin, for example https://your-site.netlify.app');
  }
  if (['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('A local address cannot be canonical.');
  return url.origin;
}
export function versionedFilename(name, content) {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
  return name.replace(/\.([a-z0-9]+)$/, `.${hash}.$1`);
}
export async function build({ destination = join(root, 'dist'), url = process.env.SITE_URL || config.url || process.env.URL || '', context = process.env.CONTEXT || 'production', analyticsId = process.env.GA_MEASUREMENT_ID || config.analyticsId || '', owner = process.env.LEGAL_OWNER || config.legalOwner || '' } = {}) {
  // Only this project's dist directory may be replaced.
  if (resolve(destination) !== join(root, 'dist')) throw new Error('Unexpected output directory.');
  const origin = siteOrigin(url);
  if (process.env.NETLIFY && !origin) throw new Error('Netlify URL or SITE_URL is required.');
  const indexable = context === 'production';
  if (analyticsId && !/^G-[A-Z0-9]{4,20}$/.test(analyticsId)) throw new Error('Invalid GA4 measurement ID.');
  if (!indexable) analyticsId = '';
  await rm(destination, { recursive: true, force: true });
  await mkdir(join(destination, 'assets'), { recursive: true });
  const files = ['site.webmanifest'];
  const assets = ['root-pattern.svg', 'favicon.svg', 'icon-32.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'og-image.png'];
  await Promise.all([...files, ...assets.map(name => `assets/${name}`)].map(file => copyFile(join(root, file), join(destination, file))));
  const fontFiles = ['manrope-latin.woff2', 'manrope-latin-ext.woff2', 'cinzel-brand.woff2', 'noto-serif-turkish.woff2', 'cinzel-OFL.txt', 'manrope-OFL.txt', 'notoserif-OFL.txt'];
  const optimized = ['logo-96.webp', 'logo-256.webp', 'logo-384.webp', 'logo-576.webp', 'logo-768.webp', 'open-peeps-mobile.webp', 'open-peeps-crowd.webp',
    ...['revenges', 'adana-dis', 'kyft', 'fewa'].flatMap(name => [480, 768].map(size => `${name}-${size}.webp`)),
    ...['revenges', 'adana-dis', 'kyft', 'fewa'].flatMap(name => [240, 400, 560].map(size => `${name}-intro-${size}.webp`)),
    ...fontFiles.map(name => `fonts/${name}`)];
  const assetVersions = new Map();
  await mkdir(join(destination, 'assets/fonts'), { recursive: true });
  for (const name of optimized) {
    const content = await readFile(join(root, 'assets', name));
    const versioned = versionedFilename(name, content);
    assetVersions.set(`assets/${name}`, `assets/${versioned}`);
    await writeFile(join(destination, 'assets', versioned), content);
  }
  const versionAssets = text => {
    for (const [original, versioned] of assetVersions) text = text.replaceAll(original, versioned);
    return text;
  };
  const bundledStyles = ['fonts.css', 'styles.css', 'navbar.css', 'text-roll.css', 'word-loader.css', 'works-space.css', 'intro.css', 'site-features.css'];
  const mainCss = (await Promise.all(bundledStyles.map(name => readFile(join(root, name), 'utf8')))).join('\n');
  const boot = versionAssets(await readFile(join(root, 'intro-boot.js'), 'utf8'));
  const runtimeFiles = ['frame-batch.js', 'text-roll.js', 'word-loader.js', 'script.js', 'whatsapp.js', 'navbar.js', 'works-space.js', 'site-features.js', 'privacy-controls.js'];
  const bundle = async names => (await Promise.all(names.map(async name => `// ${name}\n(() => {\n${await readFile(join(root, name), 'utf8')}\n})();`))).join('\n');
  const runtime = await bundle(runtimeFiles);
  const intro = await bundle(['intro-crowd.js', 'intro.js']);
  // Content-addressed files bypass copies cached by earlier deployments.
  const versions = new Map();
  for (const name of ['styles.css', 'intro.js', 'script.js', 'not-found.css', 'site-features.js', 'privacy-controls.js']) {
    const content = versionAssets(name === 'styles.css' ? mainCss : name === 'script.js' ? runtime : name === 'intro.js' ? intro : await readFile(join(root, name), 'utf8'));
    const versioned = versionedFilename(name, content);
    versions.set(name, versioned);
    await writeFile(join(destination, versioned), content);
  }
  const versionHtml = html => versionAssets(html.includes('class="site-intro"') ? html.replace(/<script(?: type="module")? src="([^"]+)"[^>]*><\/script>/g, (tag, name) => {
    if (name === 'script.js') return '<script src="script.js" defer></script>';
    return runtimeFiles.includes(name) || name === 'intro-crowd.js' ? '' : tag;
  }) : html)
    .replace(/<link rel="stylesheet" href="\/?([^"/]+\.css)">/g, (match, name) => bundledStyles.includes(name) && name !== 'styles.css' ? '' : match)
    .replace('<script src="intro-boot.js"></script>', `<script>${boot}</script>`)
    .replace(/(src|href)="(\/?)([^"/]+\.(?:css|js))"/g,
      (match, attribute, prefix, name) => versions.has(name) ? `${attribute}="${prefix}${versions.get(name)}"` : match);
  await writeFile(join(destination, '404.html'), versionHtml(await readFile(join(root, '404.html'), 'utf8')));
  const schema = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': `${origin}/#organization`, name: config.name, url: `${origin}/`, description: config.description, logo: `${origin}/assets/icon-512.png`, sameAs: [], areaServed: { '@type': 'Country', name: 'Türkiye' }, knowsAbout: ['Web tasarım', 'Web geliştirme', 'Dijital deneyim tasarımı'] },
      { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: config.name, inLanguage: 'tr-TR', publisher: { '@id': `${origin}/#organization` } }
    ]
  };
  if (!origin) {
    // A portable manual deploy remains public without inventing a domain.
    for (const item of schema['@graph']) {
      delete item['@id'];
      delete item.url;
      delete item.logo;
      delete item.publisher;
    }
  }
  const schemaText = JSON.stringify(schema).replaceAll('<', '\\u003c');
  const seo = [`<meta name="robots" content="${indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}">`];
  seo.push(`<meta name="analytics-id" content="${analyticsId}">`);
  if (origin) seo.push(`<link rel="canonical" href="${origin}/">`, `<meta property="og:url" content="${origin}/">`, `<meta property="og:image" content="${origin}/assets/og-image.png">`, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', '<meta property="og:image:alt" content="NETGRI — Web tasarım ve yaratıcı geliştirme">', `<meta name="twitter:image" content="${origin}/assets/og-image.png">`, `<script type="application/ld+json">${schemaText}</script>`);
  else seo.push('<meta property="og:image" content="/assets/og-image.png">', '<meta name="twitter:image" content="/assets/og-image.png">', `<script type="application/ld+json">${schemaText}</script>`);
  const html = versionHtml((await readFile(join(root, 'index.html'), 'utf8')).replace('<!-- SEO_BUILD -->', seo.join('\n  ')));
  await writeFile(join(destination, 'index.html'), html);
  const pages = supportingPages({ owner, analyticsId, origin, indexable, email: config.contactEmail });
  for (const page of pages) await writeFile(join(destination, page.path), versionHtml(page.html));
  await writeFile(join(destination, 'robots.txt'), indexable ? `User-agent: *\nAllow: /\n${origin ? `\nSitemap: ${origin}/sitemap.xml\n` : ''}` : 'User-agent: *\nDisallow: /\n');
  if (origin) await writeFile(join(destination, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['', ...pages.filter(page => page.index).map(page => page.path)].map(path => `<url><loc>${origin}/${path}</loc></url>`).join('')}</urlset>\n`);
  const hash = createHash('sha256').update(schemaText).digest('base64');
  const bootHash = createHash('sha256').update(boot).digest('base64');
  const csp = `default-src 'self'; script-src 'self' 'sha256-${hash}' 'sha256-${bootHash}'${analyticsId ? ' https://www.googletagmanager.com' : ''}; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:${analyticsId ? ' https://*.google-analytics.com https://www.googletagmanager.com' : ''}; connect-src 'self'${analyticsId ? ' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com' : ''}; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests`;
  await writeFile(join(destination, '_headers'), `/*\n  Content-Security-Policy: ${csp}\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n  Cross-Origin-Opener-Policy: same-origin\n  Cache-Control: public, max-age=0, must-revalidate\n${indexable ? '' : '  X-Robots-Tag: noindex, nofollow\n'}\n/assets/*\n  Cache-Control: public, max-age=86400, must-revalidate\n\n/404.html\n  X-Robots-Tag: noindex\n`);
  await writeFile(join(destination, '_redirects'), '/index.html / 301\n');
  // Immutable caching is only safe for content-addressed files. HTML stays fresh.
  const immutable = [...versions.values(), ...assetVersions.values()];
  const headers = await readFile(join(destination, '_headers'), 'utf8');
  await writeFile(join(destination, '_headers'), headers + immutable.map(name => `\n/${name}\n  Cache-Control: public, max-age=31536000, immutable\n`).join(''));
  console.log(`Built dist: ${indexable ? origin || 'public portable deploy' : 'noindex preview'} (${assets.length + optimized.length} assets).`);
  return { origin, indexable };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
