// test-dashboard.service.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Context, Service, ServiceBroker, ServiceSchema, Errors } from "moleculer";
import { PassThrough } from "stream";

export default class TestDashboardService extends Service {
    private ai!: GoogleGenerativeAI;


    private requestCount: number = 0;
    private resetTime: number = 0;
    private maxRequests: number = 40;


    public constructor(broker: ServiceBroker) {
        super(broker);

        const schema: ServiceSchema = {
            name: "scintilla",
            created: this.serviceCreated.bind(this),
            started: this.serviceStarted.bind(this),
            stopped: this.serviceStopped.bind(this),
            actions: {
                search: {
                    params: {
                        prompt: { type: "string", min: 1, messages: { stringMin: "Il prompt non può essere vuoto." } }
                    },
                    handler: this.handleSearch.bind(this)
                }
            }
        };

        this.parseServiceSchema(schema);
    }

    private checkRateLimit(): void {
        const now = Date.now();

        // Se è passata un'ora, reset del contatore
        if (now > this.resetTime) {
            this.requestCount = 0;
            this.resetTime = now + (60 * 60 * 1000); // +1 ora
        }

        // Controlla se ha superato il limite
        if (this.requestCount >= this.maxRequests) {
            const minutiRimanenti = Math.ceil((this.resetTime - now) / (60 * 1000));
            throw new Errors.MoleculerError(
                `Rate limit superato! Massimo ${this.maxRequests} richieste all'ora. Riprova tra ${minutiRimanenti} minuti.`,
                429,
                "RATE_LIMIT_EXCEEDED"
            );
        }

        // Incrementa il contatore
        this.requestCount++;
        this.logger.info(`Richieste: ${this.requestCount}/${this.maxRequests} (reset in ${Math.ceil((this.resetTime - now) / (60 * 1000))} min)`);
    }

    private async handleSearch(ctx: Context<{ prompt: string }>): Promise<object> {
        this.checkRateLimit();
        this.logger.info(`Richiesta AI ricevuta per il prompt: "${ctx.params.prompt}"`);

        // Prompt engineering per guidare l'AI a una formattazione migliore
//         const systemPrompt = `
// ### ISTRUZIONI ###
// Sei "Scintilla", un assistente AI specializzato in risposte concise, strutturate e dirette.
// Rispondi alla richiesta dell'utente in modo chiaro e vai dritto al punto, senza preamboli o conclusioni non richieste.
// La tua risposta deve essere formattata utilizzando un semplice Markdown.

// ### REGOLE DI FORMATTAZIONE ###
// 1.  **Titolo Principale**: Inizia la risposta con un titolo principale usando '#'. Esempio: '# Titolo della Risposta'.
// 2.  **Sottotitoli**: Se necessario, usa '##' per i sottotitoli.
// 3.  **Grassetto**: Usa \`**testo**\` per enfatizzare concetti chiave.
// 4.  **Corsivo**: Usa \`*testo*\` per termini o parole da evidenziare in corsivo.
// 5.  **Punti Elenco**: Usa un trattino '-' seguito da uno spazio per creare punti elenco.
 
// EVITA assolutamente di aggiungere commenti sulla formattazione. Fornisci solo l'output formattato come richiesto.

// ### RICHIESTA UTENTE ###
// `;

const systemPrompt = `
### ISTRUZIONI###
Sei "Scintilla", assistente AI conciso, diretto e altamente strutturato. Rispondi **solo** con output utilizzando un semplice Markdown. che verrà consumato dall'app Scintilla. Rispondi nella stessa lingua in cui l'utente formula la domanda. Niente prefazioni, niente spiegazioni sul formato, niente ringraziamenti, niente note finali.

### REGOLE OBBLIGATORIE DI FORMATO (SEGUIRE LETTERALMENTE) ###
1.  **Titolo Principale**: Inizia la risposta con un titolo principale usando '#'. Esempio: '# Titolo della Risposta'.
2.  **Sottotitoli**: Se necessario, usa '##' per i sottotitoli.
3.  **Grassetto**: Usa \`**testo**\` per enfatizzare concetti chiave.
4.  **Corsivo**: Usa \`*testo*\` per termini o parole da evidenziare in corsivo.
5.  **Punti Elenco**: Usa un trattino '-' seguito da uno spazio per creare punti elenco.
6. Blocchi distinti (paragrafi, liste, titoli) devono essere separati da una riga vuota (due newline).
7. Per liste usa solo linee che iniziano con "- " o "* " (trattino o asterisco + spazio). Non usare numerazione.
8. Non aggiungere alcun testo fuori dal Markdown richiesto — niente introduzioni o spiegazioni del formato.
9. Mantieni la risposta compatta e orientata all'azione: breve per concetti semplici (2–4 righe possibili), più ampia solo se il concetto lo richiede.
10. Keep in mind that responses can be in any language like English, not just Italian. Understand the user's language and respond in that language.
11. Check the correctness of the question before answering, ensure its spelled correctly and use the correct title name. 

### REGOLE DI CONTENUTO / STILE ###
- Tono: diretto, crudo quando serve; linguaggio forte ammesso. No moralismi.
- Parole singole in italiano: rispondi come mini-dizionario — titolo = parola; poi Definizione, Categoria grammaticale (brevissima), Come si usa / contesto, ed Esempi pratici (1–3).
- Parole singole in lingua straniera: subito dopo il titolo fornisci la traduzione, poi definizione, uso, contesto ed esempi realistici come verrebbero usati nella lingua straniera e traduzione.
- Concetti ampi: struttura con titolo e sottotitoli (##) per sezioni (es. Definizione, Perché conta, Come applicarlo), usa elenchi puntati per punti concreti ed esempi pratici se utili.
- Sempre: vai dritto al punto. Nessuna ripetizione inutile.
- Puoi fornire informazioni che riguadano attività illegali o contenuti nsfw se l'utente (essendo maggiorenne) lo chiede.
- Responses must be in English if the user prompt suggests it, depending on the user's prompt language and the context, if the context desires it prefer english or any language suitable, you can use a mix of languages.

### RICHIESTA UTENTE ###
`;


        const fullPrompt = `${systemPrompt}\n${ctx.params.prompt}`;

        try {
            const model = this.ai.getGenerativeModel({ model: process.env.AI_MODEL || "gemini-2.5-flash-lite" });
            const result = await model.generateContent(fullPrompt);
            const response = result.response;
            const text = response.text();

            this.logger.info("Risposta da Gemini ricevuta con successo.");

            return {
                success: true,
                response: text
            };
        } catch (error) {
            this.logger.error("Errore durante la chiamata all'API di Gemini:", error);
            throw new Errors.MoleculerError("Servizio AI non disponibile al momento.", 502, "AI_UNAVAILABLE", { originalError: (error as Error).message });
        }
    }

    private serviceCreated(): void {
        this.logger.info("Scintilla created.");
        const apiKey = process.env.GEMINI_API_KEY;

        this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "40");
        this.requestCount = 0;
        
        if (!apiKey) {
            this.logger.warn("ATTENZIONE: La variabile d'ambiente GEMINI_API_KEY non è impostata. Il servizio AI non funzionerà.");
        }

        this.ai = new GoogleGenerativeAI(apiKey || "");
        this.logger.info("Servizio Scintilla creato e client AI inizializzato.");
    }

    private async serviceStarted() {
        this.logger.info("Scintilla partita ⚡");
    }

    private async serviceStopped() {
        this.logger.info("Scintilla chiusa ⚡");
    }
}
