import type { Architecture, NodeStatus } from '../types/architecture'
export interface SimulationEvent { time: string; level: 'info'|'warning'|'critical'|'success'; message: string }
const statusFor = (load: number, capacity: number): NodeStatus =>
  load / capacity > .9 ? 'overloaded' : load / capacity > .7 ? 'degraded' : 'healthy';

export function simulateNodeOutage(source: Architecture, id: string) {
  const nodes = source.nodes.map(n => ({ ...n, metadata: { ...n.metadata } }));
  const edges = source.edges.map(e => ({ ...e }));
  const failed = nodes.find(n => n.id === id);
  if (!failed) return { architecture: source, events: [] as SimulationEvent[] };

  failed.status = 'failed';
  failed.currentLoad = 0;

  const events: SimulationEvent[] = [{
    time: '00:00',
    level: 'critical',
    message: `${failed.name} failed. Invalid traffic routes were stopped.`
  }];

  const affectedQueue = [id];
  const processed = new Set<string>();

  while (affectedQueue.length > 0) {
    const currentId = affectedQueue.shift()!;
    if (processed.has(currentId)) continue;
    processed.add(currentId);

    const currentNode = nodes.find(n => n.id === currentId)!;

    // Find all incoming active edges to the failed/affected node
    const incomingEdges = edges.filter(e => e.target === currentId && e.active);
    for (const broken of incomingEdges) {
      broken.active = false;
      const origin = nodes.find(n => n.id === broken.source);
      if (!origin || origin.status === 'failed') continue;

      // 1. Look for an explicit backup edge from the same origin
      let backup = edges.find(
        e => e.source === broken.source && e.backup && nodes.find(n => n.id === e.target)?.status !== 'failed'
      );

      // 2. If no explicit backup edge, let's dynamically find a peer node of the same type as the failed node
      if (!backup) {
        const failedNodeType = currentNode.type;
        const peers = nodes.filter(
          n => n.id !== currentNode.id && n.type === failedNodeType && n.status !== 'failed'
        );

        if (peers.length > 0) {
          // Find the best peer (prefer same region, otherwise first available)
          const bestPeer = peers.find(p => p.region === currentNode.region) || peers[0];

          // Check if an edge already exists from origin to bestPeer
          let existingEdge = edges.find(e => e.source === broken.source && e.target === bestPeer.id);
          if (existingEdge) {
            existingEdge.active = true;
            existingEdge.trafficPercentage = Math.min(100, (existingEdge.trafficPercentage || 0) + broken.trafficPercentage);
            backup = existingEdge;
          } else {
            // Dynamically create a visible failover edge
            const newEdgeId = `${broken.source}-${bestPeer.id}-failover`;
            const newEdge = {
              id: newEdgeId,
              source: broken.source,
              target: bestPeer.id,
              trafficPercentage: broken.trafficPercentage,
              latencyMs: broken.latencyMs + 15,
              protocol: broken.protocol,
              active: true,
              backup: true
            };
            edges.push(newEdge);
            backup = newEdge;
          }

          events.push({
            time: '00:02',
            level: 'info',
            message: `Auto-failover: No explicit backup configured. Traffic from ${origin.name} redirected to peer ${bestPeer.name} (${bestPeer.region}).`
          });
        }
      }

      if (backup) {
        backup.active = true;
        backup.trafficPercentage = broken.trafficPercentage;
        const target = nodes.find(n => n.id === backup.target)!;

        // Transfer load from broken path
        const loadTransferred = Math.round((origin.currentLoad ?? 0) * broken.trafficPercentage / 100);
        target.currentLoad += loadTransferred;
        target.latencyMs += 80;
        target.status = statusFor(target.currentLoad, Math.max(target.capacity, 1));

        events.push(
          { time: '00:03', level: 'info', message: `Traffic routing updated: ${origin.name} load-balanced to ${target.name}.` },
          { time: '00:04', level: target.status === 'overloaded' ? 'warning' : 'success', message: `${target.name} load increased to ${Math.round(target.currentLoad / target.capacity * 100)}% (${target.status}); latency increased by 80ms.` }
        );
      } else {
        // No backup and no peer found! The origin node fails as well (cascading failure)
        origin.status = 'failed';
        origin.currentLoad = 0;
        affectedQueue.push(origin.id); // Propagate failure upstream recursively!

        events.push({
          time: '00:03',
          level: 'critical',
          message: `Cascade failure: ${origin.name} lost its downstream dependency (${currentNode.name}) with no available failover peer. Component offline.`
        });
      }
    }

    // Also deactivate outbound edges from the failed node
    const outboundEdges = edges.filter(e => e.source === currentId && e.active);
    for (const out of outboundEdges) {
      out.active = false;
      const target = nodes.find(n => n.id === out.target);
      if (target && target.status !== 'failed') {
        const loadReduced = Math.round((currentNode.currentLoad ?? 0) * out.trafficPercentage / 100);
        target.currentLoad = Math.max(0, target.currentLoad - loadReduced);
        target.status = statusFor(target.currentLoad, Math.max(target.capacity, 1));
      }
    }
  }

  // Ensure status of all other nodes is up-to-date
  for (const n of nodes) {
    if (n.status !== 'failed') {
      n.status = statusFor(n.currentLoad, Math.max(n.capacity, 1));
    }
  }

  events.push({
    time: '00:06',
    level: 'success',
    message: 'Infrastructure topology stabilized after cascade/failover analysis.'
  });

  return { architecture: { ...source, nodes, edges }, events };
}
export function simulateTrafficSpike(source:Architecture,multiplier:number){const nodes=source.nodes.map(n=>({...n,currentLoad:n.status==='failed'?0:Math.round(n.currentLoad*multiplier),status:n.status==='failed'?'failed':statusFor(Math.round(n.currentLoad*multiplier),Math.max(n.capacity,1)),metadata:{...n.metadata}}));const overloaded=nodes.filter(n=>n.status==='overloaded');return {architecture:{...source,nodes},events:[{time:'00:00',level:'warning' as const,message:`${multiplier}x traffic spike injected.`},{time:'00:02',level:overloaded.length?'critical' as const:'success' as const,message:overloaded.length?`${overloaded.map(n=>n.name).join(', ')} exceeded safe capacity.`:'All components remain within safe capacity.'}]}}
export function simulateRegionOutage(source:Architecture,region:string){let architecture=source;const events:SimulationEvent[]=[{time:'00:00',level:'critical',message:`Regional outage initiated in ${region}.`}];const targets=source.nodes.filter(node=>node.region===region&&node.status!=='failed');for(const target of targets){const result=simulateNodeOutage(architecture,target.id);architecture=result.architecture;events.push(...result.events.map(event=>({...event,time:event.time==='00:00'?'00:01':event.time})))}if(!targets.length)events.push({time:'00:01',level:'warning',message:`No healthy components were found in ${region}.`});else events.push({time:'00:07',level:'critical',message:`${targets.length} regional component${targets.length>1?'s were':' was'} taken offline.`});return {architecture,events}}
