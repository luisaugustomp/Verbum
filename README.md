# Verbum

Reflexões sobre a Cultura e sobre a Bíblia.

Blog pessoal de ensaios e reflexões cristãs por Luis Augusto Matos Pontes.

---

## Estrutura do Projeto

- `articles/` — Textos dos artigos em Markdown com frontmatter.
- `images/` — Imagens e ilustrações autorais em aquarela.
- `style.css` — Estilos do blog (design editorial com suporte a tema claro e escuro).
- `script.js` — Alternador de tema e compartilhamento nativo.
- `build.mjs` — Gerador estático que compila os artigos em HTML para o GitHub Pages.
- `novo.mjs` — Script auxiliar para criar a estrutura de um novo artigo.

---

## Como Escrever e Publicar

### 1. Criar um novo artigo
```bash
npm run novo -- meu-artigo "Título do Artigo"
```
Isso criará o arquivo `articles/meu-artigo.md` com os metadados prontos.

### 2. Adicionar imagens
Coloque a imagem de capa em `images/meu-artigo-capa.jpg` e as ilustrações do texto em `images/`.

### 3. Compilar o blog
```bash
npm run build
```
Ou definindo a URL pública para habilitar a pré-visualização em redes sociais e WhatsApp:
```bash
SITE_URL="https://luisaugustomp.github.io/Verbum" npm run build
```

### 4. Testar localmente
```bash
npm run serve
```
Abra `http://localhost:8765` no navegador.
