// app.js
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
    }
    
    async handleSearch(event) {
        event.preventDefault();
        
        const prompt = this.searchInput.value.trim();
        
        if (!prompt) {
            this.showSnackbar('Per favore inserisci una ricerca', 'error');
            return;
        }
        
        if (this.isLoading) return;
        
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
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }
    
    showLoading() {
        this.isLoading = true;
        
        // Animazione icona
        this.searchIcon.textContent = 'hourglass_empty';
        this.searchIcon.classList.add('loading-spin');
        
        // Disabilita input
        this.searchInput.disabled = true;
        
        // Barra di progresso
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
        if (progressBar) {
            progressBar.remove();
        }
    }
    
    showResults(aiResponse, originalPrompt) {
        // USA IL TUO TEMPLATE ESATTO
        const article = document.createElement('article');
        article.className = 'surface-container large-padding small-elevate round';
        article.style.display = 'none';
        
        // FORMATTA LA RISPOSTA AI CORRETTAMENTE
        const formattedResponse = this.formatAIResponse(aiResponse);
        
        article.innerHTML = `
            <h5 class="primary-text bold">⚡ Risultato della Ricerca</h5>
            <p class="on-surface-variant-text italic">
                <strong class="on-surface-text bold">Ricerca:</strong> "${originalPrompt}"
            </p>
            
            <div class="small-space"></div>
            
            ${formattedResponse}
            
            <div class="small-space"></div>
            
            <p class="on-surface-variant-text">
                Per informazioni <strong class="secondary-text bold">più enfatizzate e grassetto:</strong> e invece 
                <strong class="on-surface-text">testo normale da enfatizzare ma meno</strong> oppure 
                <em class="primary-text italic">testo evidenziato</em> con i colori del tema corrente.
            </p>
            
            <div class="medium-space"></div>
            
            <nav class="right-align">
                <button class="transparent small-margin" onclick="scintillaApp.copyToClipboard(this)">
                    <i>content_copy</i>
                    <span>Copia</span>
                </button>
                <button class="amber6 small-margin" onclick="scintillaApp.newSearch()">
                    <i>refresh</i>
                    <span>Nuova Ricerca</span>
                </button>
            </nav>
        `;
        
        // Aggiungi spazio
        const spacer = document.createElement('div');
        spacer.className = 'space';
        this.resultsContainer.appendChild(spacer);
        
        this.resultsContainer.appendChild(article);
        
        // Animazione
        setTimeout(() => {
            article.style.display = 'block';
            article.style.opacity = '0';
            article.style.transform = 'translateY(20px)';
            article.style.transition = 'all 0.4s ease-out';
            
            setTimeout(() => {
                article.style.opacity = '1';
                article.style.transform = 'translateY(0)';
            }, 10);
        }, 100);
        
        setTimeout(() => {
            article.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
    }
    
    formatAIResponse(response) {
        // FORMATTING MIGLIORATO per BeerCSS
        let formatted = response;
        
        // Suddividi in paragrafi
        const paragraphs = formatted.split(/\n\s*\n/).filter(p => p.trim());
        
        let formattedHTML = '';
        
        paragraphs.forEach((paragraph, index) => {
            paragraph = paragraph.trim();
            
            // Se è un titolo (inizia con # o è tutto maiuscolo)
            if (paragraph.startsWith('#') || paragraph === paragraph.toUpperCase() && paragraph.length < 50) {
                const title = paragraph.replace(/^#+\s*/, '');
                formattedHTML += `<h6 class="secondary-text bold">${title}</h6>`;
                if (index < paragraphs.length - 1) formattedHTML += '<div class="small-space"></div>';
                return;
            }
            
            // Se contiene punti elenco
            if (paragraph.includes('•') || paragraph.includes('-') || paragraph.includes('*')) {
                const lines = paragraph.split('\n');
                formattedHTML += '<div class="on-surface-text">';
                
                lines.forEach(line => {
                    line = line.trim();
                    if (line.match(/^[•\-\*]\s/)) {
                        const content = line.replace(/^[•\-\*]\s/, '');
                        formattedHTML += `<div><strong class="primary-text bold">•</strong> ${this.formatInlineText(content)}</div>`;
                    } else if (line) {
                        formattedHTML += `<div>${this.formatInlineText(line)}</div>`;
                    }
                });
                
                formattedHTML += '</div>';
            } else {
                // Paragrafo normale
                formattedHTML += `<p class="on-surface-text">${this.formatInlineText(paragraph)}</p>`;
            }
            
            // Spazio tra paragrafi
            if (index < paragraphs.length - 1) {
                formattedHTML += '<div class="small-space"></div>';
            }
        });
        
        return formattedHTML;
    }
    
    formatInlineText(text) {
        // Grassetto **testo** -> con class bold
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="secondary-text bold">$1</strong>');
        
        // Corsivo *testo* -> con class italic  
        text = text.replace(/\*([^*]+?)\*/g, '<em class="primary-text italic">$1</em>');
        
        // Enfasi ___testo___ -> grassetto primario
        text = text.replace(/___(.+?)___/g, '<strong class="primary-text bold">$1</strong>');
        
        return text;
    }
    
    hideResults() {
        this.resultsContainer.innerHTML = '';
    }
    
    showSnackbar(message, type = 'info') {
        const snackbar = document.createElement('div');
        snackbar.className = `snackbar ${type === 'error' ? 'error' : 'primary'} active`;
        
        const icon = type === 'error' ? 'error' : 'info';
        
        snackbar.innerHTML = `
            <i>${icon}</i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(snackbar);
        
        setTimeout(() => {
            snackbar.classList.remove('active');
            setTimeout(() => snackbar.remove(), 300);
        }, 4000);
    }
    
    copyToClipboard(button) {
        const article = button.closest('article');
        const textContent = article.querySelector('.on-surface-text').textContent;
        
        navigator.clipboard.writeText(textContent).then(() => {
            this.showSnackbar('Testo copiato negli appunti!');
            button.innerHTML = '<i>check</i><span>Copiato!</span>';
            
            setTimeout(() => {
                button.innerHTML = '<i>content_copy</i><span>Copia</span>';
            }, 2000);
        }).catch(() => {
            this.showSnackbar('Impossibile copiare il testo', 'error');
        });
    }
    
    newSearch() {
        this.hideResults();
        this.searchInput.value = '';
        this.searchInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.scintillaApp = new ScintillaApp();
});
