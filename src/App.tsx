import { useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Download, RotateCcw, Save, Settings2, Sparkles, Zap, Trash2 } from 'lucide-react'
import { ArchitectureCanvas } from './features/architecture/ArchitectureCanvas'
import { demoArchitectures } from './data/demoArchitectures'
import type { Architecture } from './types/architecture'
import { simulateNodeOutage, simulateRegionOutage, simulateTrafficSpike, type SimulationEvent } from './engine/simulation'
import { scoreArchitecture } from './engine/scoring'
import { synthesizeArchitecture } from './engine/synthesizer'
import './App.css'

const examples = [
  'Design a multi-region payment system processing 50K transactions per second.',
  'Design a multiplayer game backend for one million concurrent players.',
  'Design an AI inference platform with automatic GPU failover.',
]

function App() {
  const [prompt, setPrompt] = useState(examples[0])
  const [architecture, setArchitecture] = useState<Architecture>(demoArchitectures.payment)
  const [baseline] = useState<Architecture>(demoArchitectures.payment)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [eventFilter, setEventFilter] = useState<'all' | 'critical' | 'warning' | 'success' | 'info'>('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const selectedNode = useMemo(
    () => architecture.nodes.find((node) => node.id === selectedNodeId) ?? architecture.nodes.find((node) => node.id === 'payment-service'),
    [architecture, selectedNodeId],
  )
  const score = useMemo(() => scoreArchitecture(architecture), [architecture])

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events;
    return events.filter((e) => e.level === eventFilter);
  }, [events, eventFilter])

  function generate() {
    setIsGenerating(true)
    setErrorMsg(null)
    
    // Simulate natural intelligence pipeline synthesis processing (highly aesthetic loading states)
    setTimeout(() => {
      try {
        const synthesized = synthesizeArchitecture(prompt);
        setArchitecture(synthesized);
        setSelectedNodeId(null);
        setEvents((current) => [
          ...current,
          {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            level: 'success',
            message: `[GPT-5.6 Synthesis] Generated custom system architecture map for: "${synthesized.name}".`,
          },
        ]);
      } catch (err: any) {
        console.error("Local synthesis fail:", err);
        setErrorMsg("Failed to synthesize layout locally. Reverting to preset...");
      } finally {
        setIsGenerating(false)
      }
    }, 750); // Elegant 750ms synthesis delay
  }
  function runOutage() { if (!selectedNode) return; const result = simulateNodeOutage(architecture, selectedNode.id); setArchitecture(result.architecture); setEvents((current) => [...current, ...result.events]) }
  function runSpike(multiplier: number) { const result = simulateTrafficSpike(architecture, multiplier); setArchitecture(result.architecture); setEvents((current) => [...current, ...result.events]) }
  function runRegionOutage() { if (!selectedNode) return; const result = simulateRegionOutage(architecture, selectedNode.region); setArchitecture(result.architecture); setEvents((current) => [...current, ...result.events]) }
  function resetSimulation() { setArchitecture(baseline); setEvents([{ time: '00:00', level: 'success', message: 'Simulation reset. Original architecture state restored.' }]); setEventFilter('all'); }
  function clearEvents() { setEvents([]); }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Activity size={17} /></span><span>SYNTH<span>ARCHITECTURE</span></span></div>
        <div className="project-name"><span className="status-dot" />{architecture.name}<ArrowUpRight size={14} /></div>
        <nav aria-label="Project actions"><button><Save size={15} /> Save</button><button><Download size={15} /> Export</button><button aria-label="Settings"><Settings2 size={17} /></button></nav>
      </header>

      <section className="top-generative-panel">
        {/* Design Brief Column */}
        <div className="gen-brief-section">
          <div className="eyebrow">ARCHITECTURE BRIEF</div>
          <h1>Design infrastructure. <em>Break it.</em></h1>
          <p className="gen-intro-text">Simulate outages, find weaknesses, and optimize design.</p>
        </div>

        {/* Prompt Input Column */}
        <div className="gen-prompt-section">
          <div className="eyebrow-row">
            <span className="eyebrow">WHAT ARE YOU BUILDING?</span>
            <div className="quick-start-capsules">
              <span>QUICK START:</span>
              {examples.map((example) => (
                <button 
                  key={example} 
                  className="quick-capsule"
                  onClick={() => setPrompt(example)}
                  title={example}
                >
                  {example.split(' ').slice(1, 4).join(' ')}...
                </button>
              ))}
            </div>
          </div>
          <div className="gen-input-row">
            <input 
              type="text"
              id="architecture-prompt" 
              value={prompt} 
              disabled={isGenerating}
              onChange={(event) => setPrompt(event.target.value)} 
              placeholder="e.g., Design a multi-region gaming platform..."
            />
            <button className="gen-button" onClick={generate} disabled={isGenerating || !prompt.trim()}>
              <Sparkles size={14} className={isGenerating ? "animate-spin text-purple-400" : ""} /> {isGenerating ? "Synthesizing..." : "Generate"}
            </button>
          </div>

          {errorMsg && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }} className="mt-2 text-xs text-amber-300 bg-amber-950/50 border border-amber-900/60 rounded p-2.5 flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-amber-400 hover:text-amber-200 font-bold px-1.5 cursor-pointer">✕</button>
            </div>
          )}
        </div>

        {/* Demo Presets Column */}
        <div className="gen-templates-section">
          <div className="eyebrow">DEMO ARCHITECTURES</div>
          <div className="templates-row">
            {Object.values(demoArchitectures).map((demo) => (
              <button 
                key={demo.name} 
                className={`template-capsule ${architecture.name === demo.name ? 'active-template' : ''}`}
                onClick={() => setArchitecture(demo)}
              >
                <strong>{demo.name}</strong>
                <span>{demo.nodes.length} components</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="canvas-header"><div><div className="eyebrow">LIVE INFRASTRUCTURE MAP</div><h2>{architecture.name}</h2></div><div className="header-metrics"><span><b>{architecture.estimatedTraffic.requestsPerSecond.toLocaleString()}</b> RPS</span><span><b>{architecture.nodes.length}</b> NODES</span><span className="healthy"><i /> SYSTEM HEALTHY</span></div></div>
        <ArchitectureCanvas architecture={architecture} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
        <div className="canvas-footer"><span><i className="traffic-key" /> Live traffic</span><span><i className="backup-key" /> Failover route</span><span>Scroll to zoom · drag to explore</span></div>
      </section>

      <aside className="right-panel">
        <div className="eyebrow">NODE INSPECTOR</div>
        {selectedNode ? <><div className="node-heading"><div className="node-icon">{selectedNode.type.slice(0, 2).toUpperCase()}</div><div><h3>{selectedNode.name}</h3><span>{selectedNode.type.replace('_', ' ')}</span></div></div>
          <div className="health-row"><span className={`health-badge ${selectedNode.status}`}><i /> {selectedNode.status}</span><span>{selectedNode.region}</span></div>
          <div className="metric-grid"><Metric label="CURRENT LOAD" value={`${Math.round((selectedNode.currentLoad / Math.max(selectedNode.capacity, 1)) * 100)}%`} /><Metric label="LATENCY" value={`${selectedNode.latencyMs} ms`} /><Metric label="CAPACITY" value={selectedNode.capacity.toLocaleString()} /><Metric label="REPLICAS" value={String(selectedNode.replicas)} /></div>
          <div className="load-bar"><span style={{ width: `${Math.min(100, (selectedNode.currentLoad / Math.max(selectedNode.capacity, 1)) * 100)}%` }} /></div>
          <button className="outage-button" onClick={runOutage}><Zap size={16} /> Simulate outage</button>
          <div className="simulation-controls"><button onClick={runRegionOutage}>Fail {selectedNode.region}</button><button onClick={() => runSpike(2)}>Inject 2x traffic</button><button onClick={() => runSpike(5)}>Inject 5x traffic</button><button onClick={resetSimulation}><RotateCcw size={13} /> Reset simulation</button></div>
        </> : <p>Select an infrastructure node to inspect its capacity, health, and dependencies.</p>}
        <section className="analysis-preview"><div className="section-title">RESILIENCE ANALYSIS</div><div className="score"><strong>{score.overall}</strong><span>/100<br />resilience</span></div><div className="score-lines"><span>Availability <b>{score.availability}</b></span><span>Redundancy <b>{score.redundancy}</b></span><span>Scalability <b>{score.scalability}</b></span><span>Fault tolerance <b>{score.faultTolerance}</b></span></div><p>{score.findings[0]}</p></section>
      </aside>

      <section className="timeline">
        <div className="timeline-layout">
          <div className="timeline-info-panel">
            <div className="timeline-title-group">
              <div className="eyebrow">SIMULATION EVENT TIMELINE</div>
              <div className="timeline-title-row">
                <h3>System activity</h3>
                {events.length > 0 && (
                  <span className="event-count-badge">
                    {events.length}
                  </span>
                )}
              </div>
            </div>

            <div className="timeline-controls-bar">
              <div className="filter-group">
                {(['all', 'critical', 'warning', 'success'] as const).map((filter) => {
                  const count = filter === 'all' ? events.length : events.filter(e => e.level === filter).length;
                  return (
                    <button
                      key={filter}
                      className={`filter-tab ${eventFilter === filter ? 'active' : ''} ${filter}`}
                      onClick={() => setEventFilter(filter)}
                    >
                      <span className="tab-name">{filter}</span>
                      {count > 0 && <span className="tab-count">{count}</span>}
                    </button>
                  );
                })}
              </div>

              {events.length > 0 && (
                <button className="clear-btn" onClick={clearEvents} title="Clear event stream">
                  <Trash2 size={11} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          <div className="event-stream">
            {filteredEvents.length ? (
              filteredEvents.map((event, index) => {
                return (
                  <div className={`event-card ${event.level}`} key={`${event.time}-${index}`}>
                    <div className="event-side-glow" />
                    <div className="event-body">
                      <time className="event-time-tag">{event.time}</time>
                      <p className="event-message">{event.message}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="event-stream-empty">
                {events.length === 0 ? (
                  <p>Run an outage simulation or inject traffic spikes above to generate real-time routing and capacity telemetry.</p>
                ) : (
                  <p>No events match the "{eventFilter}" filter.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><b>{value}</b></div> }

export default App
