import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {configuration} from '../src/config.mjs';
export const root = fileURLToPath(new URL('../', import.meta.url));
export async function build() {
  const config = configuration(JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8')));
  const dist = path.join(root,'dist');
  await rm(dist,{recursive:true,force:true});
  await mkdir(path.join(dist,'api'),{recursive:true});
  await cp(path.join(root,'public'),dist,{recursive:true,filter:source=>!source.endsWith('.md')});
  const escape = value => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const seo = config.origin ? `<link rel="canonical" href="${escape(config.origin)}/"><meta property="og:url" content="${escape(config.origin)}/"><meta property="og:image" content="${escape(config.origin)}/assets/social-card.png"><meta name="twitter:card" content="summary_large_image">` : '<meta name="robots" content="noindex,follow">';
  await writeFile(path.join(dist,'index.html'),(await readFile(path.join(root,'src/index.html'),'utf8')).replace('{{SEO}}',seo));
  await mkdir(path.join(dist,'guide'),{recursive:true});
  const guideSEO = config.origin ? `<link rel="canonical" href="${escape(config.origin)}/guide/"><meta property="og:url" content="${escape(config.origin)}/guide/">` : '<meta name="robots" content="noindex,follow">';
  await writeFile(path.join(dist,'guide/index.html'),(await readFile(path.join(root,'src/guide.html'),'utf8')).replace('{{SEO}}',guideSEO));
  for (const slug of ['downloads','support','privacy','terms']) {
    await mkdir(path.join(dist,slug),{recursive:true});
    const pageSEO = config.origin ? `<link rel="canonical" href="${escape(config.origin)}/${slug}/">` : '<meta name="robots" content="noindex,follow">';
    await writeFile(path.join(dist,slug,'index.html'),(await readFile(path.join(root,`src/${slug}.html`),'utf8')).replace('{{SEO}}',pageSEO));
  }
  await writeFile(path.join(dist,'api/config.json'),JSON.stringify(config));
  await writeFile(path.join(dist,'robots.txt'),config.origin ? `User-agent: *\nAllow: /\nSitemap: ${config.origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
  if (config.origin) await writeFile(path.join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(config.origin)}/</loc></url><url><loc>${escape(config.origin)}/guide/</loc></url>${['downloads','support','privacy','terms'].map(slug=>`<url><loc>${escape(config.origin)}/${slug}/</loc></url>`).join('')}</urlset>`);
  console.log('Built sentire-site. '+(config.origin ? 'Public origin configured.' : 'Preview: no indexing, no live checkout.'));
  return config;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
