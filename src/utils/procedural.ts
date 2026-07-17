import type { Architecture, ArchitectureNode, ArchitectureEdge } from '../types/architecture';

export function generateProceduralArchitecture(prompt: string): Architecture {
  const p = prompt.toLowerCase().trim();
  
  // Clean prompt helper to extract keywords
  const words = p.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").filter(w => w.length > 3);
  const capitalized = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  // Pick some custom names from the prompt
  let subject = "Application";
  if (words.length > 0) {
    // skip common stopwords if possible, or just grab the first interesting word
    const stopwords = ["design", "system", "architecture", "build", "make", "create", "with", "from", "service", "platform", "server"];
    const interestingWords = words.filter(w => !stopwords.includes(w));
    if (interestingWords.length > 0) {
      subject = capitalized(interestingWords[0]);
      if (interestingWords[1]) {
        subject += " " + capitalized(interestingWords[1]);
      }
    }
  }

  // Determine App Category
  let category = "generic";
  if (p.includes("pay") || p.includes("bill") || p.includes("stripe") || p.includes("bank") || p.includes("money") || p.includes("finance")) {
    category = "payment";
  } else if (p.includes("game") || p.includes("match") || p.includes("multiplayer") || p.includes("play") || p.includes("lobby")) {
    category = "game";
  } else if (p.includes("chat") || p.includes("message") || p.includes("slack") || p.includes("whatsapp") || p.includes("social")) {
    category = "chat";
  } else if (p.includes("ai") || p.includes("llm") || p.includes("rag") || p.includes("gemini") || p.includes("gpt") || p.includes("vector") || p.includes("model")) {
    category = "ai";
  } else if (p.includes("shop") || p.includes("store") || p.includes("commerce") || p.includes("cart") || p.includes("market")) {
    category = "ecommerce";
  } else if (p.includes("iot") || p.includes("sensor") || p.includes("telemetry") || p.includes("device")) {
    category = "iot";
  } else if (p.includes("school") || p.includes("student") || p.includes("education") || p.includes("class")) {
    category = "education";
  } else if (p.includes("hospital") || p.includes("health") || p.includes("doctor") || p.includes("medical")) {
    category = "health";
  } else if (p.includes("video") || p.includes("stream") || p.includes("movie") || p.includes("netflix") || p.includes("youtube")) {
    category = "media";
  }

  // Based on the category, customize nodes and details
  let appName = `${subject} Scalable System`;
  let serviceA = `${subject} Frontend API Gateway`;
  let serviceB = `${subject} Processing Worker`;
  let dbName = "High-Availability Relational DB";
  let cacheName = "Distributed Redis Cache";
  let externalName = "Third-Party External Integrations";
  let queueName = "Task Processing Queue (RabbitMQ)";
  let storageName = "S3 Object Store";
  let activeAssumption = "Web services scale horizontally automatically based on active connection load.";
  let passiveAssumption = "Multi-AZ active replication handles database failover with minimal lag.";
  let recommendations = [
    "Introduce rate-limiting at the Gateway tier to protect backend microservices.",
    "Implement asynchronous processing patterns for compute-heavy actions."
  ];
  let risks = [
    "Database thread pool starvation under sudden global read spikes.",
    "Higher network roundtrip times for cross-region backup failovers."
  ];

  if (category === "payment") {
    appName = `Secure Payment & Billing Ledger [${subject}]`;
    serviceA = "PCI-Compliant Billing Gateway";
    serviceB = "Double-Entry Ledger Auditor";
    dbName = "ACID-Secure Transaction Ledger";
    cacheName = "Idempotency Keys Cache (Redis)";
    externalName = "Stripe Gateway API";
    queueName = "Settlement Processing Queue";
    activeAssumption = "Every single financial transaction runs through the ledger with strong ACID guarantees.";
    passiveAssumption = "The Idempotency Key cache prevents duplicate processing during network disconnects.";
    recommendations = [
      "Keep payment tokens heavily sandboxed outside direct app databases.",
      "Verify asynchronous webhook callbacks utilizing double-signature validation."
    ];
    risks = [
      "Stripe or provider sandbox connection timeouts causing API delays.",
      "Dual-writing sync lags causing momentary discrepancies in ledger states."
    ];
  } else if (category === "game") {
    appName = `Global Low-Latency Game Backend [${subject}]`;
    serviceA = "Matchmaking & Lobby Orchestrator";
    serviceB = "Active Dedicated Server Manager";
    dbName = "Global User Profile DB";
    cacheName = "Realtime Match States Pool (Redis)";
    externalName = "Anti-Cheat Enforcement API";
    queueName = "Match Events Streaming Bus";
    activeAssumption = "Websocket persistent connections scale on high-performance ingress clusters.";
    passiveAssumption = "Game server pools automatically resize container counts based on queue length.";
    recommendations = [
      "Buffer low-priority client metrics before sending them to the central db store.",
      "Route players to regional game servers based on live ping telemetry measurements."
    ];
    risks = [
      "Socket disconnection storms during network ISP routing updates.",
      "Lobby synchronization conflicts leading to host mismatches."
    ];
  } else if (category === "chat") {
    appName = `High-Throughput Realtime Messenger [${subject}]`;
    serviceA = "Websocket Ingress Gateway";
    serviceB = "Push Notification & Sync Dispatcher";
    dbName = "NoSQL Document Messages Store";
    cacheName = "Active User Presence Cache (Redis)";
    externalName = "Apple APNS & Google FCM Endpoint";
    queueName = "Outbox Delivery Message Queue";
    activeAssumption = "User session details and presence flags are held purely in low-latency Redis cache.";
    passiveAssumption = "Offline push messages are routed as background worker jobs immediately.";
    recommendations = [
      "Adopt a pub/sub pattern across ingress servers to broadcast group chat logs.",
      "Compress chat media attachments locally at the client prior to uploading."
    ];
    risks = [
      "Broadcasting to huge group channels causing transient memory spikes on gateways.",
      "Outbox delivery delays during high network congestion."
    ];
  } else if (category === "ai") {
    appName = `Scalable AI RAG & Semantic Context Pipeline [${subject}]`;
    serviceA = "Context Aggregator & Guardrails API";
    serviceB = "Asynchronous Document Vectorizer";
    dbName = "Pinecone High-Speed Vector DB";
    cacheName = "Semantic Query LLM Cache (Redis)";
    externalName = "Gemini AI API Endpoint";
    queueName = "Ingestion & Chunking Pipeline Queue";
    activeAssumption = "RAG queries pull semantic similarity vectors from the Vector DB before LLM synthesis.";
    passiveAssumption = "The background queue extracts text, chunks it, and generates embeddings asynchronously.";
    recommendations = [
      "Cache exact query embedding hashes to bypass costly generative API model calls.",
      "Apply strict sliding-window chunking rules during pipeline preprocessing."
    ];
    risks = [
      "Generative AI model rate-limits under heavy client requests.",
      "Vector DB indexing latency delaying semantic recall of newly updated files."
    ];
  } else if (category === "ecommerce") {
    appName = `High-Availability Global Storefront [${subject}]`;
    serviceA = "E-Commerce Frontend API Gateway";
    serviceB = "Inventory & Order Fulfillment Service";
    dbName = "Relational Catalog & Orders Database";
    cacheName = "Product Details & Catalog Cache (Redis)";
    externalName = "FedEx/DHL Shipping API";
    queueName = "Fulfillment Dispatch & Invoicing Queue";
    activeAssumption = "Heavy catalog reading is handled by Redis caching, decreasing DB strain by 80%.";
    passiveAssumption = "Checkout forms write directly to the queue to guarantee zero lost orders.";
    recommendations = [
      "Invalidate Redis cache keys selectively during warehouse inventory updates.",
      "Enable persistent shopping carts across sessions via local database synchronization."
    ];
    risks = [
      "Database locking issues under extreme flash-sale events.",
      "Fulfillment delays if background message queue reaches bottleneck limits."
    ];
  } else if (category === "iot") {
    appName = `High-Throughput IoT Stream Ingestion [${subject}]`;
    serviceA = "Telemetry Receiver (MQTT/HTTP)";
    serviceB = "Batch Processor & Aggregation Engine";
    dbName = "InfluxDB Time-Series DB";
    cacheName = "Device Authentication Store";
    queueName = "High-Volume Telemetry Buffer Stream";
    externalName = "Over-the-Air Device Firmware Registry";
    activeAssumption = "IoT devices post payload to local edge gateways before sending to public endpoints.";
    passiveAssumption = "Telemetry stream workers bucket metrics into 1-minute time windows.";
    recommendations = [
      "Validate device client TLS certificates directly at the gateway layer.",
      "Downsample historic time-series database logs older than 30 days."
    ];
    risks = [
      "Massive network bandwidth charges during synchronous device heartbeats.",
      "Database write bottlenecks if stream pipelines fall behind ingestion rate."
    ];
  } else if (category === "education") {
    appName = `Scalable LMS & Online School Dashboard [${subject}]`;
    serviceA = "LMS Portal & Student Hub Service";
    serviceB = "Video Transcoding & Progress Processor";
    dbName = "Relational Student Course Database";
    cacheName = "Active Student Session Registry";
    queueName = "Video Ingestion Queue";
    externalName = "Zoom Classes API Integration";
    activeAssumption = "Students view cached lessons from CDN directly to reduce application load.";
    passiveAssumption = "Video transcoding is run as a background task via the task queue.";
    recommendations = [
      "Provide progressive offline support so lectures can be downloaded locally.",
      "Segment student databases by cohort or region to maximize query performance."
    ];
    risks = [
      "High storage costs from massive video uploads.",
      "Video stream buffer lag during simultaneous lecture views."
    ];
  } else if (category === "health") {
    appName = `HIPAA-Compliant Patient Portal [${subject}]`;
    serviceA = "EHR Secure API Gateway";
    serviceB = "Audit Logger & Report Processor";
    dbName = "Encrypted Health Records DB";
    cacheName = "Short-Term Security Token Cache";
    queueName = "Report Compilation Queue";
    externalName = "Insurance Claims Verification Portal";
    activeAssumption = "Every single API request is fully decrypted in-memory and logged to the audit log.";
    passiveAssumption = "Report tasks are processed in a separate sandboxed isolation environment.";
    recommendations = [
      "Encrypt all static database tables using AES-256 standard encryption.",
      "Enforce mandatory multi-factor authentication for physician portal sessions."
    ];
    risks = [
      "Slower API latency due to inline audit-logging and decryption steps.",
      "Third-party insurance carrier API connection downtime."
    ];
  } else if (category === "media") {
    appName = `Dynamic Video Streaming Platform [${subject}]`;
    serviceA = "Media Catalog and Recommendation Engine";
    serviceB = "Adaptive HLS Packaging Worker";
    dbName = "Media Catalog Relational DB";
    cacheName = "Hot-Stream Metadata Cache";
    queueName = "Transcoding Jobs Pipeline";
    externalName = "Content Recommendation Engine API";
    activeAssumption = "HLS video chunks are delivered globally by CDN, bypassing central application servers.";
    passiveAssumption = "Media package workers slice video uploads into HLS stream files asynchronously.";
    recommendations = [
      "Utilize multi-bitrate HLS streaming to auto-adjust video quality on the fly.",
      "Maintain a pre-warmed Redis cache of trending and popular catalogue titles."
    ];
    risks = [
      "Huge egress data billing charges if WAF/CDN rules are configured poorly.",
      "Spikes in CPU load during heavy parallel video uploads and transcodes."
    ];
  }

  // Define unique node IDs based on the category so that the node sets are distinct
  const nodes: ArchitectureNode[] = [
    {
      id: "users",
      name: "Global Browsers & Clients",
      type: "client",
      region: "Global",
      status: "healthy",
      capacity: 80000,
      currentLoad: 55000,
      latencyMs: 12,
      replicas: 1,
      criticality: "low",
      metadata: { x: 80, y: 300 }
    },
    {
      id: "dns",
      name: "Anycast DNS Routing",
      type: "dns",
      region: "Global",
      status: "healthy",
      capacity: 120000,
      currentLoad: 55000,
      latencyMs: 5,
      replicas: 3,
      criticality: "high",
      metadata: { x: 380, y: 180 }
    },
    {
      id: "cdn",
      name: "Global CDN Shield",
      type: "cdn",
      region: "Global",
      status: "healthy",
      capacity: 100000,
      currentLoad: 55000,
      latencyMs: 10,
      replicas: 8,
      criticality: "high",
      metadata: { x: 380, y: 420 }
    },
    {
      id: "gateway",
      name: "Load Balancer & Gateway",
      type: "load_balancer",
      region: "us-east-1",
      status: "healthy",
      capacity: 70000,
      currentLoad: 55000,
      latencyMs: 11,
      replicas: 4,
      criticality: "critical",
      metadata: { x: 680, y: 300 }
    },
    {
      id: "service_a",
      name: serviceA,
      type: "service",
      region: "us-east-1",
      status: "healthy",
      capacity: 55000,
      currentLoad: 38000,
      latencyMs: 18,
      replicas: 5,
      criticality: "critical",
      metadata: { x: 980, y: 180 }
    },
    {
      id: "service_b",
      name: serviceB,
      type: "worker",
      region: "us-east-1",
      status: "healthy",
      capacity: 40000,
      currentLoad: 28000,
      latencyMs: 45,
      replicas: 3,
      criticality: "high",
      metadata: { x: 980, y: 420 }
    },
    {
      id: "cache",
      name: cacheName,
      type: "cache",
      region: "us-east-1",
      status: "healthy",
      capacity: 90000,
      currentLoad: 60000,
      latencyMs: 1,
      replicas: 2,
      criticality: "high",
      metadata: { x: 1280, y: 180 }
    },
    {
      id: "queue",
      name: queueName,
      type: "queue",
      region: "us-east-1",
      status: "healthy",
      capacity: 80000,
      currentLoad: 45000,
      latencyMs: 3,
      replicas: 3,
      criticality: "high",
      metadata: { x: 1280, y: 420 }
    },
    {
      id: "db",
      name: dbName,
      type: "database",
      region: "us-east-1",
      status: "healthy",
      capacity: 50000,
      currentLoad: 36000,
      latencyMs: 8,
      replicas: 1,
      criticality: "critical",
      metadata: { x: 1580, y: 300 }
    },
    {
      id: "replica",
      name: `${dbName} (Read Replica)`,
      type: "replica",
      region: "eu-west-1",
      status: "healthy",
      capacity: 50000,
      currentLoad: 12000,
      latencyMs: 25,
      replicas: 1,
      criticality: "medium",
      metadata: { x: 1880, y: 200 }
    },
    {
      id: "storage",
      name: storageName,
      type: "storage",
      region: "Global",
      status: "healthy",
      capacity: 500000,
      currentLoad: 150000,
      latencyMs: 35,
      replicas: 1,
      criticality: "medium",
      metadata: { x: 1880, y: 400 }
    },
    {
      id: "external",
      name: externalName,
      type: "external_api",
      region: "External Network",
      status: "healthy",
      capacity: 200000,
      currentLoad: 15000,
      latencyMs: 85,
      replicas: 1,
      criticality: "medium",
      metadata: { x: 2180, y: 300 }
    }
  ];

  // Draw clean, logical, unique routes between these specific nodes
  const edges: ArchitectureEdge[] = [
    { id: "e1", source: "users", target: "dns", trafficPercentage: 100, latencyMs: 5, protocol: "HTTPS", active: true, backup: false },
    { id: "e2", source: "users", target: "cdn", trafficPercentage: 100, latencyMs: 10, protocol: "HTTPS", active: true, backup: false },
    { id: "e3", source: "dns", target: "gateway", trafficPercentage: 100, latencyMs: 11, protocol: "HTTPS", active: true, backup: false },
    { id: "e4", source: "cdn", target: "gateway", trafficPercentage: 100, latencyMs: 11, protocol: "HTTPS", active: true, backup: false },
    { id: "e5", source: "gateway", target: "service_a", trafficPercentage: 70, latencyMs: 18, protocol: "HTTPS", active: true, backup: false },
    { id: "e6", source: "gateway", target: "service_b", trafficPercentage: 30, latencyMs: 45, protocol: "HTTPS", active: true, backup: false },
    { id: "e7", source: "service_a", target: "cache", trafficPercentage: 80, latencyMs: 1, protocol: "gRPC", active: true, backup: false },
    { id: "e8", source: "service_a", target: "queue", trafficPercentage: 20, latencyMs: 3, protocol: "gRPC", active: true, backup: false },
    { id: "e9", source: "service_b", target: "queue", trafficPercentage: 100, latencyMs: 3, protocol: "AMQP", active: true, backup: false },
    { id: "e10", source: "service_a", target: "db", trafficPercentage: 100, latencyMs: 8, protocol: "TCP", active: true, backup: false },
    { id: "e11", source: "service_b", target: "db", trafficPercentage: 100, latencyMs: 8, protocol: "TCP", active: true, backup: false },
    { id: "e12", source: "db", target: "replica", trafficPercentage: 100, latencyMs: 25, protocol: "Replication", active: true, backup: false },
    { id: "e13", source: "service_b", target: "storage", trafficPercentage: 100, latencyMs: 35, protocol: "S3", active: true, backup: false },
    { id: "e14", source: "service_a", target: "external", trafficPercentage: 100, latencyMs: 85, protocol: "HTTPS", active: true, backup: false }
  ];

  // Adjust coordinates slightly depending on the text length/random seed so they look customized and dynamic
  const stringHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const seed = stringHash(prompt);
  nodes.forEach((node, idx) => {
    // Add stable, nice procedural variations to coordinates so different questions look physically different!
    const varX = (seed + idx * 7) % 31 - 15; // -15 to +15px variation
    const varY = (seed + idx * 13) % 41 - 20; // -20 to +20px variation
    if (node.metadata) {
      node.metadata.x += varX;
      node.metadata.y += varY;
    }
    // Also randomise initial capacities & loads slightly so every generated map feels unique
    const baseCap = node.capacity;
    const randomPercent = 65 + ((seed + idx) % 16); // 65% to 80%
    node.capacity = baseCap + ((seed + idx) % 5000) - 2500;
    node.currentLoad = Math.round((node.capacity * randomPercent) / 100);
    node.latencyMs = Math.max(1, node.latencyMs + ((seed + idx) % 5) - 2);
  });

  return {
    name: appName,
    description: `A customized visual systems topology designed procedurally for the request: "${prompt}". Running securely in static offline browser sandbox mode.`,
    assumptions: [activeAssumption, passiveAssumption],
    estimatedTraffic: {
      requestsPerSecond: 45000 + (seed % 40000),
      peakMultiplier: 1.5 + (seed % 15) / 10
    },
    nodes,
    edges,
    risks,
    recommendations
  };
}
