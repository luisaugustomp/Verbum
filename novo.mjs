// Cria um artigo novo com os metadados prontos.
// Uso: npm run novo -- nome-curto "Título do artigo"

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [slug, ...titleParts] = process.argv.slice(2);
if (!slug) {
    console.log('Uso: npm run novo -- nome-curto "Título do artigo"');
    process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
    console.log('O nome curto deve ter só letras minúsculas, números e hífen (ex.: perdao).');
    process.exit(1);
}

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'articles', `${slug}.md`);
if (fs.existsSync(file)) {
    console.log(`Já existe: articles/${slug}.md`);
    process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const title = titleParts.join(' ') || 'Título do artigo';

fs.writeFileSync(
    file,
    `---
title: ${title}
date: ${today}
category: Opinião
description: Uma ou duas frases que aparecem na prévia do link quando você compartilha.
image: ${slug}.jpg
imageAlt: Descrição da imagem de capa
---

Comece a escrever aqui.
`
);
console.log(`Criado: articles/${slug}.md`);
console.log(`Coloque a capa em images/${slug}.jpg, escreva o texto e rode: npm run build`);
