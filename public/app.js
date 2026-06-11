class ScintillaApp {
    constructor() {
        this.searchForm = document.getElementById('search-form');
        this.searchInput = document.getElementById('search-input');
        this.searchIcon = document.getElementById('search-icon');
        this.resultsContainer = document.getElementById('results-container');
        this.micButton = document.getElementById('mic-button'); // Aggiungi questa riga 
        this.isLoading = false;

        this.init();
    }

    init() {
        this.loadSettings();
        this.searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        console.log('⚡ Scintilla App inizializzata');
        this.setupKeyboardShortcuts();
        this.setupSettingsPanel();
        this.applySettings();
        this.initSpeechRecognition();
    }

    loadSettings() {
        const defaults = { speechLang: 'it-IT', ankiFront: 'title', copyFormat: 'anki', dark: true };
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem('scintilla-settings')) || {};
        } catch (_) { /* localStorage non disponibile o JSON corrotto: usa i default */ }
        this.settings = { ...defaults, ...saved };
    }

    saveSettings() {
        try {
            localStorage.setItem('scintilla-settings', JSON.stringify(this.settings));
        } catch (_) { /* ignora se localStorage non è disponibile */ }
    }

    applySettings() {
        // Tema
        document.body.classList.toggle('dark', this.settings.dark);
        document.body.classList.toggle('light', !this.settings.dark);
        // Lingua del riconoscimento vocale (se già inizializzato)
        if (this.recognition) this.recognition.lang = this.settings.speechLang;
    }

    setupSettingsPanel() {
        const langSel = document.getElementById('setting-speech-lang');
        const frontSel = document.getElementById('setting-anki-front');
        const copySel = document.getElementById('setting-copy-format');
        const darkChk = document.getElementById('setting-dark');

        if (copySel) {
            copySel.value = this.settings.copyFormat;
            copySel.addEventListener('change', () => {
                this.settings.copyFormat = copySel.value;
                this.saveSettings();
            });
        }
        if (langSel) {
            langSel.value = this.settings.speechLang;
            langSel.addEventListener('change', () => {
                this.settings.speechLang = langSel.value;
                this.saveSettings();
                this.applySettings();
            });
        }
        if (frontSel) {
            frontSel.value = this.settings.ankiFront;
            frontSel.addEventListener('change', () => {
                this.settings.ankiFront = frontSel.value;
                this.saveSettings();
            });
        }
        if (darkChk) {
            darkChk.checked = this.settings.dark;
            darkChk.addEventListener('change', () => {
                this.settings.dark = darkChk.checked;
                this.saveSettings();
                this.applySettings();
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ENTER: avvia la ricerca se la search bar è focalizzata e non vuota
            if (e.key === 'Enter' && document.activeElement === this.searchInput) {
                e.preventDefault();
                if (this.searchInput.value.trim() && !this.isLoading) {
                    this.searchForm.requestSubmit();
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

            if (e.key.toLowerCase() === 'm' && e.ctrlKey && !this.isLoading) {
                // Evita che 'm' venga inserito nell'input se premuto casualmente
                if (document.activeElement !== this.searchInput) {
                    e.preventDefault();
                }
                // Simula un click sul bottone del microfono
                this.micButton?.click();
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

    showResults(aiResponse, prompt = '') {
        this.hideResults();
        const article = document.createElement('article');
        article.className = 'surface-container large-padding medium-elevate round';
        article.style.display = 'none';
        // Conserva il markdown grezzo e la domanda per costruire una nota Anki pulita in fase di copia.
        article.dataset.raw = aiResponse;
        article.dataset.prompt = prompt;

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
                const title = this.escapeHtml(block.replace(/^#+\s*/, ''));
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
        // Escape PRIMA della formattazione: neutralizza eventuale HTML/script nella risposta
        // (l'utente controlla il prompt, quindi il modello può essere indotto a restituire markup).
        text = this.escapeHtml(text);
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="secondary-text bold">$1</strong>');
        text = text.replace(/\*([^*]+?)\*/g, '<em class="primary-text italic">$1</em>');
        return text;
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

    // Costruisce una nota importabile in Anki dal markdown grezzo: front = titolo, back = risposta.
    // Formato: una riga "front<TAB>back" (il separatore di default di Anki), con il back in HTML
    // su una sola riga così l'import non si rompe sui newline.
    buildAnkiNote(markdown, prompt = '') {
        const lines = markdown.trim().split('\n');
        const headingIdx = lines.findIndex(l => /^#{1,6}\s/.test(l.trim()));

        let title, bodyMarkdown;
        if (headingIdx !== -1) {
            title = lines[headingIdx].replace(/^#{1,6}\s*/, '').trim();
            bodyMarkdown = lines.slice(headingIdx + 1).join('\n').trim();
        } else {
            title = (lines[0] || '').trim().slice(0, 120) || 'Scintilla';
            bodyMarkdown = markdown.trim();
        }

        let front, backMarkdown;
        if (this.settings?.ankiFront === 'question' && prompt.trim()) {
            // Fronte = domanda dell'utente; retro = risposta completa (incluso il titolo).
            front = this.escapeHtml(prompt.trim());
            backMarkdown = markdown.trim();
        } else {
            // Fronte = titolo della risposta; retro = corpo senza il titolo (già sul fronte).
            front = this.escapeHtml(title);
            backMarkdown = bodyMarkdown;
        }

        return { front, back: this.formatForAnki(backMarkdown) };
    }

    // Converte il markdown in HTML pulito adatto ad Anki: niente classi BeerCSS, niente bullet
    // manuali (li ci pensa <ul>), tutto su una sola riga per non rompere l'import TSV.
    formatForAnki(markdown) {
        const blocks = markdown.trim().split(/\n\s*\n/).filter(b => b.trim());

        const html = blocks.map(block => {
            block = block.trim();

            // Titoli (#, ##, ...) -> <b> (semplice e leggibile in Anki)
            if (block.startsWith('#')) {
                const title = this.escapeHtml(block.replace(/^#+\s*/, ''));
                return `<b>${title}</b>`;
            }

            // Liste (righe che iniziano con - o *)
            if (/^\s*[\-\*]\s/.test(block)) {
                const items = block.split('\n')
                    .filter(l => l.trim())
                    .map(line => `<li>${this.formatInlineAnki(line.replace(/^\s*[\-\*]\s/, ''))}</li>`)
                    .join('');
                return `<ul>${items}</ul>`;
            }

            // Paragrafo normale
            return `<p>${this.formatInlineAnki(block)}</p>`;
        }).join('');

        // Comprimi in un'unica riga: il separatore di campo di Anki è il TAB e i record vanno a capo.
        return html.replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }

    // Grassetto/corsivo in HTML semplice (<b>/<i>), con escaping del testo.
    formatInlineAnki(text) {
        text = this.escapeHtml(text);
        text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
        text = text.replace(/\*([^*]+?)\*/g, '<i>$1</i>');
        return text;
    }

    copyToClipboard(button) {
        const article = button.closest('article');
        const raw = article?.dataset.raw;
        if (!raw) {
            this.showSnackbar('Nessun contenuto da copiare.', 'error');
            return;
        }

        let text, successMessage;
        if (this.settings?.copyFormat === 'plain') {
            // Testo semplice: il contenuto leggibile così come mostrato a schermo.
            text = (article.querySelector('.ai-content')?.innerText || '').trim();
            successMessage = 'Risposta copiata negli appunti!';
        } else {
            // Nota Anki: una riga "titolo<TAB>risposta" importabile.
            const { front, back } = this.buildAnkiNote(raw, article.dataset.prompt || '');
            text = `${front}\t${back}`;
            successMessage = 'Nota copiata! Incolla in un file .txt e importala in Anki.';
        }

        const doSuccess = () => {
            this.showSnackbar(successMessage);
            button.innerHTML = '<i>check</i><span>Copiato!</span>';
            setTimeout(() => button.innerHTML = '<i>content_copy</i><span>Copia</span>', 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(doSuccess).catch(() => {
                document.execCommand('copy') ? doSuccess() : this.showSnackbar('Impossibile copiare il testo.', 'error');
            });
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy') ? doSuccess() : this.showSnackbar('Impossibile copiare il testo.', 'error');
            document.body.removeChild(ta);
        }
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
    
    initSpeechRecognition() {
        // Controlla se il browser supporta l'API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Il tuo browser non supporta il riconoscimento vocale.");
            this.micButton.style.display = 'none'; // Nascondi il bottone se non supportato
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false; // Ferma dopo che l'utente smette di parlare
        this.recognition.interimResults = false; // Non mostrare risultati intermedi
        this.recognition.lang = this.settings.speechLang; // Lingua impostata dalle Impostazioni

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.searchInput.value = transcript; // Inserisci il testo riconosciuto
            this.searchInput.focus(); // Rimetti il focus sull'input
            this.micButton.innerHTML = '<i>mic</i>'; // Resetta l'icona
            this.micButton.classList.remove('primary'); // Rimuovi eventuali effetti visivi
        };

        this.recognition.onerror = (event) => {
            console.error('Errore nel riconoscimento vocale:', event.error);
            this.micButton.innerHTML = '<i>mic</i>'; // Resetta l'icona
            this.micButton.classList.remove('primary');
            // Puoi aggiungere uno snackbar qui se vuoi avvisare l'utente
        };

        this.recognition.onend = () => {
            // Questo viene chiamato quando il riconoscimento finisce (anche se l'utente ha parlato)
            this.micButton.innerHTML = '<i>mic</i>'; // Resetta l'icona
            this.micButton.classList.remove('primary');
        };

        // Aggiungi l'evento click al bottone del microfono
        this.micButton.addEventListener('click', () => {
            // Ferma eventuali riconoscimenti in corso
            this.recognition.abort();
            // Resetta lo stato
            this.micButton.innerHTML = '<i>mic</i>';
            this.micButton.classList.remove('primary');

            // Avvia il riconoscimento
            this.recognition.start();
            // Cambia l'icona per indicare che è in ascolto
            this.micButton.innerHTML = '<i>mic_off</i>';
            this.micButton.classList.add('primary'); // Esempio: cambia colore per indicare stato attivo
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.scintillaApp = new ScintillaApp();
});

