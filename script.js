document.addEventListener('DOMContentLoaded', () => {
    // Tema claro/escuro (o valor inicial já foi aplicado no <head>, sem piscar)
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) { /* modo privado */ }
    });

    // Compartilhar: usa a folha nativa do iPhone/iPad/Android; no computador copia o link
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const data = {
                title: shareBtn.dataset.title,
                text: shareBtn.dataset.text,
                url: location.href,
            };
            if (navigator.share) {
                try { await navigator.share(data); } catch (e) { /* usuário cancelou */ }
                return;
            }
            try {
                await navigator.clipboard.writeText(location.href);
                const original = shareBtn.textContent;
                shareBtn.textContent = 'Link copiado!';
                setTimeout(() => (shareBtn.textContent = original), 2000);
            } catch (e) {
                prompt('Copie o link:', location.href);
            }
        });
    }
});
