import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to get current status of API keys (whether they are set)
  app.get("/api/key-status", (_req: express.Request, res: express.Response) => {
    res.json({
      openaiKeySet: !!process.env.OPENAI_API_KEY,
      geminiKeySet: !!process.env.GEMINI_API_KEY
    });
  });

  // API route to dynamically generate an architecture based on user prompt
  app.post("/api/generate-architecture", async (req: express.Request, res: express.Response) => {
    try {
      const { prompt, model } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const headerOpenaiKey = req.headers["x-openai-api-key"];
      const headerGeminiKey = req.headers["x-gemini-api-key"];

      const openaiApiKey = (typeof headerOpenaiKey === "string" && headerOpenaiKey) ? headerOpenaiKey : process.env.OPENAI_API_KEY;
      const geminiApiKey = (typeof headerGeminiKey === "string" && headerGeminiKey) ? headerGeminiKey : process.env.GEMINI_API_KEY;

      const requestedModel = model || "gpt-5.6";
      let actualOpenAIModel = "gpt-4o-mini";
      const validOpenAIModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"];
      if (validOpenAIModels.includes(requestedModel)) {
        actualOpenAIModel = requestedModel;
      }

      let openAIErrorOccurred = false;
      let openAIErrorMessage = "";

      // 1. If OpenAI API Key is provided, use OpenAI
      if (openaiApiKey) {
        try {
          console.log(`Generating architecture via OpenAI using simulated model ${requestedModel} (actual API model: ${actualOpenAIModel})...`);
          const openai = new OpenAI({ apiKey: openaiApiKey });

          const systemPrompt = `You are an expert cloud systems architect. You generate realistic, robust cloud systems topology JSON data.
You MUST respond with a valid, clean JSON object matching the following structure exactly:

{
  "name": "Descriptive, technical name of the architecture (e.g. 'Global Realtime Multiplayer Backend')",
  "description": "Comprehensive design details and architectural concept of this solution.",
  "assumptions": ["Assumption about traffic flow", "Assumption about data consistency/regions"],
  "estimatedTraffic": {
    "requestsPerSecond": 2500,
    "peakMultiplier": 2.5
  },
  "nodes": [
    {
      "id": "unique-id-slug-lowercase",
      "name": "Node Display Name (e.g., CDN Gateway, Payment microservice, primary-db)",
      "type": "one of: 'client', 'dns', 'cdn', 'gateway', 'load_balancer', 'service', 'worker', 'queue', 'cache', 'database', 'replica', 'backup_database', 'storage', 'monitoring', 'external_api'",
      "region": "e.g., Global, us-east-1, eu-west-1, ap-southeast-1",
      "status": "healthy",
      "capacity": 15000,
      "currentLoad": 4500,
      "latencyMs": 15,
      "replicas": 3,
      "criticality": "one of: 'low', 'medium', 'high', 'critical'",
      "metadata": {
        "x": 400, (X coordinate on canvas, range 0 to 2400. To create a beautiful left-to-right flow, place clients around x=50, DNS/CDNs at x=300, gateways/load_balancers at x=600, app services/workers at x=1000, caches/queues at x=1400, primary databases at x=1800, replicas/backups/monitoring at x=2200)
        "y": 250, (Y coordinate on canvas, range 50 to 550. Vertically distribute multiple nodes at the same stage to avoid overlaps)
        "description": "A precise technical description of what this node does and how it handles traffic."
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id-slug",
      "source": "source-node-id",
      "target": "target-node-id",
      "trafficPercentage": 100,
      "latencyMs": 5,
      "protocol": "e.g., HTTPS, gRPC, TCP, WebSockets, AMQP",
      "active": true,
      "backup": false
    }
  ],
  "risks": ["Risk 1", "Risk 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Layout guidelines:
- Calculate coordinate values (metadata.x and metadata.y) programmatically based on the node's position in the logical flow so they map perfectly left-to-right.
- Connect backup/standby servers with active=false, backup=true, and trafficPercentage=0.
- Make sure every edge source and target exactly matches a node id in your list.
- Capacity & Load Guidelines: To make interactive outage/failover simulations interesting, generate realistic "capacity" and "currentLoad" values. Set the initial "currentLoad" of primary service and database components to be around 65-80% of their "capacity", so that any outage of redundant paths or failover traffic redirection will naturally push peer/backup target nodes above 90% load and trigger warning statuses like 'overloaded' or 'degraded' in the simulation engine.
- Return ONLY the pure JSON object. Do not wrap in markdown code blocks like \`\`\`json.`;

          const completion = await openai.chat.completions.create({
            model: actualOpenAIModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Generate a cloud systems architecture for: "${prompt}"` }
            ],
            response_format: { type: "json_object" }
          });

          const responseText = completion.choices[0].message.content;
          if (!responseText) {
            throw new Error("Empty response received from OpenAI API");
          }

          const generatedData = JSON.parse(responseText.trim());
          return res.json(generatedData);
        } catch (openaiError: any) {
          console.log("OpenAI rate limit or error reached (falling back to Gemini). Info:", openaiError.message || openaiError);
          openAIErrorOccurred = true;
          openAIErrorMessage = openaiError.message || String(openaiError);
          if (!geminiApiKey) {
            return res.status(429).json({
              error: `OpenAI API call failed and no fallback available: ${openAIErrorMessage}. Please check your OpenAI API key status, billing quota, or setup.`
            });
          }
        }
      }

      // 2. If Gemini API Key is provided, fallback to Gemini
      if (geminiApiKey) {
        console.log(`Generating architecture via Gemini fallback${openAIErrorOccurred ? " because OpenAI was unavailable (" + openAIErrorMessage + ")" : ""}...`);
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Generate a realistic, robust, and detailed cloud systems architecture topology matching this description: "${prompt}".

The architecture must satisfy:
1. Between 6 to 14 nodes representing client, networking, gateway, services, databases, caches, queues, and regional boundaries.
2. Provide precise, cleanly laid-out coordinates in metadata.x and metadata.y so they map as an elegant left-to-right flow.
3. Establish appropriate source-to-target connections via edges.
4. Connect backup/standby servers with active=false, backup=true, and trafficPercentage=0.
5. Provide relevant real-world assumptions, scalability risks, and mitigation recommendations.
6. Set realistic "capacity" and "currentLoad" values. Set the initial "currentLoad" of primary service/database components to be around 65-80% of their "capacity", so that any outage of redundant paths or failover traffic redirection will naturally push peer/backup target nodes above 90% load and trigger warning statuses like 'overloaded' or 'degraded' in the simulation engine.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                estimatedTraffic: {
                  type: Type.OBJECT,
                  properties: {
                    requestsPerSecond: { type: Type.INTEGER },
                    peakMultiplier: { type: Type.NUMBER }
                  },
                  required: ["requestsPerSecond", "peakMultiplier"]
                },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      type: { type: Type.STRING, description: "Must be one of: 'client', 'dns', 'cdn', 'gateway', 'load_balancer', 'service', 'worker', 'queue', 'cache', 'database', 'replica', 'backup_database', 'storage', 'monitoring', 'external_api'" },
                      region: { type: Type.STRING },
                      status: { type: Type.STRING, description: "Must be 'healthy'" },
                      capacity: { type: Type.INTEGER },
                      currentLoad: { type: Type.INTEGER },
                      latencyMs: { type: Type.INTEGER },
                      replicas: { type: Type.INTEGER },
                      criticality: { type: Type.STRING, description: "Must be 'low', 'medium', 'high', or 'critical'" },
                      metadata: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.NUMBER, description: "X position on a 2500px wide layout (0 to 2400)" },
                          y: { type: Type.NUMBER, description: "Y position on a 600px high layout (50 to 550)" }
                        },
                        required: ["x", "y"]
                      }
                    },
                    required: ["id", "name", "type", "region", "status", "capacity", "currentLoad", "latencyMs", "replicas", "criticality", "metadata"]
                  }
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      source: { type: Type.STRING },
                      target: { type: Type.STRING },
                      trafficPercentage: { type: Type.INTEGER },
                      latencyMs: { type: Type.INTEGER },
                      protocol: { type: Type.STRING },
                      active: { type: Type.BOOLEAN },
                      backup: { type: Type.BOOLEAN }
                    },
                    required: ["id", "source", "target", "trafficPercentage", "latencyMs", "protocol", "active", "backup"]
                  }
                },
                risks: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "description", "assumptions", "estimatedTraffic", "nodes", "edges", "risks", "recommendations"]
            }
          }
        });

        const responseText = response.text;
        if (!responseText) {
          throw new Error("Empty response from Gemini API");
        }

        const generatedData = JSON.parse(responseText.trim());
        return res.json(generatedData);
      }

      // 3. If neither is set, let the user know
      return res.status(400).json({
        error: "Neither OPENAI_API_KEY nor GEMINI_API_KEY environment variable is configured. Please open the Settings menu (top-right) and set your OPENAI_API_KEY to enable dynamic OpenAI synthesis!"
      });

    } catch (error: any) {
      console.log("Error generating architecture:", error);
      res.status(500).json({ error: error.message || "Failed to generate architecture" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

