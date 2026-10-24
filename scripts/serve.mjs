import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {build,root} from './build.mjs';
import {configuration} from '../src/config.mjs';
const local = process.argv.includes('--local-preview');
const port = Number(process.env.PORT || 8791);
const commercePort = Number(process.env.SENTIRE_LOCAL_COMMERCE_PORT || 8860);
await build();
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8'};
const server = http.createServer(async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  // Local-only portal proxy: purchase service remains bound to loopback.
  if (local && req.url.startsWith('/license/')) {
    if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) {res.writeHead(400).end();return;}
    if (!['GET','HEAD','POST'].includes(req.method)) {res.writeHead(405).end();return;}
    const upstream = http.request({hostname:'127.0.0.1',port:commercePort,path:req.url,method:req.method,headers:{...req.headers,host:req.headers.host}},reply=>{
      res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);
    });
    upstream.setTimeout(20000,()=>upstream.destroy());
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'});res.end('The local license service is not running. Start the purchase service, then reload this page.');});
    req.pipe(upstream);return;
  }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{'Allow':'GET, HEAD'}).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if (pathname === '/checkout' && local) {res.writeHead(303,{'Location':'http://127.0.0.1:8860/buy'}).end();return;}
    if (pathname === '/api/config.json') {
      const config = configuration(JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8')),{local});
      res.writeHead(200,{'Content-Type':'application/json'}).end(req.method === 'HEAD' ? '' : JSON.stringify(config));return;
    }
    const directory = path.join(root,'dist');
    let file = path.resolve(directory,'.'+(pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(directory+path.sep)) throw Error('not found');
    let info = await stat(file);
    if (info.isDirectory()) {
      if (!pathname.endsWith('/')) {res.writeHead(301,{'Location':pathname+'/'+new URL(req.url,'http://127.0.0.1').search}).end();return;}
      file = path.join(file,'index.html'); info = await stat(file);
    }
    if (!info.isFile()) throw Error('not found');
    const content = await readFile(file);
    if (path.extname(file) === '.mp4') {
      res.setHeader('Accept-Ranges','bytes');
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        const start = match && match[1] ? Number(match[1]) : match && match[2] ? Math.max(0,content.length-Number(match[2])) : NaN;
        const end = match && match[1] && match[2] ? Math.min(Number(match[2]),content.length-1) : content.length-1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start<0 || start>=content.length || end<start) {res.writeHead(416,{'Content-Range':`bytes */${content.length}`}).end();return;}
        res.writeHead(206,{'Content-Type':'video/mp4','Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${content.length}`});
        res.end(req.method === 'HEAD' ? undefined : content.subarray(start,end+1));return;
      }
    }
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Content-Length':content.length});
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Page not found.');
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Sentire site: http://127.0.0.1:${port} (${local ? 'local test checkout enabled' : 'release configuration'})`));
