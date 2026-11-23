import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build, siteOrigin, versionedFilename } from './build.mjs';

test('CSS and JavaScript content changes invalidate previous browser cache keys', () => {
  assert.equal(versionedFilename('styles.css', 'a{}'), versionedFilename('styles.css', 'a{}'));
  assert.notEqual(versionedFilename('styles.css', 'a{}'), versionedFilename('styles.css', 'b{}'));
  assert.match(versionedFilename('navbar.js', 'test'), /^navbar\.[a-f0-9]{12}\.js$/);
});

test('canonical origin rejects malformed or local deployment addresses', () => {
  assert.equal(siteOrigin('https://netgri.example/'), 'https://netgri.example');
  for (const url of ['http://example.com', 'https://localhost', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com/?x=1']) assert.throws(() => siteOrigin(url));
});
test('production metadata, CSP hash, assets and preview isolation', async () => {
  try {
    await build({ url: 'https://netgri.example', context: 'production' });
    const html = await readFile('dist/index.html', 'utf8');
    assert.match(html, /rel="canonical" href="https:\/\/netgri.example\/"/);
    assert.match(html, /index, follow, max-image-preview:large/);
    assert.doesNotMatch(html, /SEO_BUILD|İşlerimizi gör|data-accent|class="noise"/);
    assert.match(html, /href="styles\.[a-f0-9]{12}\.css"/);
    assert.match(html, /src="script\.[a-f0-9]{12}\.js"/);
    assert.equal([...html.matchAll(/rel="stylesheet"/g)].length, 1);
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|open-peeps-crowd\.png|sefa-logo-transparent/);
    assert.match(html, /src="intro\.[a-f0-9]{12}\.js" defer/);
    const externalScripts = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)];
    assert.equal(externalScripts.length, 2);
    assert.ok(externalScripts.every(([tag]) => tag.includes(' defer')));
    const runtime = await readFile('dist/' + externalScripts.find(([, file]) => file.startsWith('script.'))[1], 'utf8');
    assert.ok(runtime.indexOf('// frame-batch.js') < runtime.indexOf('// whatsapp.js'));
    assert.ok(runtime.indexOf('// text-roll.js') < runtime.indexOf('// script.js'));
    assert.match(html, /noto-serif-turkish\.[a-f0-9]{12}\.woff2/);
    assert.doesNotMatch(html, /noto-serif-latin|cinzel-latin/);
    const headers = await readFile('dist/_headers', 'utf8');
    const boot = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    assert.ok(headers.includes(`'sha256-${createHash('sha256').update(boot).digest('base64')}'`));
    for (const sprite of boot.matchAll(/'([^']+\.webp)'/g)) await access('dist/' + sprite[1]);
    for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const candidate of match[1].split(',')) await access('dist/' + candidate.trim().split(/\s+/)[0]);
    }
    const cssPath = html.match(/href="(styles\.[a-f0-9]{12}\.css)"/)[1];
    const css = await readFile('dist/' + cssPath, 'utf8');
    assert.doesNotMatch(css, /https:\/\/fonts\./);
    for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) await access('dist/' + match[1].replace(/^\//, ''));
    assert.match(css, /font-display: swap/);
    assert.match(css, /U\+0100-02BA/); // Turkish extended Latin glyphs are retained.
    for (const name of [cssPath, ...html.matchAll(/(?:src|href)="\/?(assets\/[^" ]+\.[a-f0-9]{12}\.(?:webp|woff2))"/g)].map(value => typeof value === 'string' ? value : value[1])) {
      assert.ok(headers.includes(`/${name}\n  Cache-Control: public, max-age=31536000, immutable`));
    }
    assert.doesNotMatch(html, /(?:href|src)="(?:styles\.css|navbar\.css|script\.js|navbar\.js|whatsapp\.js)"/);
    assert.doesNotMatch(html.match(/<h1>[\s\S]*?<\/h1>/)[0], /sr-only/);
    const notFound = await readFile('dist/404.html','utf8');
    const notFoundCss = notFound.match(/href="\/(styles\.[a-f0-9]{12}\.css)"/)[1];
    await access('dist/' + notFoundCss);
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    assert.equal(JSON.parse(json)['@graph'][0].name, 'NETGRI');
    const hash = createHash('sha256').update(json).digest('base64');
    assert.ok((await readFile('dist/_headers','utf8')).includes(`'sha256-${hash}'`));
    assert.match(await readFile('dist/sitemap.xml','utf8'), /<loc>https:\/\/netgri.example\/<\/loc>/);
    assert.match(await readFile('dist/robots.txt','utf8'), /Allow: \/\n/);
    for (const match of html.matchAll(/(?:src|href|data-image)="([^"#]+)"/g)) {
      if (/^(https?:|data:|tel:|mailto:)/.test(match[1])) continue;
      await access('dist/' + match[1].replace(/^\//,''));
    }
    const published = await readdir('dist');
    for (const page of ['gizlilik.html','kullanim-kosullari.html','cerez-politikasi.html','tesekkurler.html']) {
      const content = await readFile('dist/' + page, 'utf8');
      assert.match(content, /<meta name="description"/);
      for (const match of content.matchAll(/(?:src|href)="(\/[^"#]+)"/g)) {
        if (match[1] === '/') continue;
        await access('dist' + match[1]);
      }
    }
    assert.match(await readFile('dist/tesekkurler.html','utf8'), /noindex,follow/);
    const sitemap = await readFile('dist/sitemap.xml','utf8');
    assert.match(sitemap, /gizlilik.html/);
    assert.doesNotMatch(sitemap, /tesekkurler|404/);
    for (const privateFile of ['review','memory-bank','scripts','PROJECT.md','site.config.json']) assert.ok(!published.includes(privateFile));
    assert.ok((await readdir('dist/assets')).every(name => !/preview|\.glb$|background/.test(name)));
    await build({ url: 'https://netgri.example', context: 'deploy-preview' });
    assert.match(await readFile('dist/index.html','utf8'), /noindex, nofollow/);
    assert.match(await readFile('dist/_headers','utf8'), /X-Robots-Tag: noindex, nofollow/);
    assert.match(await readFile('dist/robots.txt','utf8'), /Disallow: \//);
    await build({ url: '', context: 'production' });
    assert.doesNotMatch(await readFile('dist/index.html','utf8'), /rel="canonical"/);
    assert.match(await readFile('dist/index.html','utf8'), /index, follow, max-image-preview:large/);
    assert.doesNotMatch(await readFile('dist/index.html','utf8'), /noindex|netgri\.example/);
    assert.equal(await readFile('dist/robots.txt','utf8'), 'User-agent: *\nAllow: /\n');
    assert.doesNotMatch((await readFile('dist/_headers','utf8')).split('/404.html')[0], /noindex/);
    await assert.rejects(build({ analyticsId: 'invalid-id' }));
    await build({ analyticsId: 'G-TEST12345', context: 'production' });
    assert.match(await readFile('dist/index.html','utf8'), /name="analytics-id" content="G-TEST12345"/);
    assert.match(await readFile('dist/_headers','utf8'), /https:\/\/www.googletagmanager.com/);
    await build({ analyticsId: 'G-TEST12345', context: 'deploy-preview' });
    assert.doesNotMatch(await readFile('dist/index.html','utf8'), /G-TEST12345/);
  } finally { await build(); }
});
