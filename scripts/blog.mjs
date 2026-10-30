import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({html: false, typographer: true});
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonLD = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const safeSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const required = (record, key) => { if (typeof record[key] !== 'string' || !record[key].trim()) throw Error(`Missing ${key} in blog content.`); };
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value.slice(0,10)}T00:00:00Z`).toISOString().slice(0,10) === value.slice(0,10);
const dateLabel = value => new Intl.DateTimeFormat('en-US', {month:'long', day:'numeric', year:'numeric', timeZone:'America/New_York'}).format(new Date(value));

export function renderMarkdown(body) {
  const tokens = markdown.parse(body, {}), headings = [], ids = new Map();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'heading_open') continue;
    if (token.tag === 'h1') throw Error('Article bodies must start at h2; the template supplies h1.');
    const inline = tokens[i + 1];
    const title = inline.children?.filter(t => ['text','code_inline'].includes(t.type)).map(t => t.content).join('') || inline.content;
    const base = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    const count = (ids.get(base) || 0) + 1; ids.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    token.attrSet('id', id);
    if (token.tag === 'h2') headings.push({title, id});
  }
  return {html: markdown.renderer.render(tokens, markdown.options, {}), headings, minutes: Math.max(1, Math.ceil(body.split(/\s+/).filter(Boolean).length / 200))};
}

export async function loadContent(contentRoot) {
  const authors = new Map();
  for (const file of (await readdir(path.join(contentRoot, 'authors'))).filter(f => f.endsWith('.json')).sort()) {
    const author = JSON.parse(await readFile(path.join(contentRoot, 'authors', file), 'utf8'));
    for (const key of ['id','name','role','bio','disclosure']) required(author, key);
    if (!safeSlug(author.id) || file !== `${author.id}.json` || authors.has(author.id)) throw Error('Invalid or duplicate blog author.');
    authors.set(author.id, author);
  }
  const posts = [];
  for (const file of (await readdir(path.join(contentRoot, 'posts'))).filter(f => f.endsWith('.json')).sort()) {
    const post = JSON.parse(await readFile(path.join(contentRoot, 'posts', file), 'utf8'));
    for (const key of ['slug','title','description','excerpt','author','publishedAt','updatedAt','category']) required(post, key);
    if (!safeSlug(post.slug) || ['authors','index','feed'].includes(post.slug) || file !== `${post.slug}.json`) throw Error('Invalid blog slug or filename.');
    if (!authors.has(post.author)) throw Error(`Unknown author for ${post.slug}.`);
    if (typeof post.draft !== 'boolean') throw Error(`Set draft explicitly for ${post.slug}.`);
    if (!validDate(post.publishedAt) || !validDate(post.updatedAt) || Date.parse(post.updatedAt) < Date.parse(post.publishedAt)) throw Error(`Invalid publication dates for ${post.slug}.`);
    if (typeof post.image !== 'string' || !/^\/assets\/[a-zA-Z0-9_/-]+\.(?:png|jpe?g|webp)$/.test(post.image) || post.image.includes('..')) throw Error(`Use a local asset image for ${post.slug}.`);
    for (const key of ['imageAlt','imageCaption']) required(post, key);
    if (!Number.isInteger(post.imageWidth) || post.imageWidth < 1 || !Number.isInteger(post.imageHeight) || post.imageHeight < 1) throw Error(`Supply image dimensions for ${post.slug}.`);
    const body = await readFile(path.join(contentRoot, 'posts', `${post.slug}.md`), 'utf8');
    if (!body.trim()) throw Error(`Empty article: ${post.slug}.`);
    if (!post.draft) {
      const brief = await readFile(path.join(contentRoot, 'briefs', `${post.slug}.md`), 'utf8');
      if (!brief.trim()) throw Error(`Add an editorial/keyword brief for ${post.slug}.`);
      posts.push({...post, ...renderMarkdown(body), authorRecord: authors.get(post.author)});
    }
  }
  posts.sort((a,b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.slug.localeCompare(b.slug));
  return {posts, authors};
}

const authorPath = author => `/blog/authors/${author.id}/`;
const postPath = post => `/blog/${post.slug}/`;
const header = `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="container blog-header"><a class="brand" href="/" aria-label="Sentire home"><img src="/assets/sentire-logo.svg" width="230" height="64" alt="Sentire"></a><nav aria-label="Main navigation"><a href="/downloads/">Get Sentire</a><a href="/guide/">Field guide</a><a href="/blog/">Blog</a><a href="/support/">Support</a></nav></div></header>`;
const footer = `<footer class="site-footer container"><p>Sentire · A product by <a href="https://seravio.io">Seravio</a>.<br><span>A personal record, not a diagnosis.</span></p><nav class="policy-links" aria-label="Policies and support"><a href="/blog/">Blog</a><a href="/blog/feed.xml">RSS feed</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/support/">Support</a></nav></footer>`;

function shell({origin, pathname, title, description, image='/assets/social-card.png', type='website', structured=[], extra='', body}) {
  const absolute = value => `${origin}${value}`;
  const indexing = origin ? `<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${escapeHTML(absolute(pathname))}"><meta property="og:url" content="${escapeHTML(absolute(pathname))}"><meta property="og:image" content="${escapeHTML(absolute(image))}">` : '<meta name="robots" content="noindex,follow">';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(title)}</title><meta name="description" content="${escapeHTML(description)}">${indexing}<meta property="og:type" content="${type}"><meta property="og:site_name" content="Sentire"><meta property="og:title" content="${escapeHTML(title)}"><meta property="og:description" content="${escapeHTML(description)}"><meta name="twitter:card" content="summary_large_image"><link rel="alternate" type="application/rss+xml" title="Sentire Blog" href="/blog/feed.xml"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/blog/blog.css">${extra}${origin && structured.length ? `<script type="application/ld+json">${jsonLD({'@context':'https://schema.org','@graph':structured})}</script>` : ''}</head><body class="blog-page">${header}${body}${footer}</body></html>`;
}

function crumbs(origin, entries) {
  return {'@type':'BreadcrumbList', itemListElement:entries.map(([name,pathname], index) => ({'@type':'ListItem',position:index+1,name,item:`${origin}${pathname}`}))};
}
const authorLink = author => `<a rel="author" href="${authorPath(author)}">${escapeHTML(author.name)}</a>`;
const meta = post => `<div class="post-meta"><span>${authorLink(post.authorRecord)}</span><span aria-hidden="true">·</span><time datetime="${escapeHTML(post.publishedAt)}">${dateLabel(post.publishedAt)}</time><span aria-hidden="true">·</span><span>${post.minutes} min read</span></div>`;
function card(post) {
  return `<article class="story-card"><div class="story-card-copy"><p class="eyebrow">${escapeHTML(post.category)}</p><h2><a href="${postPath(post)}">${escapeHTML(post.title)}</a></h2><p>${escapeHTML(post.excerpt)}</p>${meta(post)}<a class="story-link" href="${postPath(post)}">Read the story <span aria-hidden="true">↗</span></a></div><a class="story-card-image" href="${postPath(post)}" aria-label="Read ${escapeHTML(post.title)}"><img src="${escapeHTML(post.image)}" width="${post.imageWidth}" height="${post.imageHeight}" alt="${escapeHTML(post.imageAlt)}" loading="lazy"></a></article>`;
}

export async function buildBlog({root, dist, origin}) {
  const {posts, authors} = await loadContent(path.join(root, 'content'));
  for (const post of posts) await readFile(path.join(root, 'public', post.image.slice(1))); // Fail on broken article images.
  const routes = [];
  const save = async (pathname, html, modified) => {
    const file = path.join(dist, pathname.slice(1), 'index.html');
    await mkdir(path.dirname(file), {recursive:true}); await writeFile(file, html);
    routes.push({pathname, ...(modified ? {modified} : {})});
  };
  await save('/blog/', shell({origin, pathname:'/blog/', title:'Hearing History, Audiograms & the Story Behind Sentire | Blog', description:'Stories and practical perspectives on keeping your hearing history, organizing audiograms, and building Sentire.', structured:[{'@type':'Blog',name:'Sentire Blog',url:`${origin}/blog/`,description:'Personal hearing history, audiograms, and the story behind Sentire.'}, crumbs(origin,[['Home','/'],['Blog','/blog/']])], body:`<main id="main" class="container blog-main" tabindex="-1"><section class="journal-intro"><p class="eyebrow">THE SENTIRE BLOG</p><h1>Your hearing has a history.<br><em>Let’s make it easier to follow.</em></h1><p class="journal-deck">Stories from living with hearing loss, perspectives on keeping your records, and the thinking behind Sentire.</p></section><section class="story-list" aria-labelledby="latest-heading"><div class="section-label"><h2 id="latest-heading">From the journal</h2><a href="/blog/feed.xml">Follow via RSS <span aria-hidden="true">↗</span></a></div>${posts.length ? posts.map(card).join('') : '<p>New stories are on their way.</p>'}</section><aside class="journal-note"><p class="eyebrow">A PERSONAL PERSPECTIVE</p><h2>Written from experience.<br><em>Made for clearer conversations.</em></h2><p>This journal begins with the experience that led to Sentire: wanting a more useful personal record of hearing tests over time. Personal stories reflect the author’s experience. Clinical topics, when covered, will be clearly sourced.</p><a class="story-link" href="/guide/">Explore the Sentire field guide <span aria-hidden="true">↗</span></a></aside></main>`}));

  for (const post of posts) {
    const author = post.authorRecord, pathname = postPath(post), url = `${origin}${pathname}`;
    const contents = post.headings.map(h => `<li><a href="#${h.id}">${escapeHTML(h.title)}</a></li>`).join('');
    const toc = `<nav class="article-toc desktop-toc" aria-label="On this page"><p class="eyebrow">IN THIS STORY</p><ol>${contents}</ol><a class="toc-back" href="/blog/">← All stories</a></nav><details class="mobile-toc"><summary>In this story</summary><nav class="article-toc" aria-label="On this page"><ol>${contents}</ol></nav></details>`;
    const modified = post.updatedAt !== post.publishedAt ? `<p class="updated-date">Updated <time datetime="${escapeHTML(post.updatedAt)}">${dateLabel(post.updatedAt)}</time></p>` : '';
    const structured = [{'@type':'BlogPosting','@id':`${url}#article`,headline:post.title,description:post.description,mainEntityOfPage:{'@type':'WebPage','@id':url},url,datePublished:post.publishedAt,dateModified:post.updatedAt,articleSection:post.category,inLanguage:'en',image:{'@type':'ImageObject',url:`${origin}${post.image}`,width:post.imageWidth,height:post.imageHeight},author:{'@type':'Person','@id':`${origin}${authorPath(author)}#person`,name:author.name,url:`${origin}${authorPath(author)}`},publisher:{'@type':'Organization',name:'Seravio',url:'https://seravio.io'},isPartOf:{'@type':'Blog',name:'Sentire Blog',url:`${origin}/blog/`}},crumbs(origin,[['Home','/'],['Blog','/blog/'],[post.title,pathname]])];
    await save(pathname, shell({origin, pathname, title:`${post.title} | Sentire`, description:post.description, image:post.image, type:'article', structured, extra:`<meta property="article:published_time" content="${escapeHTML(post.publishedAt)}"><meta property="article:modified_time" content="${escapeHTML(post.updatedAt)}">`, body:`<main id="main" class="container blog-main" tabindex="-1"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/blog/">Blog</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHTML(post.title)}</span></nav><article><header class="article-heading"><p class="eyebrow">${escapeHTML(post.category)}</p><h1>${escapeHTML(post.title)}</h1><p class="article-deck">${escapeHTML(post.excerpt)}</p>${meta(post)}${modified}</header><div class="article-layout"><aside>${toc}</aside><div class="article-column"><div class="article-body">${post.html}</div><figure class="article-figure"><img src="${escapeHTML(post.image)}" width="${post.imageWidth}" height="${post.imageHeight}" alt="${escapeHTML(post.imageAlt)}" loading="lazy"><figcaption>${escapeHTML(post.imageCaption)}</figcaption></figure><section class="author-box" id="author" aria-labelledby="author-heading"><span class="author-monogram" aria-hidden="true">${escapeHTML(author.name.trim().includes(' ') ? author.name.split(/\s+/).slice(0,2).map(n=>n[0]).join('') : author.name.slice(0,2))}</span><div><p class="eyebrow">ABOUT THE AUTHOR</p><h2 id="author-heading">${authorLink(author)}</h2><p>${escapeHTML(author.bio)}</p><p class="author-disclosure">${escapeHTML(author.disclosure)}</p></div></section><aside class="article-next"><p class="eyebrow">MAKE ROOM FOR YOUR HISTORY</p><h2>A place for your audiograms.<br><em>A clearer view over time.</em></h2><p>See how Sentire helps you keep hearing-test records on your own computer.</p><a class="button" href="/downloads/">Explore Sentire <span aria-hidden="true">↗</span></a></aside></div></div></article></main>`}), post.updatedAt);
  }
  for (const author of authors.values()) {
    const written = posts.filter(post => post.author === author.id);
    if (!written.length) continue;
    const pathname = authorPath(author);
    await save(pathname, shell({origin, pathname, title:`${author.name} — ${author.role}`, description:author.bio, structured:[{'@type':'ProfilePage',mainEntity:{'@type':'Person','@id':`${origin}${pathname}#person`,name:author.name,description:author.bio,url:`${origin}${pathname}`}},crumbs(origin,[['Home','/'],['Blog','/blog/'],[author.name,pathname]])], body:`<main id="main" class="container blog-main author-page" tabindex="-1"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/blog/">Blog</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHTML(author.name)}</span></nav><header class="author-intro"><p class="eyebrow">${escapeHTML(author.role)}</p><h1>${escapeHTML(author.name)}</h1><p class="journal-deck">${escapeHTML(author.bio)}</p><p class="author-disclosure">${escapeHTML(author.disclosure)}</p></header><section class="story-list" aria-labelledby="author-stories"><div class="section-label"><h2 id="author-stories">Stories by ${escapeHTML(author.name)}</h2></div>${written.map(card).join('')}</section></main>`}));
  }
  // Absolute feed links are emitted only when a public canonical origin is configured.
  const feed = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Sentire Blog</title><link>${escapeHTML(origin ? `${origin}/blog/` : '/blog/')}</link><description>Personal hearing history, audiograms, and the story behind Sentire.</description><language>en</language>${origin ? `<atom:link href="${escapeHTML(origin)}/blog/feed.xml" rel="self" type="application/rss+xml"/>` : ''}${posts.map(post => `<item><title>${escapeHTML(post.title)}</title><link>${escapeHTML(origin + postPath(post))}</link><guid isPermaLink="${origin ? 'true' : 'false'}">${escapeHTML(origin + postPath(post))}</guid><description>${escapeHTML(post.excerpt)}</description><dc:creator>${escapeHTML(post.authorRecord.name)}</dc:creator><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;
  await mkdir(path.join(dist, 'blog'), {recursive:true}); await writeFile(path.join(dist, 'blog/feed.xml'), feed);
  return routes;
}
