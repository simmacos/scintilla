// web-ui.service.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Service, ServiceBroker, ServiceSchema } from "moleculer";
import ApiGateway from "moleculer-web";
import path from "path";

export default class WebUIService extends Service {

    public constructor(broker: ServiceBroker) {
        super(broker);
        
        const schema: ServiceSchema = {
            name: "web-ui",
            mixins: [ApiGateway],
            
            settings: {
                port: process.env.WEB_UI_PORT || 4005,
                
                routes: [
                    {
                        path: "/api",
                        aliases: {
                            "POST scintilla.search": "scintilla.search"
                        }
                    },
                    {
                        path: "/",
                        use: [
                            ApiGateway.serveStatic(path.join(__dirname, "../../public"))
                        ]
                    }
                ]
            },
            
            created: this.serviceCreated.bind(this),
            started: this.serviceStarted.bind(this),
            stopped: this.serviceStopped.bind(this)
        };
        
        this.parseServiceSchema(schema);
    }

    private serviceCreated(): void {
        this.logger.info("gateway 🌍 created.");
    }

    private async serviceStarted() {
        this.logger.info(`web-ui started on http://localhost:${this.settings.port} ✅`);
    }

    private async serviceStopped() {
        this.logger.info("gateway 🌍 stopped.");
    }
}
