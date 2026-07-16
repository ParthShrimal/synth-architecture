import { useCallback, useMemo } from 'react'
import { Background, Handle, Position, ReactFlow, type Node, type NodeProps, type Edge, MarkerType, Controls } from '@xyflow/react'
import type { Architecture, ArchitectureNode } from '../../types/architecture'

type CanvasNode = Node<ArchitectureNode & Record<string, unknown>>
const positions: Record<string, { x: number; y: number }> = { users:{x:0,y:230},dns:{x:310,y:230},cdn:{x:620,y:230},gateway:{x:930,y:110},balancer:{x:1240,y:110},auth:{x:1550,y:0},'payment-service':{x:1550,y:245},fraud:{x:1860,y:105},queue:{x:1860,y:350},cache:{x:1860,y:595},'primary-db':{x:2170,y:245},replica:{x:2480,y:80},'backup-db':{x:2480,y:450},monitoring:{x:1550,y:500} }
function ArchitectureNodeCard({ data, selected }: NodeProps<CanvasNode>) {
  const utilization = Math.round((data.currentLoad / Math.max(data.capacity, 1)) * 100);
  const failed = data.status === 'failed';
  const description = (data.metadata?.description as string) || (data.type === 'database' ? 'Transactional data store with synchronous replication.' : data.type === 'gateway' ? 'Rate limiting, authentication, and request routing.' : 'Healthy capacity available for active traffic.');
  
  return (
    <div className={`architecture-node ${selected ? 'selected' : ''} ${data.status}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-top">
        <span className="node-type">{data.type.slice(0,2).toUpperCase()}</span>
        <div>
          <strong>{data.name}</strong>
          <small>{data.region} · {data.type.replace('_', ' ')}</small>
        </div>
        <span className="state-pill"><i />{failed ? 'OFFLINE' : data.status.toUpperCase()}</span>
      </div>
      {failed ? (
        <div className="node-alert">[ERR] Route unavailable. Failover policy is evaluating alternate capacity.</div>
      ) : (
        <p className="node-description">{description}</p>
      )}
      <div className="node-metrics">
        <span><b>{utilization}%</b> load</span>
        <span><b>{data.latencyMs}ms</b> latency</span>
        <span><b>{data.replicas}</b> replicas</span>
      </div>
      <div className="node-footer">
        <span><i /> {failed ? 'FAILED' : 'ACTIVE'}</span>
        <b>{data.latencyMs}ms <em>metric</em></b>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { architecture: ArchitectureNodeCard }
export function ArchitectureCanvas({ architecture, selectedNodeId, onSelectNode }: { architecture: Architecture; selectedNodeId: string | null; onSelectNode: (id: string) => void }) {
  const nodes = useMemo<CanvasNode[]>(() => architecture.nodes.map((data, index) => {
    let x = 600 + (index % 4) * 220;
    let y = 100 + Math.floor(index / 4) * 150;
    
    if (data.metadata && typeof data.metadata.x === 'number' && typeof data.metadata.y === 'number') {
      x = data.metadata.x;
      y = data.metadata.y;
    } else if (positions[data.id]) {
      x = positions[data.id].x;
      y = positions[data.id].y;
    }
    
    return {
      id: data.id,
      type: 'architecture',
      className: ['database', 'replica', 'backup_database', 'cache'].includes(data.type) ? 'compact-node' : '',
      selected: data.id === selectedNodeId,
      data: data as ArchitectureNode & Record<string, unknown>,
      position: { x, y }
    };
  }), [architecture, selectedNodeId])
 const edges = useMemo<Edge[]>(() => architecture.edges.map((edge) => ({ id:edge.id, source:edge.source, target:edge.target, animated:edge.active, style:{ stroke:edge.backup ? '#c787ff' : '#70beff', strokeWidth:edge.backup ? 2 : 2.5, strokeDasharray:edge.backup ? '6 5' : undefined, opacity:edge.active ? 1 : .55, filter:edge.active ? `drop-shadow(0 0 5px ${edge.backup ? '#c787ff' : '#70beff'})` : undefined }, markerEnd:{ type:MarkerType.ArrowClosed, color:edge.backup ? '#c787ff' : '#70beff', width:15,height:15 } })), [architecture])
 const onNodeClick = useCallback((_: React.MouseEvent, graphNode: Node) => onSelectNode(graphNode.id), [onSelectNode])
 const move = useCallback((event: React.PointerEvent<HTMLDivElement>) => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--tilt-x', `${((event.clientX - box.left) / box.width - .5) * 5}deg`); event.currentTarget.style.setProperty('--tilt-y', `${((event.clientY - box.top) / box.height - .5) * -5}deg`) }, [])
 return <div className="architecture-canvas" onPointerMove={move} onPointerLeave={(event) => { event.currentTarget.style.setProperty('--tilt-x', '0deg'); event.currentTarget.style.setProperty('--tilt-y', '0deg') }}><div className="tier tier-edge">TIER 01 / EDGE &amp; ROUTING <span>Use mouse to drag/pan &amp; scroll to zoom</span></div><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} minZoom={0.15} maxZoom={1.5} nodesDraggable zoomOnScroll={true} zoomOnPinch={true} panOnScroll={false} panOnDrag={true} fitView fitViewOptions={{ padding: 0.12 }}><Background color="#273850" gap={22} size={1} /><Controls showInteractive={false} position="bottom-left" /></ReactFlow></div>
}
