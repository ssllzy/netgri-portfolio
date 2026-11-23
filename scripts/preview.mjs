import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain', '.webmanifest':'application/manifest+json' };
const port = Number(process.env.PORT || 4174);
async function readHeaders() {
  const headersFile = await readFile(resolve(root, '_headers'), 'utf8');
  const headers = {};
  for (const line of headersFile.split('\n').slice(1)) {
    if (!line.startsWith('  ')) break;
    const colon = line.indexOf(':');
    headers[line.slice(2, colon)] = line.slice(colon + 1).trim();
  }
  return headers;
}
createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' }); return response.end('Local preview does not accept form submissions.'); }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/index.html') { response.writeHead(301, { Location: '/' }); return response.end(); }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep) || pathname.startsWith('/_')) { response.writeHead(404); return response.end(); }
    let status = 200, content;
    try { if (!(await stat(file)).isFile()) throw new Error(); content = await readFile(file); }
    catch { status = 404; content = await readFile(resolve(root, '404.html')); }
    response.writeHead(status, { ...await readHeaders(), 'Content-Type': status === 404 ? mime['.html'] : mime[extname(file)] || 'application/octet-stream' });
    response.end(content);
  } catch { response.writeHead(400); response.end('Bad request'); }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
