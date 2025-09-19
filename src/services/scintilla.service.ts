// test-dashboard.service.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Context, Service, ServiceBroker, ServiceSchema, Errors } from "moleculer";
import { PassThrough } from "stream";

export default class TestDashboardService extends Service {
    private ai!: GoogleGenerativeAI;

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

    private async handleSearch(ctx: Context<{ prompt: string }>): Promise<object> {
        this.logger.info(`Richiesta AI ricevuta per il prompt: "${ctx.params.prompt}"`);

        // Prompt engineering per guidare l'AI a una formattazione migliore
        const systemPrompt = `
### ISTRUZIONI ###
Sei "Scintilla", un assistente AI specializzato in risposte concise, strutturate e dirette.
Rispondi alla richiesta dell'utente in modo chiaro e vai dritto al punto, senza preamboli o conclusioni non richieste.
La tua risposta deve essere formattata utilizzando un semplice Markdown.

### REGOLE DI FORMATTAZIONE ###
1.  **Titolo Principale**: Inizia la risposta con un titolo principale usando '#'. Esempio: '# Titolo della Risposta'.
2.  **Sottotitoli**: Se necessario, usa '##' per i sottotitoli.
3.  **Grassetto**: Usa \`**testo**\` per enfatizzare concetti chiave.
4.  **Corsivo**: Usa \`*testo*\` per termini o parole da evidenziare in corsivo.
5.  **Punti Elenco**: Usa un trattino '-' seguito da uno spazio per creare punti elenco.

EVITA assolutamente di aggiungere commenti sulla formattazione. Fornisci solo l'output formattato come richiesto.

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
