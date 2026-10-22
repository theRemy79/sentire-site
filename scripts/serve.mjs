import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {build,root} from './build.mjs';
import {configuration} from '../src/config.mjs';
const local = process.argv.includes('--local-preview');
const port = Number(process.env.PORT || 8791);
await build();
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
const server = http.createServer(async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{'Allow':'GET, HEAD'}).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if (pathname === '/checkout' && local) {res.writeHead(303,{'Location':'http://127.0.0.1:8860/buy'}).end();return;}
    if (pathname === '/api/config.json') {
      const config = configuration(JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8')),{local});
      res.writeHead(200,{'Content-Type':'application/json'}).end(req.method === 'HEAD' ? '' : JSON.stringify(config));return;
    }
    const directory = path.join(root,'dist');
    const file = path.resolve(directory,'.'+(pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(directory+path.sep) || !(await stat(file)).isFile()) throw Error('not found');
    const content = await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Content-Length':content.length});
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Page not found.');
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Sentire site: http://127.0.0.1:${port} (${local ? 'local test checkout enabled' : 'release configuration'})`));
