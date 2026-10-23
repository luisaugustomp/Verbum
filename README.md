# Verbum

Reflexões sobre a Cultura e sobre a Bíblia.

Blog pessoal de ensaios e reflexões cristãs por Luis Augusto Matos Pontes.

---

## Estrutura Limpa do Repositório

Nenhum arquivo HTML compilado é versionado no repositório. O projeto é composto apenas pelos arquivos-fonte:

- `articles/` — Textos dos artigos em Markdown (`.md`) com frontmatter no topo.
- `images/` — Ilustrações em aquarela correspondentes aos artigos.
- `style.css` — Folha de estilos (design editorial com tema claro e escuro).
- `script.js` — Script de alternância de tema e compartilhamento nativo.
- `build.mjs` — Compilador estático (gera a pasta temporária `public/`).
- `dev.mjs` — Servidor de desenvolvimento com LiveReload e auto-rebuild.
- `.github/workflows/deploy.yml` — Ação do GitHub que publica o site sozinho no ar ao dar `git push`.

---

## Como Escrever e Publicar

### 1. No seu computador (com atualização instantânea na tela)
Para escrever vendo as alterações em tempo real no navegador:

```bash
npm run dev
```

Abra `http://localhost:8765`. 
Agora basta abrir qualquer arquivo dentro de `articles/` (ou criar um novo com `npm run novo -- meu-slug "Meu Título"`). 
**Assim que você salvar o Markdown (Cmd+S / Ctrl+S), a página atualiza sozinha na mesma hora.**

### 2. Para publicar no GitHub Pages
Você **não precisa compilar nada** na sua máquina antes de subir. Basta fazer o commit do Markdown e das imagens:

```bash
git add articles/ images/
git commit -m "Novo artigo: título do artigo"
git push
```

O GitHub Actions roda automaticamente na nuvem, compila o site e publica no GitHub Pages com todas as tags de prévia para WhatsApp e redes sociais.
