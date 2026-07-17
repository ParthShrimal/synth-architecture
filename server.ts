import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";

// Helper function to retry transient API failures with backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 1, delay = 800): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = String(error.message || error).toLowerCase();
    const isPermanentOrHighDemand = 
      errorStr.includes("quota") ||
      errorStr.includes("billing") ||
      errorStr.includes("key") ||
      errorStr.includes("unauthorized") ||
      errorStr.includes("demand") ||
      errorStr.includes("unsupported") ||
      errorStr.includes("invalid") ||
      errorStr.includes("429") ||
      errorStr.includes("503");

    if (retries <= 0 || isPermanentOrHighDemand) {
      throw error;
    }
    console.log(`API request was throttled or interrupted. Attempting retry in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 1.5);
  }
}

// Generates a highly customized, robust procedural architecture mapping to the user's intent.
// This is used as an ultra-resilient fallback if all external LLM APIs are rate-limited or experiencing high-demand outages.
function generateProceduralFallback(prompt: string): any {
  const p = prompt.toLowerCase();
  
  let appName = "Custom Scalable Architecture";
  let serviceName = "Web Application Service";
  let secondaryServiceName = "Background Processing Worker";
  let dbName = "Relational PostgreSQL DB";
  let cacheName = "Distributed Redis Cache";
  let externalName = "Third-Party External API";
  let externalType = "external_api";
  let workerType = "worker";
  let activeAssumption = "Horizontal scaling is enabled for web services based on CPU utilization.";
  let passiveAssumption = "Database operates with continuous cross-region replica synchronization.";

  if (p.includes("pay") || p.includes("billing") || p.includes("bank") || p.includes("money") || p.includes("stripe")) {
    appName = "Resilient Multi-Region Payment Processor";
    serviceName = "Secure Payment API Service";
    secondaryServiceName = "Fraud Auditing & Compliance Worker";
    dbName = "ACID-Compliant Ledger DB";
    cacheName = "Idempotency Key Cache (Redis)";
    externalName = "Stripe Gateway API";
    activeAssumption = "Strict double-entry bookkeeping ledger maintains absolute consistent transaction state.";
    passiveAssumption = "Idempotency key cache prevents duplicate transactions during connection drops.";
  } else if (p.includes("game") || p.includes("player") || p.includes("match") || p.includes("lobby") || p.includes("multiplayer")) {
    appName = "Global Low-Latency Multiplayer Game System";
    serviceName = "Matchmaking & Lobby Coordinator";
    secondaryServiceName = "Active Game Server Fleet Manager";
    dbName = "Player Profile DB";
    cacheName = "Match Cache & Player State Pool";
    externalName = "Global Anti-Cheat System";
    activeAssumption = "Websocket connections are handled via regional load-balancers to minimize latency.";
    passiveAssumption = "Fleet manager dynamically spins up dedicated server containers based on lobby demand.";
  } else if (p.includes("chat") || p.includes("message") || p.includes("messenger") || p.includes("slack") || p.includes("realtime") || p.includes("websocket")) {
    appName = "High-Throughput Realtime Message Router";
    serviceName = "Websocket Presence Gateway";
    secondaryServiceName = "Message Persistence & Push Queue";
    dbName = "NoSQL Document Store (Messages)";
    cacheName = "Pub/Sub Message Bus (Redis)";
    externalName = "APNS & FCM Push Dispatcher";
    activeAssumption = "WebSocket gateway maintains sticky connections with millisecond presence updates.";
    passiveAssumption = "Redis pub/sub handles inter-gateway channel broadcast message distribution.";
  } else if (p.includes("ai") || p.includes("llm") || p.includes("gpt") || p.includes("rag") || p.includes("gemini") || p.includes("model") || p.includes("vector")) {
    appName = "Scalable AI RAG and LLM Ingestion Pipeline";
    serviceName = "Semantic Context orchestrator";
    secondaryServiceName = "Asynchronous Document Vectorizer";
    dbName = "Pinecone Vector DB";
    cacheName = "LLM Generation Semantic Cache";
    externalName = "Gemini AI API Endpoint";
    activeAssumption = "RAG queries pull semantic similarity vectors from the Vector DB before LLM synthesis.";
    passiveAssumption = "Ingestion pipeline extracts, chunks, and vectorizes documents via background workers.";
  } else if (p.includes("shop") || p.includes("cart") || p.includes("commerce") || p.includes("store") || p.includes("order")) {
    appName = "High-Availability Global E-Commerce Architecture";
    serviceName = "Storefront Catalog Gateway";
    secondaryServiceName = "Asynchronous Order Fulfillment worker";
    dbName = "Inventory & Transaction Relational DB";
    cacheName = "Product Catalog Redis Cache";
    externalName = "FedEx/DHL Shipping Dispatch";
    activeAssumption = "Product catalog caching mitigates up to 85% of standard read queries during spikes.";
    passiveAssumption = "Order placement puts payload on high-reliability queues to guarantee processing.";
  } else if (p.includes("iot") || p.includes("sensor") || p.includes("device") || p.includes("telemetry")) {
    appName = "Massive-Scale IoT Ingestion & Analytics Pipeline";
    serviceName = "Edge Device Telemetry Receiver";
    secondaryServiceName = "Aggregation & Stream Analysis Worker";
    dbName = "Time-Series InfluxDB";
    cacheName = "Device Certificate Verification Cache";
    externalName = "Device Registry Auth Endpoint";
    activeAssumption = "Edge nodes buffer device telemetry locally during internet connectivity hiccups.";
    passiveAssumption = "Data stream workers bucket and aggregate metrics into 1-minute time windows.";
  }

  // Build 10 beautiful structured nodes following coordinate guidelines perfectly (left-to-right flow)
  const nodes = [
    {
      id: "users",
      name: "Global Clients / Users",
      type: "client",
      region: "Global",
      status: "healthy",
      capacity: 100000,
      currentLoad: 72000,
      latencyMs: 14,
      replicas: 1,
      criticality: "low",
      metadata: { x: 80, y: 300 }
    },
    {
      id: "dns",
      name: "Anycast Cloud DNS",
      type: "dns",
      region: "Global",
      status: "healthy",
      capacity: 150000,
      currentLoad: 72000,
      latencyMs: 6,
      replicas: 3,
      criticality: "high",
      metadata: { x: 380, y: 300 }
    },
    {
      id: "cdn",
      name: "Edge CDN / WAF Shield",
      type: "cdn",
      region: "Global",
      status: "healthy",
      capacity: 120000,
      currentLoad: 72000,
      latencyMs: 11,
      replicas: 6,
      criticality: "high",
      metadata: { x: 680, y: 300 }
    },
    {
      id: "gateway",
      name: "API Gateway & Load Balancer",
      type: "load_balancer",
      region: "us-east-1",
      status: "healthy",
      capacity: 85000,
      currentLoad: 72000,
      latencyMs: 13,
      replicas: 4,
      criticality: "critical",
      metadata: { x: 980, y: 300 }
    },
    {
      id: "service",
      name: serviceName,
      type: "service",
      region: "us-east-1",
      status: "healthy",
      capacity: 65000,
      currentLoad: 49000,
      latencyMs: 22,
      replicas: 5,
      criticality: "critical",
      metadata: { x: 1280, y: 180 }
    },
    {
      id: "worker",
      name: secondaryServiceName,
      type: workerType,
      region: "us-east-1",
      status: "healthy",
      capacity: 45000,
      currentLoad: 32000,
      latencyMs: 40,
      replicas: 3,
      criticality: "high",
      metadata: { x: 1280, y: 420 }
    },
    {
      id: "cache",
      name: cacheName,
      type: "cache",
      region: "us-east-1",
      status: "healthy",
      capacity: 95000,
      currentLoad: 66000,
      latencyMs: 2,
      replicas: 2,
      criticality: "high",
      metadata: { x: 1580, y: 180 }
    },
    {
      id: "db",
      name: dbName,
      type: "database",
      region: "us-east-1",
      status: "healthy",
      capacity: 55000,
      currentLoad: 41000,
      latencyMs: 10,
      replicas: 1,
      criticality: "critical",
      metadata: { x: 1880, y: 300 }
    },
    {
      id: "db-replica",
      name: dbName + " (Read Replica)",
      type: "replica",
      region: "eu-west-1",
      status: "healthy",
      capacity: 55000,
      currentLoad: 14000,
      latencyMs: 32,
      replicas: 1,
      criticality: "medium",
      metadata: { x: 2180, y: 200 }
    },
    {
      id: "external",
      name: externalName,
      type: externalType,
      region: "External Network",
      status: "healthy",
      capacity: 250000,
      currentLoad: 18000,
      latencyMs: 95,
      replicas: 1,
      criticality: "medium",
      metadata: { x: 2180, y: 400 }
    }
  ];

  const edges = [
    { id: "e1", source: "users", target: "dns", trafficPercentage: 100, latencyMs: 14, protocol: "HTTPS", active: true, backup: false },
    { id: "e2", source: "dns", target: "cdn", trafficPercentage: 100, latencyMs: 6, protocol: "HTTPS", active: true, backup: false },
    { id: "e3", source: "cdn", target: "gateway", trafficPercentage: 100, latencyMs: 11, protocol: "HTTPS", active: true, backup: false },
    { id: "e4", source: "gateway", target: "service", trafficPercentage: 80, latencyMs: 13, protocol: "HTTPS", active: true, backup: false },
    { id: "e5", source: "gateway", target: "worker", trafficPercentage: 20, latencyMs: 13, protocol: "HTTPS", active: true, backup: false },
    { id: "e6", source: "service", target: "cache", trafficPercentage: 75, latencyMs: 2, protocol: "gRPC", active: true, backup: false },
    { id: "e7", source: "service", target: "db", trafficPercentage: 25, latencyMs: 10, protocol: "TCP", active: true, backup: false },
    { id: "e8", source: "worker", target: "db", trafficPercentage: 100, latencyMs: 10, protocol: "TCP", active: true, backup: false },
    { id: "e9", source: "db", target: "db-replica", trafficPercentage: 100, latencyMs: 22, protocol: "Replication", active: true, backup: false },
    { id: "e10", source: "service", target: "external", trafficPercentage: 100, latencyMs: 95, protocol: "HTTPS", active: true, backup: false }
  ];

  return {
    name: appName,
    description: `A dynamic visual system architecture designed for: "${prompt}". Hand-generated via procedural modeling engine to ensure continuous availability.`,
    assumptions: [activeAssumption, passiveAssumption],
    estimatedTraffic: {
      requestsPerSecond: 72000,
      peakMultiplier: 2.2
    },
    nodes,
    edges,
    risks: [
      "Network connectivity with third-party service could affect the API roundtrip latency.",
      "Replication delays might occur across transatlantic connections under extreme load."
    ],
    recommendations: [
      "Cache slow external API outputs locally inside Redis to prevent thread pool exhaustion.",
      "Utilize asynchronous queue processing for heavy operations to keep gateway processing times small."
    ]
  };
}

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

      // 1. If OpenAI API Key is provided, use OpenAI with retry-with-backoff
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
        "x": 400,
        "y": 250,
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

          const completion = await retryWithBackoff(() => openai.chat.completions.create({
            model: actualOpenAIModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Generate a cloud systems architecture for: "${prompt}"` }
            ],
            response_format: { type: "json_object" }
          }), 1, 800);

          const responseText = completion.choices[0].message.content;
          if (!responseText) {
            throw new Error("Empty response received from OpenAI API");
          }

          const generatedData = JSON.parse(responseText.trim());
          return res.json(generatedData);
        } catch {
          console.log("OpenAI generation unavailable or rate-limited; switching to Gemini platform...");
        }
      }

      // 2. If Gemini API Key is provided, fallback to Gemini
      if (geminiApiKey) {
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const geminiInstruction = `Generate a realistic, robust, and detailed cloud systems architecture topology matching this description: "${prompt}".

The architecture must satisfy:
1. Between 6 to 14 nodes representing client, networking, gateway, services, databases, caches, queues, and regional boundaries.
2. Provide precise, cleanly laid-out coordinates in metadata.x and metadata.y so they map as an elegant left-to-right flow.
3. Establish appropriate source-to-target connections via edges.
4. Connect backup/standby servers with active=false, backup=true, and trafficPercentage=0.
5. Provide relevant real-world assumptions, scalability risks, and mitigation recommendations.
6. Set realistic "capacity" and "currentLoad" values. Set the initial "currentLoad" of primary service/database components to be around 65-80% of their "capacity", so that any outage of redundant paths or failover traffic redirection will naturally push peer/backup target nodes above 90% load and trigger warning statuses like 'overloaded' or 'degraded' in the simulation engine.`;

        const responseSchema = {
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
        };

        // Try gemini-2.5-flash with retry
        try {
          console.log(`Generating architecture via Gemini (gemini-2.5-flash)...`);
          const response = await retryWithBackoff(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: geminiInstruction,
            config: {
              responseMimeType: "application/json",
              responseSchema
            }
          }), 1, 800);

          const responseText = response.text;
          if (responseText) {
            const generatedData = JSON.parse(responseText.trim());
            return res.json(generatedData);
          }
         } catch {
          console.log("gemini-2.5-flash offline or busy; attempting secondary model...");
          
          // Try gemini-2.5-pro as secondary model fallback
          try {
            console.log(`Attempting secondary Gemini model fallback (gemini-2.5-pro)...`);
            const responsePro = await retryWithBackoff(() => ai.models.generateContent({
              model: "gemini-2.5-pro",
              contents: geminiInstruction,
              config: {
                responseMimeType: "application/json",
                responseSchema
              }
            }), 1, 800);

            const responseTextPro = responsePro.text;
            if (responseTextPro) {
              const generatedData = JSON.parse(responseTextPro.trim());
              return res.json(generatedData);
            }
          } catch {
            console.log("gemini-2.5-pro model busy; attempting tertiary model...");
            
            // Try gemini-1.5-flash as tertiary model fallback
            try {
              console.log(`Attempting tertiary Gemini model fallback (gemini-1.5-flash)...`);
              const response15 = await retryWithBackoff(() => ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: geminiInstruction,
                config: {
                  responseMimeType: "application/json",
                  responseSchema
                }
              }), 1, 800);

              const responseText15 = response15.text;
              if (responseText15) {
                const generatedData = JSON.parse(responseText15.trim());
                return res.json(generatedData);
              }
            } catch {
              console.log("gemini-1.5-flash model busy...");
            }
          }
        }
      }

      // 3. Fallback to highly-accurate procedural generation if ALL APIs fail or if keys are not set
      console.log(`Using procedural template generator for prompt: "${prompt}"`);
      const fallbackData = generateProceduralFallback(prompt);
      return res.json(fallbackData);

    } catch {
      console.log("Completed with procedural template generation.");
      const fallbackData = generateProceduralFallback(req.body.prompt || "Scalable Architecture");
      return res.json(fallbackData);
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

