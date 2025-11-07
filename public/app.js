class ScintillaApp {
    constructor() {
        this.searchForm = document.getElementById('search-form');
        this.searchInput = document.getElementById('search-input');
        this.searchIcon = document.getElementById('search-icon');
        this.resultsContainer = document.getElementById('results-container');
        this.isLoading = false;

        this.init();
    }

    init() {
        this.searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        console.log('⚡ Scintilla App inizializzata');
        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ENTER: avvia la ricerca se la search bar è focalizzata e non vuota
            if (e.key === 'Enter' && document.activeElement === this.searchInput) {
                e.preventDefault();
                if (this.searchInput.value.trim() && !this.isLoading) {
                    this.searchForm.dispatchEvent(new Event('submit'));
                }
                return;
            }

            // SPAZIO: mette il focus sulla search bar (solo se non si sta scrivendo in un input)
            if (e.key === ' ') {
                // Non intercettare lo spazio se si sta scrivendo in un input, textarea o elemento editabile
                const activeElement = document.activeElement;
                const isTypingInInput = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.contentEditable === 'true'
                );

                if (!isTypingInInput) {
                    e.preventDefault(); // Evita lo scroll della pagina
                    this.focusSearchBar();
                }
            }
        });
    }

    focusSearchBar() {
        this.searchInput.focus();
        this.searchInput.select();
    }

    async handleSearch(event) {
        event.preventDefault();
        const prompt = this.searchInput.value.trim();
        if (!prompt || this.isLoading) return;

        try {
            this.showLoading();
            this.hideResults();
            const response = await this.callSearchAPI(prompt);
            this.hideLoading();
            if (response.success) {
                this.showResults(response.response, prompt);
            } else {
                throw new Error('Risposta non valida dal server');
            }
        } catch (error) {
            console.error('Errore durante la ricerca:', error);
            this.hideLoading();
            this.showSnackbar('Errore durante la ricerca. Riprova più tardi.', 'error');
        }
    }

    async callSearchAPI(prompt) {
        const response = await fetch('/api/scintilla.search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        if (response.status === 429) {
            const error = await response.json();
            throw new Error(`Rate limit superato: ${error.message}`);
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    showLoading() {
        this.isLoading = true;
        this.searchIcon.textContent = 'hourglass_empty';
        this.searchIcon.classList.add('loading-spin');
        this.searchInput.disabled = true;
        const progressBar = document.createElement('div');
        progressBar.id = 'search-progress';
        progressBar.className = 'progress-line';
        progressBar.innerHTML = '<div class="progress-fill"></div>';
        this.searchForm.appendChild(progressBar);
    }

    hideLoading() {
        this.isLoading = false;
        this.searchIcon.textContent = 'search';
        this.searchIcon.classList.remove('loading-spin');
        this.searchInput.disabled = false;
        const progressBar = document.getElementById('search-progress');
        if (progressBar) progressBar.remove();
    }

    showResults(aiResponse) {
        this.hideResults();
        const article = document.createElement('article');
        article.className = 'surface-container large-padding medium-elevate round';
        article.style.display = 'none';

        article.innerHTML = `
            <div class="ai-content">${this.formatAIResponse(aiResponse)}</div>
            <div class="medium-space"></div>
            <nav class="right-align">
                <button class="transparent" onclick="scintillaApp.copyToClipboard(this)"><i>content_copy</i><span>Copia</span></button>
                <button class="transparent" onclick="scintillaApp.searchImages(this)"><i>image</i><span>Immagini</span></button>
                <button class="primary" onclick="scintillaApp.newSearch()"><i>refresh</i><span>Nuova Ricerca</span></button>
            </nav>
        `;

        this.resultsContainer.appendChild(document.createElement('div')).className = 'large-space';
        this.resultsContainer.appendChild(article);

        // Animazione
        setTimeout(() => {
            article.style.display = 'block';
            Object.assign(article.style, { opacity: '0', transform: 'translateY(20px)', transition: 'all 0.4s ease-out' });
            setTimeout(() => Object.assign(article.style, { opacity: '1', transform: 'translateY(0)' }), 10);
        }, 100);
        setTimeout(() => article.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    }

    formatAIResponse(response) {
        const blocks = response.trim().split(/\n\s*\n/).filter(p => p.trim());

        return blocks.map(block => {
            block = block.trim();
            // Titoli (#, ##)
            if (block.startsWith('#')) {
                const level = (block.match(/^#+/) || [''])[0].length;
                const title = block.replace(/^#+\s*/, '');
                const tag = level === 1 ? 'h5' : 'h6';
                const classes = level === 1 ? 'bold primary-text' : 'bold secondary-text';
                return `<${tag} class="${classes}">${title}</${tag}>`;
            }
            // Liste (iniziano con - o *)
            if (block.match(/^\s*[\-\*]\s/)) {
                const lines = block.split('\n').filter(l => l.trim());
                const listItemsHTML = lines.map(line => {
                    const content = line.replace(/^\s*[\-\*]\s/, '');
                    return `<li>
                                <span class="primary-text bold" style="margin-right: 8px;">•</span>
                                <span>${this.formatInlineText(content)}</span>
                            </li>`;
                }).join('');
                return `<ul>${listItemsHTML}</ul>`;
            }
            // Paragrafo normale
            return `<p>${this.formatInlineText(block)}</p>`;
        }).join('');
    }

    formatInlineText(text) {
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="secondary-text bold">$1</strong>');
        text = text.replace(/\*([^*]+?)\*/g, '<em class="primary-text italic">$1</em>');
        return text;
    }

    hideResults() {
        this.resultsContainer.innerHTML = '';
    }

    showSnackbar(message, type = 'info') {
        const snackbarId = 'scintilla-snackbar';
        document.getElementById(snackbarId)?.remove();
        const snackbar = document.createElement('div');
        snackbar.id = snackbarId;
        const icon = type === 'error' ? 'error_outline' : 'check_circle';
        const colorClass = type === 'error' ? 'error' : 'inverse-surface';
        const iconColor = type === 'error' ? 'error-text' : 'primary-text';
        snackbar.className = `snackbar ${colorClass} top`;
        snackbar.innerHTML = `<i class="${iconColor}">${icon}</i><span>${message}</span>`;
        document.body.appendChild(snackbar);
        setTimeout(() => snackbar.classList.add('active'), 10);
        setTimeout(() => {
            snackbar.classList.remove('active');
            setTimeout(() => snackbar.remove(), 400);
        }, 4000);
    }

    copyToClipboard(button) {
        const content = button.closest('article')?.querySelector('.ai-content');
        if (!content) {
            this.showSnackbar('Nessun contenuto da copiare.', 'error');
            return;
        }
        navigator.clipboard.writeText(content.innerText).then(() => {
            this.showSnackbar('Risposta copiata negli appunti!');
            button.innerHTML = '<i>check</i><span>Copiato!</span>';
            setTimeout(() => button.innerHTML = '<i>content_copy</i><span>Copia</span>', 2000);
        }).catch(err => {
            console.error('Errore di copia:', err);
            this.showSnackbar('Impossibile copiare il testo.', 'error');
        });
    }

    newSearch() {
        this.hideResults();
        this.searchInput.value = '';
        this.searchInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    searchImages(button) {
        const contentElement = button.closest('article')?.querySelector('.ai-content');
        if (!contentElement) {
            this.showSnackbar('Impossibile estrarre il titolo.', 'error');
            return;
        }

        // Estrai il testo del primo elemento significativo (ad es. h5, h6, o il primo pezzo di testo)
        let title = '';

        // Cerca prima un eventuale titolo h5 o h6
        const titleElement = contentElement.querySelector('h5, h6');
        if (titleElement) {
            title = titleElement.textContent.trim();
        } else {
            // Altrimenti, prova a prendere il primo paragrafo o altro testo significativo
            const firstParagraph = contentElement.querySelector('p');
            if (firstParagraph) {
                title = firstParagraph.textContent.trim();
            } else {
                // Se proprio non trova testo, usa il contenuto interno (troncato per sicurezza)
                title = contentElement.textContent.trim().substring(0, 100);
            }
        }

        if (!title) {
            this.showSnackbar('Nessun testo significativo trovato.', 'error');
            return;
        }

        // Codifica il titolo per renderlo sicuro nell'URL
        const encodedTitle = encodeURIComponent(title);

        // Apri Google Images in una nuova scheda
        window.open(`https://www.google.com/search?q=${encodedTitle}&tbm=isch`, '_blank');
    } 
}

document.addEventListener('DOMContentLoaded', () => {
    window.scintillaApp = new ScintillaApp();
});

