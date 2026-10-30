# Sentire blog publishing guide

## Purpose and audience

Help people living with hearing loss keep, organize and compare existing hearing-test records. Begin with practical hearing-history questions and original lived experience. Broader hearing technology, AI and cochlear-implant topics should connect clearly to that audience and receive fresh research, sourcing and review.

## Before every article

1. Identify a real reader question and search intent. Review current search results and relevant community questions, including Reddit/forums when useful. Treat community posts as anecdotal audience research, not clinical evidence.
2. Select one primary query and a small set of related phrases. Record why the page should answer that intent and what it adds. Do not invent keyword volume, difficulty, traffic estimates or ranking promises. Use Search Console data once available.
3. Check existing posts and the field guide to avoid publishing competing versions of the same answer. Choose a permanent, descriptive slug.
4. Write a brief in `content/briefs/SLUG.md`: audience, intent, primary/supporting phrases, dated research and sources, distinctive evidence, factual boundaries and intended next step. Published posts require this file at build time; it is not included in public assets.
5. Draft for the reader. Give useful answers early, use descriptive headings, explain unfamiliar language, and avoid keyword repetition for its own sake. Length should follow the question, not a word-count quota.

## Accuracy and authorship

- Use the author’s chosen public name and a truthful biography. Sentire’s creator currently publishes as **JW**; do not expand those initials or put his full name in visible copy, URLs, feeds or metadata without explicit approval. Never invent medical qualifications, reviewer endorsements, quotes, experiences, studies or product capabilities.
- Personal stories can describe the author's approved public experience. The creator currently wants diagnosis details kept out of public articles; do not reintroduce them without explicit approval. Do not infer a medical cause from a diagnosis, or expand autobiographical facts without confirmation.
- Clinical claims need current authoritative sources and appropriately qualified review when interpreting medical evidence. Clearly distinguish individual experience, product documentation, research findings, and treatment guidance.
- Technology coverage should separate announcements, research, regulatory status and actual availability. Cite primary papers, regulators and manufacturer documentation as appropriate. Date time-sensitive coverage and review it when facts change.
- Product imports produce draft suggestions that must be checked. Sentire organizes existing measurements; it does not perform a hearing test or make treatment decisions.
- Use fictional/example product screenshots unless the owner explicitly approves publication of personal records. Caption examples clearly and write descriptive alternative text.
- Disclose the relationship between the author, Sentire and Seravio. Do not label work medically reviewed without a real reviewer and an actual review.

## Content files

Each post has `content/posts/SLUG.md` (plain Markdown body) and `content/posts/SLUG.json` (metadata). Start body headings at h2; the template owns h1. HTML in Markdown is escaped. Keep content independent of frontend components to ease later migration.

Metadata fields: slug, title, description, excerpt, author ID, publishedAt, updatedAt, category, local image path/alt/caption/width/height, and an explicit draft boolean. Dates use full ISO 8601 timestamps with a time zone. Preserve the original publication date; change updatedAt only after a meaningful editorial update, not on every deployment.

Author records live in `content/authors/ID.json` and contain ID, name, role, bio and disclosure. IDs/slugs must match filenames. Draft articles never generate pages, feed entries, author listings or sitemap entries. Keep draft assets and sensitive source material outside `public/`; files in public are always deployable.

## Before publishing

- Verify factual claims, platform availability and links against the current product.
- Check the title and description represent the page honestly and naturally.
- Check heading order, readability, keyboard navigation, mobile overflow, image captions and alt text.
- Run `npm run check` and `npm run build`; preview the blog index, article and author page.
- Verify canonical/OG tags, BlogPosting/Breadcrumb structured data, RSS and sitemap. Schema must describe visible page content. Do not add fake FAQs or machine-only keyword paragraphs.
- Add useful internal links to related articles, the guide and product pages. Keep the call to action relevant and proportionate.
- Use the existing commerce asset assembly/deployment, preserving production purchase configuration. No CMS or new database is required.
- Review crawler/account settings and Google Search Console/Bing separately; those are not activated merely by publishing a post.

## After publishing

Check the public URL and feed. Once configured, monitor relevant queries, impressions, clicks and visits to product/guide/download pages. Compare results over time and improve the article where it fails to answer the reader's question. Do not treat crawler visits as proof of ranking or AI citations. Share articles only where relevant, follow community rules and disclose the creator relationship.

## Future CMS migration

Keep `/blog/SLUG/` URLs, author IDs, dates and canonical identities stable. The metadata maps to a posts collection and the Markdown body can be converted to a CMS rich-text representation. That conversion needs an importer, not a wholesale website redesign. Add editorial workflow/CMS infrastructure when it solves an actual publishing need.
