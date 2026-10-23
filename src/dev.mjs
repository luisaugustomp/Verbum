// Servidor de desenvolvimento com LiveReload e auto-rebuild.
// Uso: npm run dev
// Monitora articles/, style.css, script.js e images/.
// Ao salvar qualquer arquivo, recompila e atualiza o navegador instantaneamente.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const PORT = 8765;

const clients = new Set();

function build() {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', ['src/build.mjs'], { cwd: ROOT, stdio: 'inherit' });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Build falhou com código ${code}`));
        });
    });
}

function notifyClients() {
    for (const res of clients) {
        try {
            res.write('data: reload\n\n');
        } catch {
            clients.delete(res);
        }
    }
}

let debounceTimer = null;
function onChange(filename) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        console.log(`\n[Auto-rebuild] Alteração detectada (${filename || 'arquivo'}). Recompilando...`);
        try {
            await build();
            notifyClients();
            console.log('[Auto-rebuild] Navegador atualizado.');
        } catch (err) {
            console.error('[Auto-rebuild] Erro:', err.message);
        }
    }, 100);
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.xml': 'application/xml; charset=utf-8',
};

const liveReloadScript = `
<script>
(function() {
    const es = new EventSource('/__livereload');
    es.onmessage = function(e) {
        if (e.data === 'reload') {
            console.log('[LiveReload] Atualizando página...');
            location.reload();
        }
    };
    es.onerror = function() {
        setTimeout(() => location.reload(), 2000);
    };
})();
</script>
`;

const server = http.createServer((req, res) => {
    if (req.url === '/__livereload') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
        res.write('\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
    }

    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(PUBLIC, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Não encontrado');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (ext === '.html') {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace('</body>', `${liveReloadScript}</body>`);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } else {
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    }
});

await build();

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✨ Verbum rodando em: http://localhost:${PORT}`);
    console.log(`⚡ LiveReload ativo: edite qualquer markdown em articles/ e o navegador atualizará sozinho!\n`);
});

// Observar pastas e arquivos
const watchPaths = [
    path.join(ROOT, 'articles'),
    path.join(ROOT, 'images'),
    path.join(ROOT, 'src'),
];

for (const p of watchPaths) {
    if (fs.existsSync(p)) {
        fs.watch(p, { recursive: true }, (eventType, filename) => {
            if (filename && (filename.startsWith('.') || filename.endsWith('.tmp'))) return;
            onChange(filename);
        });
    }
}
