import type { Architecture } from '../types/architecture';

export async function generateViaGeminiClient(prompt: string, apiKey: string): Promise<Architecture> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const responseSchema = {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      description: { type: "STRING" },
      assumptions: { type: "ARRAY", items: { type: "STRING" } },
      estimatedTraffic: {
        type: "OBJECT",
        properties: {
          requestsPerSecond: { type: "INTEGER" },
          peakMultiplier: { type: "NUMBER" }
        },
        required: ["requestsPerSecond", "peakMultiplier"]
      },
      nodes: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            name: { type: "STRING" },
            type: { 
              type: "STRING", 
              description: "Must be one of: 'client', 'dns', 'cdn', 'gateway', 'load_balancer', 'service', 'worker', 'queue', 'cache', 'database', 'replica', 'backup_database', 'storage', 'monitoring', 'external_api'" 
            },
            region: { type: "STRING" },
            status: { type: "STRING", description: "Must be 'healthy'" },
            capacity: { type: "INTEGER" },
            currentLoad: { type: "INTEGER" },
            latencyMs: { type: "INTEGER" },
            replicas: { type: "INTEGER" },
            criticality: { type: "STRING", description: "Must be one of: 'low', 'medium', 'high', 'critical'" },
            metadata: {
              type: "OBJECT",
              properties: {
                x: { type: "NUMBER", description: "X position on a 2500px wide layout (0 to 2400)" },
                y: { type: "NUMBER", description: "Y position on a 600px high layout (50 to 550)" }
              },
              required: ["x", "y"]
            }
          },
          required: ["id", "name", "type", "region", "status", "capacity", "currentLoad", "latencyMs", "replicas", "criticality", "metadata"]
        }
      },
      edges: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            source: { type: "STRING" },
            target: { type: "STRING" },
            trafficPercentage: { type: "INTEGER" },
            latencyMs: { type: "INTEGER" },
            protocol: { type: "STRING" },
            active: { type: "BOOLEAN" },
            backup: { type: "BOOLEAN" }
          },
          required: ["id", "source", "target", "trafficPercentage", "latencyMs", "protocol", "active", "backup"]
        }
      },
      risks: { type: "ARRAY", items: { type: "STRING" } },
      recommendations: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["name", "description", "assumptions", "estimatedTraffic", "nodes", "edges", "risks", "recommendations"]
  };

  const geminiInstruction = `Generate a realistic, robust, and detailed cloud systems architecture topology matching this description: "${prompt}".
The architecture must satisfy:
1. Between 6 to 14 nodes representing client, networking, gateway, services, databases, caches, queues, and regional boundaries.
2. Provide precise, cleanly laid-out coordinates in metadata.x and metadata.y so they map as an elegant left-to-right flow.
3. Establish appropriate source-to-target connections via edges.
4. Connect backup/standby servers with active=false, backup=true, and trafficPercentage=0.
5. Provide relevant real-world assumptions, scalability risks, and mitigation recommendations.
6. Set realistic "capacity" and "currentLoad" values (e.g. currentLoad around 65-80% of capacity).`;

  const payload = {
    contents: [
      {
        parts: [
          { text: geminiInstruction }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini Client Error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error("Invalid response structure from Gemini API");
  }

  return JSON.parse(textResponse);
}

export async function generateViaOpenAIClient(prompt: string, apiKey: string, modelName: string): Promise<Architecture> {
  const actualModel = modelName === 'gpt-5.6' ? 'gpt-4o-mini' : modelName;
  const url = `https://api.openai.com/v1/chat/completions`;
  
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
- Capacity & Load Guidelines: Set the initial "currentLoad" of primary service and database components to be around 65-80% of their "capacity".
- Return ONLY the pure JSON object.`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: actualModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a cloud systems architecture for: "${prompt}"` }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Client Error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const textResponse = data?.choices?.[0]?.message?.content;
  if (!textResponse) {
    throw new Error("Invalid response structure from OpenAI API");
  }

  return JSON.parse(textResponse);
}
