// Gerador do site Verbum.
// Uso: npm run build  (lê articles/*.md e escreve o site pronto em public/)
//
// SITE_URL é o endereço real do blog (ex.: https://verbum.com.br).
// Sem ele o site funciona, mas WhatsApp, iMessage e redes sociais
// não conseguem montar a pré-visualização do link com imagem.

import { marked } from 'marked';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'articles');

const SITE = {
    name: 'Verbum',
    tagline: 'Reflexões sobre a Cultura e sobre a Bíblia.',
    description: 'Um espaço para pensar sobre cultura, espiritualidade e as tensões da vida cristã moderna.',
    author: 'Luis Augusto Matos Pontes',
    url: (process.env.SITE_URL || '').replace(/\/$/, ''),
};

// ---------- utilidades ----------

const esc = (s = '') =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parseFrontmatter(raw, file) {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) throw new Error(`${file}: faltou o bloco de metadados (--- no topo do arquivo)`);
    const meta = {};
    for (const line of m[1].split(/\r?\n/)) {
        const i = line.indexOf(':');
        if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    for (const key of ['title', 'date', 'description']) {
        if (!meta[key]) throw new Error(`${file}: campo "${key}" ausente nos metadados`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
        throw new Error(`${file}: a data deve estar no formato AAAA-MM-DD (recebi "${meta.date}")`);
    }
    return { meta, body: m[2] };
}

const fmtDate = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

const readingMinutes = (text) => Math.max(1, Math.round(text.split(/\s+/).length / 220));

const abs = (p) => (SITE.url ? `${SITE.url}/${p}` : '');

// Versão dos arquivos de estilo e script: muda sempre que eles mudam,
// então o navegador nunca mistura página nova com CSS/JS antigo em cache.
const assetVersion = (file) =>
    crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, file))).digest('hex').slice(0, 8);
const CSS_V = assetVersion('style.css');
const JS_V = assetVersion('script.js');

// ---------- leitura dos artigos ----------

const posts = fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
        const slug = file.replace(/\.md$/, '');
        const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(SRC, file), 'utf8'), file);
        const html = marked
            .parse(body)
            // imagens do texto: images/x.jpg -> ../images/x.jpg (a página mora em /slug/)
            .replace(/<img src="images\//g, '<img loading="lazy" src="../images/');
        return { slug, ...meta, html, minutes: readingMinutes(body) };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

// ---------- templates ----------

const themeInit = `<script>
try {
    var t = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
} catch (e) { document.documentElement.setAttribute('data-theme', 'light'); }
</script>`;

const sunMoon = `
<svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
<svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

function layout({ title, description, root, canonical, ogImage, ogType, body }) {
    const fullTitle = title === SITE.name ? `${SITE.name} - Cultura e Bíblia` : `${title} | ${SITE.name}`;
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#121212" media="(prefers-color-scheme: dark)">
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(description)}">
    ${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
    <meta property="og:site_name" content="${SITE.name}">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:type" content="${ogType}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    ${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
    ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">\n    <meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
    ${SITE.url ? `<link rel="alternate" type="application/rss+xml" title="${SITE.name}" href="${SITE.url}/feed.xml">` : ''}
    ${themeInit}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${root}style.css?v=${CSS_V}">
</head>
<body>
    <header class="top-nav">
        <div class="nav-container">
            <a href="${root || './'}" class="logo">VERBUM</a>
            <button id="theme-toggle" class="theme-btn" aria-label="Alternar tema claro e escuro">${sunMoon}</button>
        </div>
    </header>
    ${body}
    <footer class="site-footer">
        <div class="footer-content">
            <div class="footer-logo">VERBUM</div>
            <p class="footer-desc">${SITE.tagline}</p>
            <p class="footer-copy">&copy; ${new Date().getFullYear()} ${SITE.author}.</p>
        </div>
    </footer>
    <script src="${root}script.js?v=${JS_V}"></script>
</body>
</html>
`;
}

function postPage(p, i) {
    const newer = posts[i - 1];
    const older = posts[i + 1];
    const nav = (newer || older)
        ? `<nav class="post-nav" aria-label="Outros artigos">
            ${older ? `<a href="../${older.slug}/"><span>Artigo anterior</span>${esc(older.title)}</a>` : '<span></span>'}
            ${newer ? `<a href="../${newer.slug}/" class="next"><span>Próximo artigo</span>${esc(newer.title)}</a>` : '<span></span>'}
        </nav>`
        : '';
    const cover = p.image
        ? `<img class="cover" src="../images/${esc(p.image)}" alt="${esc(p.imageAlt || '')}">`
        : '';
    const body = `<main class="main-container">
        <article class="article-content">
            ${cover}
            <h1>${esc(p.title)}</h1>
            <small>${fmtDate(p.date)} · ${esc(p.category || '')} · ${p.minutes} min de leitura · ${esc(SITE.author)}</small>
            ${p.html}
            <div class="share-row">
                <button class="share-btn" id="share-btn" data-title="${esc(p.title)}" data-text="${esc(p.description)}">Compartilhar este artigo</button>
            </div>
            ${nav}
        </article>
    </main>`;
    return layout({
        title: p.title,
        description: p.description,
        root: '../',
        canonical: abs(`${p.slug}/`),
        ogImage: p.image ? abs(`images/${p.image}`) : '',
        ogType: 'article',
        body,
    });
}

function homePage() {
    const cards = posts
        .map(
            (p) => `<li class="post-card">
            <a href="${p.slug}/">
                ${p.image ? `<img src="images/${esc(p.image)}" alt="${esc(p.imageAlt || '')}" loading="lazy">` : ''}
                <div class="post-card-text">
                    <span class="article-meta">${esc(p.category || '')} · ${fmtDate(p.date)} · ${p.minutes} min</span>
                    <h2>${esc(p.title)}</h2>
                    <p>${esc(p.description)}</p>
                </div>
            </a>
        </li>`
        )
        .join('\n        ');
    const body = `<main class="main-container home">
        <h1 class="home-title">Artigos</h1>
        <ul class="post-list">
        ${cards}
        </ul>
    </main>`;
    return layout({
        title: SITE.name,
        description: SITE.description,
        root: '',
        canonical: abs(''),
        ogImage: '',
        ogType: 'website',
        body,
    });
}

function feed() {
    const items = posts
        .map(
            (p) => `<item>
<title>${esc(p.title)}</title>
<link>${SITE.url}/${p.slug}/</link>
<guid>${SITE.url}/${p.slug}/</guid>
<pubDate>${new Date(`${p.date}T12:00:00`).toUTCString()}</pubDate>
<description>${esc(p.description)}</description>
</item>`
        )
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${SITE.name}</title>
<link>${SITE.url}/</link>
<description>${esc(SITE.description)}</description>
<language>pt-BR</language>
${items}
</channel></rss>
`;
}

// ---------- escrita ----------

fs.writeFileSync(path.join(ROOT, 'index.html'), homePage());
posts.forEach((p, i) => {
    fs.mkdirSync(path.join(ROOT, p.slug), { recursive: true });
    fs.writeFileSync(path.join(ROOT, p.slug, 'index.html'), postPage(p, i));
});
if (SITE.url) fs.writeFileSync(path.join(ROOT, 'feed.xml'), feed());

console.log(`OK: ${posts.length} artigos gerados na raiz do repositório.`);
posts.forEach((p) => console.log(`  /${p.slug}/  (${p.date}, ${p.minutes} min)`));
if (!SITE.url) {
    console.log('\nAviso: SITE_URL não definido. O site funciona, mas sem pré-visualização de link ao compartilhar.');
    console.log('Antes de publicar: SITE_URL=https://luisaugustomp.github.io/Verbum npm run build');
}
