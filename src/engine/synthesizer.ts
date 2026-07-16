import { architectureSchema } from '../schemas/architecture'
import type { Architecture, ArchitectureNode, ArchitectureEdge } from '../types/architecture'

// Helper to sanitize node IDs and names
function capitalize(word: string) {
  if (!word) return ''
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

// Extraction helper to find custom words from user prompt
function extractCustomKeywords(prompt: string): { serviceA: string; serviceB: string; dbType: string } {
  const words = prompt.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/)
  const candidateKeywords = words.filter(
    (w) => w.length > 3 && !['design', 'platform', 'system', 'with', 'using', 'high', 'multi', 'region', 'latency', 'platform', 'app', 'backend', 'frontend', 'server', 'architecture', 'service', 'client'].includes(w)
  )

  let serviceA = 'Core Microservice'
  let serviceB = 'Process Worker'
  let dbType = 'SQL'

  if (candidateKeywords.length > 0) {
    serviceA = capitalize(candidateKeywords[0]) + ' Engine'
  }
  if (candidateKeywords.length > 1) {
    serviceB = capitalize(candidateKeywords[1]) + ' Queue Worker'
  } else if (candidateKeywords.length > 0) {
    serviceB = capitalize(candidateKeywords[0]) + ' Processing Hub'
  }

  if (prompt.toLowerCase().includes('nosql') || prompt.toLowerCase().includes('mongo') || prompt.toLowerCase().includes('dynamo')) {
    dbType = 'NoSQL Documents'
  } else if (prompt.toLowerCase().includes('postgres') || prompt.toLowerCase().includes('sql') || prompt.toLowerCase().includes('relational')) {
    dbType = 'Postgres'
  } else if (prompt.toLowerCase().includes('spanner')) {
    dbType = 'Cloud Spanner'
  } else if (prompt.toLowerCase().includes('graph') || prompt.toLowerCase().includes('neo4j')) {
    dbType = 'Graph Database'
  } else if (prompt.toLowerCase().includes('vector') || prompt.toLowerCase().includes('pinecone') || prompt.toLowerCase().includes('milvus')) {
    dbType = 'VectorDB'
  }

  return { serviceA, serviceB, dbType }
}

export function synthesizeArchitecture(prompt: string): Architecture {
  const norm = prompt.toLowerCase()
  let result: Architecture

  // Helper factory for structured nodes
  const makeNode = (
    id: string,
    name: string,
    type: ArchitectureNode['type'],
    region: string,
    capacity: number,
    currentLoad: number,
    latencyMs: number,
    replicas = 1,
    x = 0,
    y = 0,
    description = ''
  ): ArchitectureNode => ({
    id,
    name,
    type,
    region,
    status: 'healthy',
    capacity,
    currentLoad,
    latencyMs,
    replicas,
    criticality: ['database', 'gateway', 'dns'].includes(type) ? 'critical' : type.includes('service') ? 'high' : 'medium',
    metadata: { x, y, description }
  })

  // Helper factory for structured edges
  const makeEdge = (source: string, target: string, backup = false, protocol = 'HTTPS'): ArchitectureEdge => ({
    id: `${source}-${target}`,
    source,
    target,
    trafficPercentage: backup ? 0 : 100,
    latencyMs: backup ? 55 : 8,
    protocol,
    active: !backup,
    backup
  })

  if (norm.includes('ai') || norm.includes('llm') || norm.includes('gpu') || norm.includes('inference') || norm.includes('model') || norm.includes('tensor') || norm.includes('gpt')) {
    // 1. AI/GPU Transformer pipeline
    result = {
      name: 'GPT-5.6 AI Neural Inference Pipeline',
      description: 'Distributed model partitioning (tensor parallelism) optimized for token streaming, neural model registries, and semantic prompt caches.',
      assumptions: [
        'Model weights (GPT-5.6) are pre-allocated across multiple dynamic Tensor Parallel GPU slots.',
        'Semantic prompt caching blocks redundant LLM calls for repeating client greetings.',
        'High-density server instances handle concurrent speculative decoding workflows.'
      ],
      estimatedTraffic: { requestsPerSecond: 12500, peakMultiplier: 2.8 },
      nodes: [
        makeNode('users', 'Global Users', 'client', 'global', 20000, 12500, 15, 1, 80, 230, 'Active consumers transmitting requests and receiving low-latency chat replies.'),
        makeNode('dns', 'Anycast Geo DNS', 'dns', 'global', 50000, 12500, 4, 3, 310, 230, 'Resolves domain names to geographically optimal edge points.'),
        makeNode('cdn', 'Semantic Cache Edge', 'cdn', 'global', 40000, 12000, 6, 8, 540, 230, 'Caches common LLM prompts and static assets near the client layer.'),
        makeNode('gateway', 'Vanguard API Gateway', 'gateway', 'us-east-1', 30000, 12500, 12, 4, 770, 230, 'Performs rate limiting, OAuth client checks, and input sanitization.'),
        makeNode('gpu-workers', 'Triton GPU Clusters (TP-2)', 'service', 'us-east-1', 18000, 11000, 185, 24, 1030, 120, 'NVIDIA H100 GPU clusters executing distributed model forwarding steps.'),
        makeNode('cpu-workers', 'CPU Fallback Server', 'service', 'us-east-1', 10000, 1500, 950, 8, 1030, 360, 'Standby CPU servers used if GPU slots overflow or undergo rolling restarts.'),
        makeNode('redis-cache', 'Semantic Prompt Store', 'cache', 'us-east-1', 35000, 8500, 1, 5, 1290, 120, 'In-memory embedding store for dynamic query similarity analysis.'),
        makeNode('queue', 'Inference Buffer Queue', 'queue', 'us-east-1', 50000, 2500, 5, 4, 1290, 360, 'Message queue smoothing peak transaction spikes during sudden viral user growth.'),
        makeNode('vector-db', 'Vector Embedding Store', 'database', 'us-east-1', 15000, 9500, 18, 4, 1550, 120, 'Pinecone database holding multi-million token indexes for RAG context extraction.'),
        makeNode('replica', 'Vector Read Replica', 'replica', 'us-east-1', 20000, 3000, 8, 3, 1810, 120, 'Local read-only mirrors of context indices preventing read locks.'),
        makeNode('backup-db', 'Warm Model Registry', 'backup_database', 'us-west-2', 12000, 0, 45, 1, 1810, 360, 'S3-backed secondary storage of baseline neural model weights in warm standby.', false),
        makeNode('monitoring', 'Observability Portal', 'monitoring', 'global', 100000, 500, 5, 2, 1030, 510, 'Aggregates GPU telemetry, token generation rate, and runtime exceptions.')
      ],
      edges: [
        makeEdge('users', 'dns'),
        makeEdge('dns', 'cdn'),
        makeEdge('cdn', 'gateway'),
        makeEdge('gateway', 'gpu-workers', false, 'gRPC'),
        makeEdge('gateway', 'cpu-workers', true, 'gRPC'),
        makeEdge('gpu-workers', 'redis-cache', false, 'TCP'),
        makeEdge('gpu-workers', 'queue', false, 'AMQP'),
        makeEdge('queue', 'vector-db', false, 'gRPC'),
        makeEdge('vector-db', 'replica', false, 'TCP'),
        makeEdge('gpu-workers', 'backup-db', true, 'HTTPS'),
        makeEdge('gateway', 'monitoring', false, 'HTTPS')
      ],
      risks: [
        'GPU capacity bottlenecking if speculative decoding hit rates drop.',
        'Significant latency spike (10x) if traffic fails over to the CPU backup cluster.'
      ],
      recommendations: [
        'Implement automatic quantization (FP16 -> INT8) during high queue congestion.',
        'Scale regional CDN edge deployments to cache embedding prompts globally.'
      ]
    }
  } else if (norm.includes('game') || norm.includes('player') || norm.includes('matchmaking') || norm.includes('mmo') || norm.includes('lobby')) {
    // 2. Gaming Platform
    result = {
      name: 'GPT-5.6 Spatial MMO Gaming Infrastructure',
      description: 'Distributed game session backend supporting real-time matchmaking, lobby allocations, state coordination, and persistent WebSocket client pipes.',
      assumptions: [
        'Game servers maintain a continuous 64Hz simulation tick-rate.',
        'Failover gateways automatically redirect lobby nodes within 1.5 seconds.'
      ],
      estimatedTraffic: { requestsPerSecond: 75000, peakMultiplier: 3.5 },
      nodes: [
        makeNode('users', 'Concurrent Players', 'client', 'global', 150000, 75000, 22, 1, 80, 230, 'Active game clients connecting via WebSockets to send actions and read world states.'),
        makeNode('dns', 'Edge Routing DNS', 'dns', 'global', 200000, 75000, 3, 4, 310, 230, 'Routes player clients to the geographically closest matchmaking and gateway portal.'),
        makeNode('cdn', 'Static Assets CDN', 'cdn', 'global', 180000, 70000, 9, 10, 540, 230, 'Serves game patches, UI bundles, audio assets, and player skins.'),
        makeNode('gateway', 'WebSocket Gateway Cluster', 'gateway', 'us-east-1', 120000, 75000, 14, 8, 770, 230, 'Establishes persistent bi-directional WebSocket pipes for real-time traffic.'),
        makeNode('matchmaker', 'Dynamic Matchmaker', 'service', 'us-east-1', 80000, 68000, 35, 6, 1030, 120, 'Groups players by tier, region, and latency to generate optimal matches.'),
        makeNode('game-nodes', 'Realtime Game Instances', 'service', 'us-east-1', 90000, 72000, 12, 35, 1030, 360, 'Executes server-authoritative physics simulations and player collision states.'),
        makeNode('redis-lobby', 'Lobby State Redis', 'cache', 'us-east-1', 110000, 60000, 1, 6, 1290, 120, 'Ultra-low latency in-memory lobby registries tracking available game slots.'),
        makeNode('queue', 'Player Session Queue', 'queue', 'us-east-1', 150000, 12000, 4, 5, 1290, 360, 'Buffers database state updates to prevent transaction deadlocks.'),
        makeNode('primary-db', 'Player Profiles DB', 'database', 'us-east-1', 80000, 42000, 14, 1, 1550, 120, 'Saves permanent profile states, unlocks, currency, and match records.'),
        makeNode('replica', 'Read Replicas', 'replica', 'us-east-1', 120000, 28000, 8, 3, 1810, 120, 'Distributes player inventory inspect reads away from primary transactional DB.'),
        makeNode('backup-db', 'Cross-Region Hot Standby', 'backup_database', 'us-west-2', 60000, 0, 38, 1, 1810, 360, 'Active-passive hot standby profile store synchronized via logical replication.', false),
        makeNode('monitoring', 'Telemetry Hub', 'monitoring', 'global', 120000, 1500, 3, 2, 1030, 510, 'Tracks frame times, server CPU tick delays, packet drop rates, and user dropouts.')
      ],
      edges: [
        makeEdge('users', 'dns'),
        makeEdge('dns', 'cdn'),
        makeEdge('cdn', 'gateway', false, 'WebSockets'),
        makeEdge('gateway', 'matchmaker', false, 'gRPC'),
        makeEdge('gateway', 'game-nodes', false, 'UDP'),
        makeEdge('matchmaker', 'redis-lobby', false, 'TCP'),
        makeEdge('game-nodes', 'queue', false, 'TCP'),
        makeEdge('queue', 'primary-db', false, 'gRPC'),
        makeEdge('primary-db', 'replica', false, 'TCP'),
        makeEdge('game-nodes', 'backup-db', true, 'gRPC'),
        makeEdge('gateway', 'monitoring', false, 'HTTPS')
      ],
      risks: [
        'High database connection counts during peak logins might exhaust pool reserves.',
        'WebSocket session loss during scaling actions results in massive thundering herds.'
      ],
      recommendations: [
        'Utilize an external proxy layer to pool profile database queries.',
        'Implement randomized exponential jitter on client connection retries.'
      ]
    }
  } else if (norm.includes('chat') || norm.includes('message') || norm.includes('realtime') || norm.includes('websocket') || norm.includes('socket')) {
    // 3. Chat / Messaging
    result = {
      name: 'GPT-5.6 High-Scale Message Core',
      description: 'Distributed real-time message routing platform with sub-millisecond Pub/Sub propagation, event-driven socket relays, and a partitioned NoSQL message store.',
      assumptions: [
        'Global chat rooms utilize dynamic in-memory Pub/Sub fan-out clusters.',
        'Message payload sizes are constrained to a maximum of 64KB.'
      ],
      estimatedTraffic: { requestsPerSecond: 150000, peakMultiplier: 2.5 },
      nodes: [
        makeNode('users', 'Connected Clients', 'client', 'global', 200000, 150000, 25, 1, 80, 230, 'Active chat clients exchanging dynamic messages, group invites, and file tokens.'),
        makeNode('dns', 'Global DNS routing', 'dns', 'global', 250000, 150000, 2, 4, 310, 230, 'Dispatches users to the closest point of presence.'),
        makeNode('cdn', 'Edge Connection Nodes', 'cdn', 'global', 220000, 140000, 8, 12, 540, 230, 'Caches user static icons, stickers, and static conversation histories.'),
        makeNode('gateway', 'Socket Ingress Gateways', 'gateway', 'us-east-1', 180000, 150000, 11, 10, 770, 230, 'Terminates secure TLS connections and maintains active WS pipelines.'),
        makeNode('chat-service', 'Message Router Core', 'service', 'us-east-1', 160000, 145000, 15, 12, 1030, 120, 'Directs individual chats, verifies member lists, and manages user status metrics.'),
        makeNode('notify-service', 'Push Dispatcher', 'service', 'us-east-1', 100000, 20000, 48, 6, 1030, 360, 'Relays asynchronous Apple APNs/Google FCM notifications for idle background clients.'),
        makeNode('pubsub', 'Redis Pub/Sub Clusters', 'cache', 'us-east-1', 200000, 148000, 1, 8, 1290, 120, 'Blazing fast real-time publish-subscribe bus for instantly fanning out room messages.'),
        makeNode('queue', 'Offline Message Queue', 'queue', 'us-east-1', 250000, 15000, 3, 4, 1290, 360, 'Temporarily buffers messages while writing them down into durable disks.'),
        makeNode('primary-db', 'NoSQL Message Ledger', 'database', 'us-east-1', 150000, 85000, 9, 1, 1550, 120, 'Durable database holding index logs of historical chat messages.'),
        makeNode('replica', 'Durable Read Replica', 'replica', 'us-east-1', 180000, 35000, 6, 4, 1810, 120, 'Slices query costs by offloading historical chat searches and attachment looks.'),
        makeNode('backup-db', 'Passive DB Cluster', 'backup_database', 'us-west-2', 100000, 0, 32, 1, 1810, 360, 'Secures secondary historical tables via asynchronous remote data synchronization.', false),
        makeNode('monitoring', 'System Telemetry', 'monitoring', 'global', 150000, 800, 4, 2, 1030, 510, 'Monitors socket counts, network connection speeds, and payload drop percentages.')
      ],
      edges: [
        makeEdge('users', 'dns'),
        makeEdge('dns', 'cdn'),
        makeEdge('cdn', 'gateway', false, 'WebSockets'),
        makeEdge('gateway', 'chat-service', false, 'gRPC'),
        makeEdge('gateway', 'notify-service', false, 'HTTPS'),
        makeEdge('chat-service', 'pubsub', false, 'TCP'),
        makeEdge('chat-service', 'queue', false, 'AMQP'),
        makeEdge('queue', 'primary-db', false, 'TCP'),
        makeEdge('primary-db', 'replica', false, 'TCP'),
        makeEdge('chat-service', 'backup-db', true, 'TCP'),
        makeEdge('gateway', 'monitoring', false, 'HTTPS')
      ],
      risks: [
        'Pub/Sub channel limits may be breached when chat rooms contain over 100,000 active users.',
        'Connection spikes (thundering herd) when restoring socket gateways.'
      ],
      recommendations: [
        'Shard channel indexes horizontally by room and channel ID tags.',
        'Utilize background FCM notification payloads instead of maintaining active WebSockets on mobile clients.'
      ]
    }
  } else if (norm.includes('iot') || norm.includes('telemetry') || norm.includes('sensor') || norm.includes('kafka') || norm.includes('stream')) {
    // 4. IoT/Streaming Pipeline
    result = {
      name: 'GPT-5.6 High-Ingestion IoT Stream',
      description: 'Ultra-reliable stream processing infrastructure built for heavy continuous device telemetry, real-time alerting, and multi-tier archive writes.',
      assumptions: [
        'Edge devices buffer telemetry locally during cellular dropout windows.',
        'Continuous analysis uses dynamic memory micro-sliding calculation frames.'
      ],
      estimatedTraffic: { requestsPerSecond: 250000, peakMultiplier: 1.8 },
      nodes: [
        makeNode('users', 'IoT Edge Devices', 'client', 'global', 500000, 250000, 42, 1, 80, 230, 'Millions of distributed telemetry sensors emitting environmental metric packets.'),
        makeNode('dns', 'Anycast Edge DNS', 'dns', 'global', 600000, 250000, 3, 5, 310, 230, 'Balances edge packets to geographically optimal ingestion regions.'),
        makeNode('cdn', 'Edge Gateways', 'cdn', 'global', 500000, 220000, 7, 16, 540, 230, 'Decodes protocol headers, filters duplicates, and compresses device payloads.'),
        makeNode('gateway', 'Ingestion Endpoints', 'gateway', 'us-east-1', 400000, 250000, 18, 12, 770, 230, 'Receives clean JSON metric bundles over highly available MQTT/HTTPS relays.'),
        makeNode('kafka', 'Kafka Broker Bus', 'queue', 'us-east-1', 500000, 250000, 2, 12, 1030, 120, 'Distributed event streaming ledger partitioning telemetry streams across dynamic slots.'),
        makeNode('processor', 'Flink Analytics Engine', 'service', 'us-east-1', 300000, 220000, 14, 18, 1030, 360, 'Runs continuous pipeline calculations for threshold breaches and anomalies.'),
        makeNode('cache', 'Device Registry Redis', 'cache', 'us-east-1', 400000, 180000, 1, 8, 1290, 120, 'Maintains live status flags and serial mappings for approved hardware modules.'),
        makeNode('db', 'Influx Time-Series DB', 'database', 'us-east-1', 300000, 190000, 8, 1, 1550, 120, 'Primary columnar time-series database optimized for extremely heavy sequential writes.'),
        makeNode('replica', 'Durable Analytics Replica', 'replica', 'us-east-1', 350000, 45000, 5, 4, 1810, 120, 'Provides fast access to historic chart reads and dashboard analytical reports.'),
        makeNode('backup-db', 'Cold Archive Lake', 'backup_database', 'us-west-2', 200000, 10000, 55, 1, 1810, 360, 'Inexpensive persistent S3 lake archiving compressed parquet blocks for long-term historical records.', false),
        makeNode('monitoring', 'Alert Manager', 'monitoring', 'global', 200000, 1200, 3, 2, 1030, 510, 'Monitors input queue lengths, failed sensor keys, and system storage capacity.')
      ],
      edges: [
        makeEdge('users', 'dns'),
        makeEdge('dns', 'cdn'),
        makeEdge('cdn', 'gateway', false, 'MQTT'),
        makeEdge('gateway', 'kafka', false, 'TCP'),
        makeEdge('kafka', 'processor', false, 'gRPC'),
        makeEdge('processor', 'cache', false, 'TCP'),
        makeEdge('processor', 'db', false, 'TCP'),
        makeEdge('db', 'replica', false, 'TCP'),
        makeEdge('processor', 'backup-db', true, 'HTTPS'),
        makeEdge('gateway', 'monitoring', false, 'HTTPS')
      ],
      risks: [
        'Columnar write pools may lock during massive structural schema changes.',
        'Kafka consumer lag spikes if the stream analysis worker experiences slow restarts.'
      ],
      recommendations: [
        'Implement pre-allocated consumer group scale buffers inside Kubernetes.',
        'Enable automatic payload compacting on edge devices during network dropout periods.'
      ]
    }
  } else if (norm.includes('shop') || norm.includes('commerce') || norm.includes('cart') || norm.includes('retail') || norm.includes('store')) {
    // 5. E-commerce Platform
    result = {
      name: 'GPT-5.6 High-Scale E-commerce Core',
      description: 'Extremely resilient e-commerce platform featuring dynamic product catalog routing, distributed cart synchronization, and transaction settlement protections.',
      assumptions: [
        'Product inventory quantities utilize safe optimistic lock allocations.',
        'Guest cart data is cached at local regional servers to prevent DB writes.'
      ],
      estimatedTraffic: { requestsPerSecond: 85000, peakMultiplier: 3.2 },
      nodes: [
        makeNode('users', 'Store Customers', 'client', 'global', 120000, 85000, 24, 1, 80, 230, 'Active web and app clients exploring products, updating carts, and completing checkouts.'),
        makeNode('dns', 'Anycast Geo DNS', 'dns', 'global', 180000, 85000, 3, 4, 310, 230, 'Dispatches storefront traffic to regional load balancer points.'),
        makeNode('cdn', 'Product Catalog CDN', 'cdn', 'global', 150000, 80000, 7, 8, 540, 230, 'Caches media attachments, product details, layouts, and web storefront static bundles.'),
        makeNode('gateway', 'Vanguard API Gateway', 'gateway', 'us-east-1', 120000, 85000, 15, 6, 770, 230, 'Routes backend calls to inventory, cart, routing, and checkout systems.'),
        makeNode('catalog-service', 'Catalog Management', 'service', 'us-east-1', 90000, 75000, 28, 8, 1030, 120, 'Translates search keywords and serves item categorization listings.'),
        makeNode('order-service', 'Order Processing', 'service', 'us-east-1', 80000, 68000, 48, 10, 1030, 360, 'Assembles sales tickets, tracks dynamic tax states, and updates client accounts.'),
        makeNode('cart-redis', 'In-Memory Cart Cache', 'cache', 'us-east-1', 120000, 72000, 1, 6, 1290, 120, 'Ensures rapid product selection times by holding active shopping carts in-memory.'),
        makeNode('order-queue', 'Settlement Queue', 'queue', 'us-east-1', 150000, 8500, 5, 4, 1290, 360, 'Buffers transactions to isolate slow bank systems from primary web clients.'),
        makeNode('primary-db', 'Catalog & Orders DB', 'database', 'us-east-1', 80000, 45000, 14, 1, 1550, 120, 'Saves critical catalog definitions, checkout history, and dynamic stock logs.'),
        makeNode('replica', 'Catalog Read Replica', 'replica', 'us-east-1', 110000, 30000, 8, 4, 1810, 120, 'Saves primary transactional database locks by serving item catalog search reads.'),
        makeNode('backup-db', 'Failover Standby DB', 'backup_database', 'us-west-2', 60000, 0, 42, 1, 1810, 360, 'Geographically separated warm-standby database securing transactional history.', false),
        makeNode('monitoring', 'Observability Cluster', 'monitoring', 'global', 120000, 1200, 4, 2, 1030, 510, 'Tracks dynamic transaction rates, payment failure codes, and user drop rates.')
      ],
      edges: [
        makeEdge('users', 'dns'),
        makeEdge('dns', 'cdn'),
        makeEdge('cdn', 'gateway'),
        makeEdge('gateway', 'catalog-service', false, 'gRPC'),
        makeEdge('gateway', 'order-service', false, 'gRPC'),
        makeEdge('catalog-service', 'cart-redis', false, 'TCP'),
        makeEdge('order-service', 'order-queue', false, 'AMQP'),
        makeEdge('order-queue', 'primary-db', false, 'TCP'),
        makeEdge('primary-db', 'replica', false, 'TCP'),
        makeEdge('order-service', 'backup-db', true, 'gRPC'),
        makeEdge('gateway', 'monitoring', false, 'HTTPS')
      ],
      risks: [
        'Product purchase deadlocks during flash events if stock values drop to 0.',
        'High database lock times if catalog listing indices are written with legacy query pools.'
      ],
      recommendations: [
        'Utilize redis lock primitives to allocate purchase limits securely.',
        'Partition analytical catalog queries to replica nodes during high-traffic holidays.'
      ]
    }
  } else {
    // 6. Generic/Custom dynamic heuristic synthesis!
    const kw = extractCustomKeywords(prompt)
    const systemName = capitalize(prompt.split(' ').slice(0, 3).join(' ').replace(/[^a-zA-Z0-9 ]/g, '')) || 'Dynamic Platform'

    result = {
      name: `GPT-5.6 Synthesized ${systemName}`,
      description: `Custom-tailored modern infrastructure synthesized directly for: "${prompt}". Designed with decoupled microservices, high-speed regional caches, and asynchronous failover layers.`,
      assumptions: [
        `System is auto-scaled dynamically based on target transaction loads.`,
        `Data flows sequentially across distinct visual logical stages from left to right.`
      ],
      estimatedTraffic: { requestsPerSecond: 35000, peakMultiplier: 2.2 },
      nodes: [
        makeNode('users', 'Global Consumers', 'client', 'global', 50000, 35000, 18, 1, 80, 230, 'Active clients dispatching requests to the synthesized cluster.'),
        makeNode('dns', 'Routing Core', 'dns', 'global', 80000, 35000, 3, 3, 310, 230, 'Balances domain lookups and targets regional servers.'),
        makeNode('cdn', 'Content Delivery', 'cdn', 'global', 70000, 32000, 8, 6, 540, 230, 'Serves assets and caches recurring queries near users.'),
        makeNode('gateway', 'Edge API Gateway', 'gateway', 'us-east-1', 60000, 35000, 14, 4, 770, 230, 'Secures system interfaces and translates request headers.'),
        makeNode('service-a', kw.serviceA, 'service', 'us-east-1', 45000, 33000, 38, 6, 1030, 120, `Handles main domain transactions and operational requests.`),
        makeNode('service-b', kw.serviceB, 'worker', 'us-east-1', 40000, 28000, 55, 5, 1030, 360, `Decoupled component tracking asynchronous execution files and logs.`),
        makeNode('redis-cache', 'Redis Speed Layer', 'cache', 'us-east-1', 50000, 22000, 2, 4, 1290, 120, 'Caches hot indexes to shield the database from heavy repeated queries.'),
        makeNode('queue', 'Asynchronous Buffer', 'queue', 'us-east-1', 75000, 8000, 4, 3, 1290, 360, 'Buffers traffic surges, smoothing workloads for stable DB updates.'),
        makeNode('primary-db', `${kw.dbType} Store`, 'database', 'us-east-1', 55000, 34000, 15, 1, 1550, 120, `Main database of record persisting core application state.`),
        makeNode('replica', 'Read-Only Replica', 'replica', 'us-east-1', 75000, 18000, 9, 3, 1810, 120, 'Distributes search queries and reporting requests away from critical database pools.'),
        makeNode('backup-db', 'Backup Cold Storage', 'backup_database', 'us-west-2', 45000, 0, 48, 1, 1810, 360, 'Secondary storage cluster ensuring fast state recovery from major outages.', false),
        makeNode('monitoring', 'Observability Portal', 'monitoring', 'global', 80000, 800, 6, 2, 1030, 510, 'Tracks system KPIs, error spikes, and server queue lags.')
      ],
      edges: [
        makeEdge('users', 'dns'),
        makeEdge('dns', 'cdn'),
        makeEdge('cdn', 'gateway'),
        makeEdge('gateway', 'service-a'),
        makeEdge('gateway', 'service-b'),
        makeEdge('service-a', 'redis-cache'),
        makeEdge('service-b', 'queue'),
        makeEdge('queue', 'primary-db'),
        makeEdge('primary-db', 'replica'),
        makeEdge('service-a', 'backup-db', true),
        makeEdge('gateway', 'monitoring')
      ],
      risks: [
        'Single point of failover limits if backup servers face heavy warmups.',
        'Buffer queue spikes if heavy processing workers require manual restarts.'
      ],
      recommendations: [
        'Configure database connection pooling using specialized load-balancing layers.',
        'Partition heavy table layouts to ensure faster key access times.'
      ]
    }
  }

  // Validate the generated schema using Zod
  return architectureSchema.parse(result)
}
