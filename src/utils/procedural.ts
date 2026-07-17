import type { Architecture, ArchitectureNode, ArchitectureEdge } from '../types/architecture';

export function generateProceduralArchitecture(prompt: string): Architecture {
  const p = prompt.toLowerCase();
  
  let appName = "Custom Scalable Architecture";
  let serviceName = "Web Application Service";
  let secondaryServiceName = "Background Processing Worker";
  let dbName = "Relational PostgreSQL DB";
  let cacheName = "Distributed Redis Cache";
  let externalName = "Third-Party External API";
  let externalType: any = "external_api";
  let workerType: any = "worker";
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
  } else if (p.includes("game") || p.includes("player") || p.includes("match") || p.includes("lobby") || p.includes("multiplayer") || p.includes("gpu") || p.includes("inference")) {
    appName = p.includes("gpu") ? "AI Inference Server Fleet with GPU Failover" : "Global Low-Latency Multiplayer Game System";
    serviceName = p.includes("gpu") ? "Inference Gateway & API Gateway" : "Matchmaking & Lobby Coordinator";
    secondaryServiceName = p.includes("gpu") ? "GPU Model Service (Active Pool)" : "Active Game Server Fleet Manager";
    dbName = p.includes("gpu") ? "Model Cache Registry & DB" : "Player Profile DB";
    cacheName = p.includes("gpu") ? "GPU Host Health Cache (Redis)" : "Match Cache & Player State Pool";
    externalName = p.includes("gpu") ? "Secondary GPU Fallback Instance" : "Global Anti-Cheat System";
    activeAssumption = p.includes("gpu") ? "Active GPU pools run parallel inference requests with local batch queueing." : "Websocket connections are handled via regional load-balancers to minimize latency.";
    passiveAssumption = p.includes("gpu") ? "Continuous memory state snapshot enables instant, zero-downtime hot-swap to secondary GPUs." : "Fleet manager dynamically spins up dedicated server containers based on lobby demand.";
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
    serviceName = "Semantic Context Orchestrator";
    secondaryServiceName = "Asynchronous Document Vectorizer";
    dbName = "Pinecone Vector DB";
    cacheName = "LLM Generation Semantic Cache";
    externalName = "Gemini AI API Endpoint";
    activeAssumption = "RAG queries pull semantic similarity vectors from the Vector DB before LLM synthesis.";
    passiveAssumption = "Ingestion pipeline extracts, chunks, and vectorizes documents via background workers.";
  } else if (p.includes("shop") || p.includes("cart") || p.includes("commerce") || p.includes("store") || p.includes("order")) {
    appName = "High-Availability Global E-Commerce Architecture";
    serviceName = "Storefront Catalog Gateway";
    secondaryServiceName = "Asynchronous Order Fulfillment Worker";
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
  const nodes: ArchitectureNode[] = [
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

  const edges: ArchitectureEdge[] = [
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
    description: `A dynamic visual system architecture designed for: "${prompt}". Generated via fallback modeling engine to ensure continuous availability.`,
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
