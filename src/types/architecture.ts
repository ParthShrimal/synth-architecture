export const nodeTypes = ['client', 'dns', 'cdn', 'gateway', 'load_balancer', 'service', 'worker', 'queue', 'cache', 'database', 'replica', 'backup_database', 'storage', 'monitoring', 'external_api', 'region'] as const
export type InfrastructureNodeType = typeof nodeTypes[number]
export type NodeStatus = 'healthy' | 'degraded' | 'overloaded' | 'failed' | 'recovering'
export interface ArchitectureNode { id: string; name: string; type: InfrastructureNodeType; region: string; status: NodeStatus; capacity: number; currentLoad: number; latencyMs: number; replicas: number; criticality: 'low' | 'medium' | 'high' | 'critical'; metadata: Record<string, unknown> }
export interface ArchitectureEdge { id: string; source: string; target: string; trafficPercentage: number; latencyMs: number; protocol: string; active: boolean; backup: boolean }
export interface Architecture { name: string; description: string; assumptions: string[]; estimatedTraffic: { requestsPerSecond: number; peakMultiplier: number }; nodes: ArchitectureNode[]; edges: ArchitectureEdge[]; risks: string[]; recommendations: string[] }
