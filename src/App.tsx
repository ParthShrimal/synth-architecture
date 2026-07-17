import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Download, RotateCcw, Save, Settings2, Sparkles, Zap, Trash2, Key } from 'lucide-react'
import { ArchitectureCanvas } from './features/architecture/ArchitectureCanvas'
import { demoArchitectures } from './data/demoArchitectures'
import type { Architecture } from './types/architecture'
import { simulateNodeOutage, simulateRegionOutage, simulateTrafficSpike, type SimulationEvent } from './engine/simulation'
import { scoreArchitecture } from './engine/scoring'
import './App.css'

const examples = [
  'Design a multi-region payment system processing 50K transactions per second.',
  'Design a multiplayer game backend for one million concurrent players.',
  'Design an AI inference platform with automatic GPU failover.',
]

function App() {
  const [prompt, setPrompt] = useState(examples[0])
  const [architecture, setArchitecture] = useState<Architecture>(demoArchitectures.payment)
  const [baseline, setBaseline] = useState<Architecture>(demoArchitectures.payment)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [eventFilter, setEventFilter] = useState<'all' | 'critical' | 'warning' | 'success' | 'info'>('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [openaiModel] = useState('gpt-5.6')
  const [keyStatus, setKeyStatus] = useState<{ openaiKeySet: boolean; geminiKeySet: boolean } | null>(null)
  const [showKeyConfig, setShowKeyConfig] = useState(false)
  const [customOpenaiKey, setCustomOpenaiKey] = useState(() => localStorage.getItem('custom_openai_api_key') || '')
  const [customGeminiKey, setCustomGeminiKey] = useState(() => localStorage.getItem('custom_gemini_api_key') || '')

  const handleSetCustomOpenaiKey = (val: string) => {
    setCustomOpenaiKey(val);
    if (val) {
      localStorage.setItem('custom_openai_api_key', val);
    } else {
      localStorage.removeItem('custom_openai_api_key');
    }
  };

  const handleSetCustomGeminiKey = (val: string) => {
    setCustomGeminiKey(val);
    if (val) {
      localStorage.setItem('custom_gemini_api_key', val);
    } else {
      localStorage.removeItem('custom_gemini_api_key');
    }
  };

  useEffect(() => {
    fetch('/api/key-status')
      .then((res) => res.json())
      .then((data) => setKeyStatus(data))
      .catch((err) => console.error('Error fetching key status:', err))
  }, [])

  const selectedNode = useMemo(
    () => architecture.nodes.find((node) => node.id === selectedNodeId) ?? architecture.nodes.find((node) => node.id === 'payment-service'),
    [architecture, selectedNodeId],
  )
  const score = useMemo(() => scoreArchitecture(architecture), [architecture])

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events;
    return events.filter((e) => e.level === eventFilter);
  }, [events, eventFilter])

  const systemHealth = useMemo(() => {
    const failedNodesCount = architecture.nodes.filter(n => n.status === 'failed').length;
    const overloadedNodesCount = architecture.nodes.filter(n => n.status === 'overloaded').length;
    const degradedNodesCount = architecture.nodes.filter(n => n.status === 'degraded' || n.status === 'recovering').length;

    if (failedNodesCount > 0) {
      const hasCriticalFailure = architecture.nodes.some(
        (n) => n.status === 'failed' && (n.criticality === 'critical' || n.criticality === 'high')
      );
      if (hasCriticalFailure) {
        return {
          status: 'critical',
          text: 'SYSTEM CRITICAL',
          className: 'critical',
          color: '#ff7185',
          dotColor: '#ff7185',
        };
      } else {
        return {
          status: 'degraded',
          text: 'SYSTEM DEGRADED',
          className: 'degraded',
          color: '#ffbd65',
          dotColor: '#ffbd65',
        };
      }
    }

    if (overloadedNodesCount > 0) {
      return {
        status: 'overloaded',
        text: 'SYSTEM OVERLOADED',
        className: 'overloaded',
        color: '#fbbf24',
        dotColor: '#fbbf24',
      };
    }

    if (degradedNodesCount > 0) {
      return {
        status: 'degraded',
        text: 'SYSTEM DEGRADED',
        className: 'degraded',
        color: '#ffbd65',
        dotColor: '#ffbd65',
      };
    }

    return {
      status: 'healthy',
      text: 'SYSTEM HEALTHY',
      className: 'healthy',
      color: '#6fcfa1',
      dotColor: '#60d99d',
    };
  }, [architecture]);

  async function generate() {
    setIsGenerating(true)
    setErrorMsg(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customOpenaiKey) {
        headers['x-openai-api-key'] = customOpenaiKey;
      }
      if (customGeminiKey) {
        headers['x-gemini-api-key'] = customGeminiKey;
      }

      const response = await fetch('/api/generate-architecture', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, model: openaiModel }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      const data = await response.json();
      setArchitecture(data);
      setBaseline(data);
      setSelectedNodeId(null);
      setEvents((current) => [
        ...current,
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          level: 'success',
          message: `Custom infrastructure map generated successfully for: "${data.name}".`,
        },
      ]);
    } catch (err: any) {
      console.warn("Failed server-side generation, utilizing smart offline fallback:", err);
      setErrorMsg(err.message || "Failed to generate dynamic architecture.");
      
      const normalized = prompt.toLowerCase()
      let fallback: Architecture;
      if (normalized.includes('game')) fallback = demoArchitectures.game;
      else if (normalized.includes('commerce') || normalized.includes('shop')) fallback = demoArchitectures.commerce;
      else fallback = demoArchitectures.payment;

      setArchitecture(fallback);
      setBaseline(fallback);
      setSelectedNodeId(null);
      setEvents((current) => [
        ...current,
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          level: 'warning',
          message: `Dynamic template selected as fallback: "${fallback.name}". (${err.message})`,
        },
      ]);
    } finally {
      setIsGenerating(false)
    }
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
        <div className="project-name">
          <span 
            className="status-dot" 
            style={{ 
              backgroundColor: systemHealth.dotColor, 
              boxShadow: `0 0 9px ${systemHealth.dotColor}` 
            }} 
          />
          {architecture.name}
          <ArrowUpRight size={14} />
        </div>
        <nav aria-label="Project actions">
          <button 
            type="button"
            onClick={() => setShowKeyConfig(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #6b21a8', backgroundColor: 'rgba(88, 28, 135, 0.25)', color: '#d8b4fe', fontSize: '12px', fontWeight: 500, transition: 'all 0.15s ease', cursor: 'pointer', marginRight: '8px' }}
            className="hover:bg-purple-900/40"
          >
            <Key size={13} className={keyStatus?.openaiKeySet ? "text-emerald-400" : "text-purple-400"} />
            <span>API Key Status</span>
          </button>
          <button><Save size={15} /> Save</button><button><Download size={15} /> Export</button><button aria-label="Settings"><Settings2 size={17} /></button>
        </nav>
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
            <div style={{ animation: 'fadeIn 0.2s ease-out' }} className="mt-2 text-xs text-amber-300 bg-amber-950/50 border border-amber-900/60 rounded p-2.5 flex flex-col gap-1.5 justify-between">
              <div className="flex items-start justify-between gap-1.5">
                <span>
                  ⚠️ <strong>OpenAI Simulation Fallback Loaded:</strong> {errorMsg.includes("OPENAI_API_KEY") ? (
                    <>
                      Set your <strong>OPENAI_API_KEY</strong> in the top-right Settings menu (Secrets) to enable dynamic OpenAI diagram generation using <strong>{openaiModel}</strong>!
                    </>
                  ) : errorMsg}
                </span>
                <button onClick={() => setErrorMsg(null)} className="text-amber-400 hover:text-amber-200 font-bold px-1.5 cursor-pointer">✕</button>
              </div>
              {errorMsg.includes("OPENAI_API_KEY") && (
                <div className="text-[10px] text-amber-400/80 border-t border-amber-900/40 pt-1 font-mono">
                  Tip: To make live API requests to {openaiModel}, go to Settings &gt; Secrets in the top-right, create a secret called <strong>OPENAI_API_KEY</strong>, and paste your key.
                </div>
              )}
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
                onClick={() => { setArchitecture(demo); setBaseline(demo); }}
              >
                <strong>{demo.name}</strong>
                <span>{demo.nodes.length} components</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="canvas-header">
          <div>
            <div className="eyebrow">LIVE INFRASTRUCTURE MAP</div>
            <h2>{architecture.name}</h2>
          </div>
          <div className="header-metrics">
            <span><b>{architecture.estimatedTraffic.requestsPerSecond.toLocaleString()}</b> RPS</span>
            <span><b>{architecture.nodes.length}</b> NODES</span>
            <span className={systemHealth.className} style={{ color: systemHealth.color, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: systemHealth.dotColor, display: 'inline-block', boxShadow: `0 0 9px ${systemHealth.dotColor}` }} /> 
              {systemHealth.text}
            </span>
          </div>
        </div>
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

      {showKeyConfig && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          style={{ animation: 'fadeIn 0.15s ease-out', position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative" style={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }}>
            <button 
              onClick={() => setShowKeyConfig(false)}
              className="absolute text-gray-400 hover:text-gray-200 font-bold cursor-pointer transition-colors"
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}
            >
              ✕
            </button>
            
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-900 pb-3" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #0f172a', paddingBottom: '12px' }}>
              <div className="p-2 bg-purple-950/60 border border-purple-800/80 rounded-lg text-purple-400" style={{ padding: '8px', backgroundColor: 'rgba(88, 28, 135, 0.25)', border: '1px solid #6b21a8', borderRadius: '8px', color: '#c084fc' }}>
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-100 tracking-tight" style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>API Secrets Configuration</h3>
                <p className="text-[11px] text-gray-500" style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>Configure your personal credentials for GPT-5.6 synthesis</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3" style={{ padding: '12px', backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(30, 41, 59, 0.6)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#c084fc' }}>OPENAI_API_KEY</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', fontFamily: 'monospace', backgroundColor: customOpenaiKey ? 'rgba(88, 28, 135, 0.4)' : (keyStatus?.openaiKeySet ? 'rgba(6, 78, 59, 0.4)' : 'rgba(120, 53, 4, 0.4)'), color: customOpenaiKey ? '#d8b4fe' : (keyStatus?.openaiKeySet ? '#34d399' : '#fbbf24'), border: customOpenaiKey ? '1px solid rgba(147, 51, 234, 0.5)' : (keyStatus?.openaiKeySet ? '1px solid rgba(4, 120, 87, 0.5)' : '1px solid rgba(180, 83, 9, 0.5)') }}>
                    {customOpenaiKey ? '● OVERRIDDEN (LOCAL)' : (keyStatus?.openaiKeySet ? '● LOADED (SERVER)' : '○ MISSING')}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                  Used as the primary engine for synthesizing custom microservice and server topologies under <strong>gpt-5.6</strong>.
                </p>
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '9px', color: '#64748b', marginBottom: '4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    REPLACE / OVERRIDE OPENAI KEY:
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="password"
                      value={customOpenaiKey}
                      onChange={(e) => handleSetCustomOpenaiKey(e.target.value)}
                      placeholder="sk-or-your-custom-openai-key"
                      style={{
                        flex: 1,
                        backgroundColor: '#090d16',
                        border: '1px solid #1e293b',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#e2e8f0',
                        outline: 'none'
                      }}
                    />
                    {customOpenaiKey && (
                      <button
                        type="button"
                        onClick={() => handleSetCustomOpenaiKey('')}
                        style={{
                          padding: '2px 8px',
                          backgroundColor: '#7f1d1d',
                          color: '#fca5a5',
                          border: '1px solid #991b1b',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3" style={{ padding: '12px', backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(30, 41, 59, 0.6)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#c084fc' }}>GEMINI_API_KEY</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', fontFamily: 'monospace', backgroundColor: customGeminiKey ? 'rgba(88, 28, 135, 0.4)' : (keyStatus?.geminiKeySet ? 'rgba(6, 78, 59, 0.4)' : 'rgba(120, 53, 4, 0.4)'), color: customGeminiKey ? '#d8b4fe' : (keyStatus?.geminiKeySet ? '#34d399' : '#fbbf24'), border: customGeminiKey ? '1px solid rgba(147, 51, 234, 0.5)' : (keyStatus?.geminiKeySet ? '1px solid rgba(4, 120, 87, 0.5)' : '1px solid rgba(180, 83, 9, 0.5)') }}>
                    {customGeminiKey ? '● OVERRIDDEN (LOCAL)' : (keyStatus?.geminiKeySet ? '● LOADED (SERVER)' : '○ MISSING')}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                  Used as the smart fallback engine when OpenAI rates are exceeded or unavailable.
                </p>
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '9px', color: '#64748b', marginBottom: '4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    REPLACE / OVERRIDE GEMINI KEY:
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="password"
                      value={customGeminiKey}
                      onChange={(e) => handleSetCustomGeminiKey(e.target.value)}
                      placeholder="AIzaSy...your-custom-gemini-key"
                      style={{
                        flex: 1,
                        backgroundColor: '#090d16',
                        border: '1px solid #1e293b',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#e2e8f0',
                        outline: 'none'
                      }}
                    />
                    {customGeminiKey && (
                      <button
                        type="button"
                        onClick={() => handleSetCustomGeminiKey('')}
                        style={{
                          padding: '2px 8px',
                          backgroundColor: '#7f1d1d',
                          color: '#fca5a5',
                          border: '1px solid #991b1b',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'rgba(88, 28, 135, 0.1)', border: '1px solid rgba(107, 33, 168, 0.3)', borderRadius: '8px', fontSize: '12px', color: '#f3e8ff' }}>
                <div style={{ fontWeight: 600, color: '#e9d5ff', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Sparkles size={13} /> How to configure:
                </div>
                <ol style={{ listStyleType: 'decimal', paddingLeft: '16px', margin: 0, fontSize: '11px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Click on the <strong>Settings</strong> button (gear icon ⚙️) in the top-right menu bar.</li>
                  <li>Under the <strong>Secrets</strong> section, click <strong>+ Add Secret</strong>.</li>
                  <li>Name the secret exactly <code style={{ fontFamily: 'monospace', backgroundColor: '#0f172a', color: '#d8b4fe', padding: '2px 4px', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '10px' }}>OPENAI_API_KEY</code>.</li>
                  <li>Paste your OpenAI API key as the value and save!</li>
                </ol>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #0f172a', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                onClick={() => setShowKeyConfig(false)}
                style={{ padding: '6px 16px', backgroundColor: '#0f172a', hover: { backgroundColor: '#1e293b' }, color: '#cbd5e1', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', border: '1px solid #1e293b', fontWeight: 500 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><b>{value}</b></div> }

export default App
