import { z } from 'zod'
import { nodeTypes } from '../types/architecture'

export const architectureSchema = z.object({
  name: z.string().min(1), description: z.string(), assumptions: z.array(z.string()),
  estimatedTraffic: z.object({ requestsPerSecond: z.number().nonnegative(), peakMultiplier: z.number().positive() }),
  nodes: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), type: z.enum(nodeTypes), region: z.string().min(1), status: z.enum(['healthy', 'degraded', 'overloaded', 'failed', 'recovering']), capacity: z.number().nonnegative(), currentLoad: z.number().nonnegative(), latencyMs: z.number().nonnegative(), replicas: z.number().int().nonnegative(), criticality: z.enum(['low', 'medium', 'high', 'critical']), metadata: z.record(z.string(), z.unknown()) })),
  edges: z.array(z.object({ id: z.string().min(1), source: z.string().min(1), target: z.string().min(1), trafficPercentage: z.number().min(0).max(100), latencyMs: z.number().nonnegative(), protocol: z.string().min(1), active: z.boolean(), backup: z.boolean() })), risks: z.array(z.string()), recommendations: z.array(z.string()),
}).superRefine((architecture, ctx) => { const ids = new Set(architecture.nodes.map((node) => node.id)); for (const edge of architecture.edges) if (!ids.has(edge.source) || !ids.has(edge.target)) ctx.addIssue({ code: 'custom', message: `Edge ${edge.id} references a missing node` }) })
