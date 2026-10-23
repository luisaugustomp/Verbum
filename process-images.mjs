// Normaliza o ponto de branco das aquarelas para que o papel fique 100% branco puro (#ffffff),
// integrando perfeitamente com o fundo da página sem bordas amarelas ou acinzentadas.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(ROOT, 'images');

const files = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

console.log(`Processando ${files.length} imagens para fundo branco puro...`);

for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
    
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i += info.channels) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Mapeia o tom amarelado/creme do papel (aprox. 245, 242, 224) para 255 branco puro
        r = Math.min(255, Math.round(r * (255 / 245)));
        g = Math.min(255, Math.round(g * (255 / 242)));
        b = Math.min(255, Math.round(b * (255 / 224)));

        // Qualquer pixel no limiar de quase-branco vira branco puro (#ffffff)
        if (r >= 248 && g >= 248 && b >= 248) {
            r = 255;
            g = 255;
            b = 255;
        }

        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
    }

    await sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
        .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
        .toFile(filePath + '.tmp');

    fs.renameSync(filePath + '.tmp', filePath);
    console.log(`  ✓ ${file}`);
}

console.log('Concluído: todas as imagens agora possuem fundo branco puro (#ffffff).');
