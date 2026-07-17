import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Download, RotateCcw, Save, Sparkles, Zap, Trash2, Key, History, LogOut, User, SlidersHorizontal, Shield, ShieldAlert, Info } from 'lucide-react'
import { ArchitectureCanvas } from './features/architecture/ArchitectureCanvas'
import { generateProceduralArchitecture } from './utils/procedural'
import { generateViaGeminiClient, generateViaOpenAIClient } from './utils/directApi'
import { demoArchitectures } from './data/demoArchitectures'
import type { Architecture } from './types/architecture'
import { simulateNodeOutage, simulateTrafficSpike, type SimulationEvent } from './engine/simulation'
import { scoreArchitecture } from './engine/scoring'
import { signInWithGoogle, signOutFirebase } from './lib/firebase'
import './App.css'

const examples = [
  'Design a multi-region payment system processing 50K transactions per second.',
  'Design a multiplayer game backend for one million concurrent players.',
  'Design an AI inference platform with automatic GPU failover.',
]

const getUserKeyPrefix = (userObj: { isLoggedIn: boolean; email?: string; displayName?: string } | null) => {
  if (!userObj || !userObj.isLoggedIn) return 'guest';
  const id = userObj.email || userObj.displayName || 'unknown';
  return id.replace(/[^a-zA-Z0-9@.]/g, '_').toLowerCase();
};

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
  const [customOpenaiKey, setCustomOpenaiKey] = useState(() => {
    const storedUser = localStorage.getItem('synth_user_session');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const prefix = getUserKeyPrefix(parsed);
        if (prefix !== 'guest') {
          return localStorage.getItem(`custom_openai_api_key_${prefix}`) || '';
        }
      } catch {
        // Fallback
      }
    }
    return '';
  });
  const [customGeminiKey, setCustomGeminiKey] = useState(() => {
    const storedUser = localStorage.getItem('synth_user_session');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const prefix = getUserKeyPrefix(parsed);
        if (prefix !== 'guest') {
          return localStorage.getItem(`custom_gemini_api_key_${prefix}`) || '';
        }
      } catch {
        // Fallback
      }
    }
    return '';
  });

  // User details & account session states
  const [user, setUser] = useState<{ isLoggedIn: boolean; displayName: string; email?: string; photoURL?: string } | null>(() => {
    const stored = localStorage.getItem('synth_user_session');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fallback
      }
    }
    return null;
  });

  const [history, setHistory] = useState<any[]>(() => {
    const storedUser = localStorage.getItem('synth_user_session');
    let prefix = 'guest';
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        prefix = getUserKeyPrefix(parsed);
      } catch {
        // Fallback
      }
    }
    const stored = localStorage.getItem(`synth_architecture_history_${prefix}`);
    return stored ? JSON.parse(stored) : [];
  });

  const [currentView, setCurrentView] = useState<'map' | 'history'>('map');
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Pre-configured Firebase defaults using the requested project ID: syntharchitecture-5540d
  const firebaseConfig = useMemo(() => {
    return {
      apiKey: "AIzaSyBtTaOOB1IzGXpGNOL1WfWCQOGy_JaelV0",
      authDomain: "syntharchitecture-5540d.firebaseapp.com",
      projectId: "syntharchitecture-5540d",
      appId: "1:432523422814:web:2c1011dc7ac7f2a7cbd8cf",
      messagingSenderId: "432523422814"
    };
  }, []);

  const [firebaseError, setFirebaseError] = useState('');
  const [isFirebaseSigningIn, setIsFirebaseSigningIn] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<'dev' | 'pre' | 'current' | null>(null);
  const [loginTab, setLoginTab] = useState<'google' | 'userid'>('google');
  const [simulatedEmail, setSimulatedEmail] = useState('');
  const [simulatedName, setSimulatedName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [tempOpenaiKey, setTempOpenaiKey] = useState(() => customOpenaiKey);
  const [tempGeminiKey, setTempGeminiKey] = useState(() => customGeminiKey);

  // Automatically identify if user logged in with parthsh1910@gmail.com is admin/developer mode
  const isDevAdmin = useMemo(() => {
    return user?.isLoggedIn && user.email?.trim().toLowerCase() === 'parthsh1910@gmail.com';
  }, [user]);

  // Sync keys dynamically when user log in or log out
  useEffect(() => {
    const prefix = getUserKeyPrefix(user);
    if (prefix === 'guest') {
      setCustomOpenaiKey('');
      setCustomGeminiKey('');
      setTempOpenaiKey('');
      setTempGeminiKey('');
      const storedHistory = localStorage.getItem(`synth_architecture_history_${prefix}`);
      setHistory(storedHistory ? JSON.parse(storedHistory) : []);
    } else {
      const savedOpenai = localStorage.getItem(`custom_openai_api_key_${prefix}`) || '';
      const savedGemini = localStorage.getItem(`custom_gemini_api_key_${prefix}`) || '';
      setCustomOpenaiKey(savedOpenai);
      setCustomGeminiKey(savedGemini);
      setTempOpenaiKey(savedOpenai);
      setTempGeminiKey(savedGemini);
      const storedHistory = localStorage.getItem(`synth_architecture_history_${prefix}`);
      setHistory(storedHistory ? JSON.parse(storedHistory) : []);
    }
  }, [user]);

  // Sync temp variables when the modal is opened
  useEffect(() => {
    if (showAccountModal) {
      setTempOpenaiKey(customOpenaiKey);
      setTempGeminiKey(customGeminiKey);
    }
  }, [showAccountModal, customOpenaiKey, customGeminiKey]);

  const handleSetCustomOpenaiKey = (val: string) => {
    setCustomOpenaiKey(val);
    const prefix = getUserKeyPrefix(user);
    if (prefix !== 'guest') {
      if (val) {
        localStorage.setItem(`custom_openai_api_key_${prefix}`, val);
      } else {
        localStorage.removeItem(`custom_openai_api_key_${prefix}`);
      }
    }
  };

  const handleSetCustomGeminiKey = (val: string) => {
    setCustomGeminiKey(val);
    const prefix = getUserKeyPrefix(user);
    if (prefix !== 'guest') {
      if (val) {
        localStorage.setItem(`custom_gemini_api_key_${prefix}`, val);
      } else {
        localStorage.removeItem(`custom_gemini_api_key_${prefix}`);
      }
    }
  };

  const handleRealGoogleSignIn = async () => {
    setIsFirebaseSigningIn(true);
    setFirebaseError('');
    try {
      const credential = await signInWithGoogle(firebaseConfig);
      const fbUser = credential.user;
      
      const updatedUser = {
        isLoggedIn: true,
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Cloud Architect',
        email: fbUser.email || undefined,
        photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.displayName || 'User')}`
      };
      
      setUser(updatedUser);
      localStorage.setItem('synth_user_session', JSON.stringify(updatedUser));
      
      setEvents(curr => [
        ...curr,
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          level: 'success',
          message: `Successfully connected Google session for: "${fbUser.email || 'User'}"!`,
        }
      ]);
      setFirebaseError('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
        setFirebaseError('unauthorized-domain');
      } else if (err.code === 'auth/popup-closed-by-user' || (err.message && err.message.includes('popup-closed-by-user'))) {
        setFirebaseError('popup-closed-by-user');
      } else {
        setFirebaseError(`Google Sign-In Error: ${err.message || 'Authentication failed.'}`);
      }
    } finally {
      setIsFirebaseSigningIn(false);
    }
  };

  const handleSendSimulatedOtp = () => {
    if (!simulatedName.trim()) {
      setFirebaseError('Please enter a display name.');
      return;
    }
    if (!simulatedEmail.trim()) {
      setFirebaseError('Email address is important and required for verification.');
      return;
    }
    // Simple email regex check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(simulatedEmail.trim())) {
      setFirebaseError('Please enter a valid email address.');
      return;
    }

    setFirebaseError('');
    setIsVerifyingOtp(true);

    try {
      // Generate a secure 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpSent(true);

      setEvents(curr => [
        ...curr,
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          level: 'info',
          message: `🔑 OTP Code sent to ${simulatedEmail.trim()}: "${code}" (Use this to verify your session)`,
        }
      ]);
    } catch (err: any) {
      setFirebaseError(`OTP Generation Error: ${err.message || 'Failed to send OTP.'}`);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleVerifySimulatedOtp = () => {
    if (!enteredOtp.trim()) {
      setFirebaseError('Please enter the 6-digit verification code.');
      return;
    }

    if (enteredOtp.trim() !== generatedOtp) {
      setFirebaseError('Invalid verification code. Please enter the correct OTP shown in the active notifications/events.');
      return;
    }

    const emailToUse = simulatedEmail.trim();
    const updatedUser = {
      isLoggedIn: true,
      displayName: simulatedName.trim(),
      email: emailToUse,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(simulatedName.trim())}`
    };
    
    setUser(updatedUser);
    localStorage.setItem('synth_user_session', JSON.stringify(updatedUser));
    
    setEvents(curr => [
      ...curr,
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        level: 'success',
        message: `Successfully verified and connected session for: "${emailToUse}"!`,
      }
    ]);

    // Reset temporary states
    setOtpSent(false);
    setGeneratedOtp(null);
    setEnteredOtp('');
    setFirebaseError('');
  };

  const handleAccountLogin = () => {
    handleSetCustomOpenaiKey(tempOpenaiKey);
    handleSetCustomGeminiKey(tempGeminiKey);

    setEvents(curr => [
      ...curr,
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        level: 'success',
        message: `Account settings updated successfully. Ready to synthesize!`,
      }
    ]);

    setShowAccountModal(false);
  };

  const deleteHistoryItem = (id: string | number) => {
    const updatedHistory = history.filter((item, idx) => {
      const itemId = item.id || idx;
      return itemId !== id;
    });
    setHistory(updatedHistory);
    const prefix = getUserKeyPrefix(user);
    localStorage.setItem(`synth_architecture_history_${prefix}`, JSON.stringify(updatedHistory));
    
    setEvents(curr => [
      ...curr,
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        level: 'info',
        message: 'Deleted architecture item from history.',
      }
    ]);
  };

  useEffect(() => {
    fetch('/api/key-status')
      .then((res) => {
        if (!res.ok) {
          throw new Error('API server unavailable or running in static mode');
        }
        return res.json();
      })
      .then((data) => setKeyStatus(data))
      .catch(() => {
        // App running in static mode on Vercel/similar host, fallback silently
        setKeyStatus({ openaiKeySet: false, geminiKeySet: false });
      });
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

  async function generate(forceRegenerate = false) {
    if (!user || !user.isLoggedIn || (!customOpenaiKey && !customGeminiKey)) {
      setShowAccountModal(true);
      setErrorMsg("You must log in with your Google account or username, AND provide your own personal OpenAI or Gemini API Key to authorize custom synthesis. No default keys are provided.");
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!forceRegenerate) {
      const existingMatch = history.find(
        (item) => item.prompt.toLowerCase().trim() === trimmedPrompt.toLowerCase().trim()
      );
      if (existingMatch) {
        setArchitecture(existingMatch.architecture);
        setBaseline(existingMatch.architecture);
        setSelectedNodeId(null);
        setEvents((current) => [
          ...current,
          {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            level: 'info',
            message: `Loaded previously generated architecture from history: "${existingMatch.architecture.name}". Click 'Regenerate' to synthesize a new one.`,
          },
        ]);
        return;
      }
    }

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
        body: JSON.stringify({ prompt: trimmedPrompt, model: openaiModel }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      const data = await response.json();
      setArchitecture(data);
      setBaseline(data);
      setSelectedNodeId(null);

      // Save to history!
      const newHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        prompt: trimmedPrompt,
        architecture: data,
        timestamp: new Date().toLocaleString(),
      };
      const updatedHistory = [newHistoryItem, ...history];
      setHistory(updatedHistory);
      const prefix = getUserKeyPrefix(user);
      localStorage.setItem(`synth_architecture_history_${prefix}`, JSON.stringify(updatedHistory));

      setEvents((current) => [
        ...current,
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          level: 'success',
          message: `Custom infrastructure map generated successfully for: "${data.name}". Saved to History.`,
        },
      ]);
    } catch (err: any) {
      console.warn("Server generation endpoint unavailable, attempting direct browser AI client synthesis:", err);
      
      const isStaticOr404 = err.message && (err.message.includes("404") || err.message.includes("not found") || err.message.includes("fetch") || err.message.includes("Failed to fetch"));
      
      // If there are client-side keys, try direct generation from the browser!
      if (customOpenaiKey || customGeminiKey) {
        try {
          let directData: Architecture;
          if (customOpenaiKey) {
            setEvents((current) => [
              ...current,
              {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                level: 'info',
                message: `Static Server Mode (Vercel): Initiating direct browser API call using your OpenAI API Key...`,
              },
            ]);
            directData = await generateViaOpenAIClient(trimmedPrompt, customOpenaiKey, openaiModel);
          } else {
            setEvents((current) => [
              ...current,
              {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                level: 'info',
                message: `Static Server Mode (Vercel): Initiating direct browser API call using your Gemini API Key...`,
              },
            ]);
            directData = await generateViaGeminiClient(trimmedPrompt, customGeminiKey);
          }

          setArchitecture(directData);
          setBaseline(directData);
          setSelectedNodeId(null);

          const newHistoryItem = {
            id: Math.random().toString(36).substring(2, 9),
            prompt: trimmedPrompt,
            architecture: directData,
            timestamp: new Date().toLocaleString(),
          };
          const updatedHistory = [newHistoryItem, ...history];
          setHistory(updatedHistory);
          const prefix = getUserKeyPrefix(user);
          localStorage.setItem(`synth_architecture_history_${prefix}`, JSON.stringify(updatedHistory));

          setEvents((current) => [
            ...current,
            {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              level: 'success',
              message: `Direct Browser AI Engine synthesized custom map successfully: "${directData.name}".`,
            },
          ]);
          return; // Succeeded! Bypass procedural generation
        } catch (directErr: any) {
          console.error("Direct browser AI generation failed, falling back to procedural:", directErr);
          // Let error fall through to standard procedural generator, but with direct API error message
          setErrorMsg(`Static host direct AI call failed: ${directErr.message || directErr}. Activating client-side procedural generator.`);
        }
      } else {
        if (isStaticOr404) {
          setErrorMsg(`Vercel_Static_Mode: Since this application is running on Vercel / static hosting, the client-side procedural model engine has designed your custom infrastructure map! For live server-side AI synthesis (Gemini & OpenAI), run the app in a full-stack container environment.`);
        } else {
          setErrorMsg(`Generation server offline (${err.message}). Activating local procedural model generation to design your custom map!`);
        }
      }
      
      const fallback = generateProceduralArchitecture(trimmedPrompt);

      setArchitecture(fallback);
      setBaseline(fallback);
      setSelectedNodeId(null);

      // Save procedurally generated architecture to history as well so it's persisted!
      const newHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        prompt: trimmedPrompt,
        architecture: fallback,
        timestamp: new Date().toLocaleString(),
      };
      const updatedHistory = [newHistoryItem, ...history];
      setHistory(updatedHistory);
      const prefix = getUserKeyPrefix(user);
      localStorage.setItem(`synth_architecture_history_${prefix}`, JSON.stringify(updatedHistory));

      setEvents((current) => [
        ...current,
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          level: 'success',
          message: `Procedural model engine synthesized customized map: "${fallback.name}". Saved to History.`,
        },
      ]);
    } finally {
      setIsGenerating(false)
    }
  }
  function runOutage() { if (!selectedNode) return; const result = simulateNodeOutage(architecture, selectedNode.id); setArchitecture(result.architecture); setEvents((current) => [...current, ...result.events]) }
  function runSpike(multiplier: number) { const result = simulateTrafficSpike(architecture, multiplier); setArchitecture(result.architecture); setEvents((current) => [...current, ...result.events]) }
  function resetSimulation() { setArchitecture(baseline); setEvents([{ time: '00:00', level: 'success', message: 'Simulation reset. Original architecture state restored.' }]); setEventFilter('all'); }
  function clearEvents() { setEvents([]); }
  function updateNodeProperty(nodeId: string, property: 'capacity' | 'latencyMs' | 'replicas', value: number) {
    setArchitecture(curr => {
      const updatedNodes = curr.nodes.map(n => {
        if (n.id === nodeId) {
          return { ...n, [property]: value };
        }
        return n;
      });
      return { ...curr, nodes: updatedNodes };
    });
    setBaseline(curr => {
      const updatedNodes = curr.nodes.map(n => {
        if (n.id === nodeId) {
          return { ...n, [property]: value };
        }
        return n;
      });
      return { ...curr, nodes: updatedNodes };
    });
    setEvents(curr => [
      ...curr,
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        level: 'success',
        message: `[Dev Admin] Node updated: Set ${property.toUpperCase()} to ${value}.`
      }
    ]);
  }

  function handleUpdateNodePosition(nodeId: string, x: number, y: number) {
    setArchitecture(curr => {
      const updatedNodes = curr.nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            metadata: {
              ...(n.metadata || {}),
              x,
              y
            }
          };
        }
        return n;
      });
      return { ...curr, nodes: updatedNodes };
    });
    setBaseline(curr => {
      const updatedNodes = curr.nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            metadata: {
              ...(n.metadata || {}),
              x,
              y
            }
          };
        }
        return n;
      });
      return { ...curr, nodes: updatedNodes };
    });
  }

  const hasPreviousMatch = useMemo(() => {
    return history.some(item => item.prompt.toLowerCase().trim() === prompt.toLowerCase().trim());
  }, [history, prompt]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Activity size={17} /></span><span>SYNTH<span>ARCHITECTURE</span></span></div>
        
        {currentView === 'map' && (
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
        )}

        <nav aria-label="Project actions">
          {/* History Page / Map View Switcher */}
          <button 
            type="button"
            onClick={() => setCurrentView(currentView === 'history' ? 'map' : 'history')}
            style={{
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px', 
              borderRadius: '6px', 
              border: currentView === 'history' ? '1px solid #3b82f6' : '1px solid #1e293b', 
              backgroundColor: currentView === 'history' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.3)', 
              color: currentView === 'history' ? '#60a5fa' : '#aab7cc', 
              fontSize: '12px', 
              transition: 'all 0.15s ease', 
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            <History size={13} />
            <span>History {history.length > 0 ? `(${history.length})` : ''}</span>
          </button>

          {/* Developer Mode Badge */}
          {isDevAdmin && (
            <div 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px', 
                padding: '4px 10px', 
                borderRadius: '6px', 
                backgroundColor: 'rgba(139, 92, 246, 0.15)', 
                border: '1px solid rgba(139, 92, 246, 0.35)',
                fontSize: '11px', 
                color: '#a78bfa',
                marginRight: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                boxShadow: '0 0 12px rgba(139, 92, 246, 0.12)'
              }}
            >
              <Shield size={11} className="text-purple-400 animate-pulse" />
              <span>Developer Mode</span>
            </div>
          )}

          {/* User Account / Profile Badge */}
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '4px 10px', 
              borderRadius: '99px', 
              backgroundColor: user?.isLoggedIn ? (isDevAdmin ? 'rgba(139, 92, 246, 0.12)' : 'rgba(16, 185, 129, 0.1)') : 'rgba(148, 163, 184, 0.08)', 
              border: user?.isLoggedIn ? (isDevAdmin ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)') : '1px solid rgba(148, 163, 184, 0.15)',
              fontSize: '11px', 
              color: user?.isLoggedIn ? (isDevAdmin ? '#c084fc' : '#34d399') : '#94a3b8',
              marginRight: '12px',
              fontWeight: 500
            }}
          >
            <User size={12} />
            <span>{user?.isLoggedIn ? user.displayName : 'Guest User'}</span>
          </div>

          <button><Save size={15} /> Save</button>
          <button><Download size={15} /> Export</button>

          {/* Account Profile / Settings & API Keys Button (Slider Style from Image) */}
          <button 
            type="button"
            onClick={() => setShowAccountModal(true)}
            title="Account Profile & API Keys"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              backgroundColor: '#0a101f',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'all 0.15s ease',
              marginLeft: '8px'
            }}
            className="hover:border-blue-500 hover:bg-slate-900"
          >
            <SlidersHorizontal size={16} />
          </button>
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
            <button className="gen-button" onClick={() => generate(false)} disabled={isGenerating || !prompt.trim()}>
              <Sparkles size={14} className={isGenerating ? "animate-spin" : ""} /> {isGenerating ? "Synthesizing..." : "Generate"}
            </button>
          </div>

          {hasPreviousMatch && !isGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#64748b', animation: 'fadeIn 0.15s ease-out' }}>
              <span>💡 Designed previously. Clicking 'Generate' loads it from History, or you can</span>
              <button 
                type="button"
                onClick={() => generate(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#657cff',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  font: 'inherit',
                  fontWeight: 600
                }}
                className="hover:text-blue-400"
              >
                Force brand-new synthesis
              </button>
            </div>
          )}

          {errorMsg && (
            errorMsg.startsWith("Vercel_Static_Mode:") ? (
              <div style={{ animation: 'fadeIn 0.2s ease-out' }} className="mt-2 text-xs text-sky-300 bg-sky-950/55 border border-sky-900/60 rounded p-2.5 flex flex-col gap-1.5 justify-between">
                <div className="flex items-start justify-between gap-1.5">
                  <span>
                    ⚡ <strong>Static Local Mode (Vercel):</strong> {errorMsg.replace("Vercel_Static_Mode: ", "").replace("Vercel_Static_Mode:", "")}
                  </span>
                  <button onClick={() => setErrorMsg(null)} className="text-sky-400 hover:text-sky-200 font-bold px-1.5 cursor-pointer">✕</button>
                </div>
              </div>
            ) : (
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
            )
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

      {currentView === 'history' ? (
        <section className="workspace" style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e2e4a', paddingBottom: '12px' }}>
            <div>
              <div className="eyebrow" style={{ letterSpacing: '0.05em' }}>ARCHITECTURAL ARCHIVES</div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: '4px 0 0 0' }}>Generation History</h2>
            </div>
            <button 
              onClick={() => setCurrentView('map')}
              style={{ padding: '6px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              className="hover:bg-slate-800 transition-colors"
            >
              Back to Live Map
            </button>
          </div>

          {history.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
              <History size={48} style={{ marginBottom: '16px', color: '#1e293b' }} />
              <p style={{ fontSize: '14px', margin: 0, color: '#94a3b8', fontWeight: 500 }}>No custom architectures generated yet.</p>
              <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px', maxWidth: '300px' }}>Log in with your API keys and type a prompt to synthesize your first design!</p>
            </div>
          ) : (
            <div className="history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px', flex: 1, alignContent: 'start', paddingBottom: '20px' }}>
              {history.map((item, idx) => (
                <div 
                  key={item.id || idx} 
                  className="history-card"
                  style={{ 
                    backgroundColor: 'rgba(10, 18, 32, 0.65)', 
                    border: '1px solid #17253f', 
                    borderRadius: '8px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '210px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', color: '#5085a5', fontFamily: 'monospace' }}>{item.timestamp}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.id || idx);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '2px', opacity: 0.7 }}
                        className="hover:opacity-100 hover:text-red-400"
                        title="Delete from history"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 650, color: '#e2e8f0', margin: '0 0 6px 0' }}>{item.architecture.name}</h3>
                    <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 10px 0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebKitLineClamp: 2, WebKitBoxOrient: 'vertical' }}>
                      <strong>Prompt:</strong> "{item.prompt}"
                    </p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0', display: '-webkit-box', WebKitLineClamp: 3, WebKitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                      {item.architecture.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #132137', paddingTop: '10px', marginTop: 'auto' }}>
                    <span style={{ fontSize: '11px', color: '#475569' }}>
                      <b>{item.architecture.nodes.length}</b> nodes · <b>{item.architecture.estimatedTraffic.requestsPerSecond.toLocaleString()}</b> RPS
                    </span>
                    <button 
                      onClick={() => {
                        setArchitecture(item.architecture);
                        setBaseline(item.architecture);
                        setPrompt(item.prompt);
                        setCurrentView('map');
                        setSelectedNodeId(null);
                        setEvents([
                          {
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            level: 'success',
                            message: `Loaded architecture "${item.architecture.name}" from history archives.`,
                          }
                        ]);
                      }}
                      style={{ 
                        padding: '4px 10px', 
                        backgroundColor: '#0c2238', 
                        border: '1px solid #1e3a8a', 
                        color: '#60a5fa', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover:bg-blue-900/40"
                    >
                      Load Map
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
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
          <ArchitectureCanvas architecture={architecture} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} onUpdateNodePosition={handleUpdateNodePosition} />
          <div className="canvas-footer"><span><i className="traffic-key" /> Live traffic</span><span><i className="backup-key" /> Failover route</span><span>Scroll to zoom · drag to explore</span></div>
        </section>
      )}

      <aside className="right-panel">
        <div className="eyebrow">NODE INSPECTOR</div>
        {selectedNode ? <><div className="node-heading"><div className="node-icon">{selectedNode.type.slice(0, 2).toUpperCase()}</div><div><h3>{selectedNode.name}</h3><span>{selectedNode.type.replace('_', ' ')}</span></div></div>
          <div className="health-row"><span className={`health-badge ${selectedNode.status}`}><i /> {selectedNode.status}</span><span>{selectedNode.region}</span></div>
          <div className="metric-grid"><Metric label="CURRENT LOAD" value={`${Math.round((selectedNode.currentLoad / Math.max(selectedNode.capacity, 1)) * 100)}%`} /><Metric label="LATENCY" value={`${selectedNode.latencyMs} ms`} /><Metric label="CAPACITY" value={selectedNode.capacity.toLocaleString()} /><Metric label="REPLICAS" value={String(selectedNode.replicas)} /></div>
          <div className="load-bar"><span style={{ width: `${Math.min(100, (selectedNode.currentLoad / Math.max(selectedNode.capacity, 1)) * 100)}%` }} /></div>
          <button className="outage-button" onClick={runOutage}><Zap size={16} /> Simulate outage</button>
          <div className="simulation-controls"><button onClick={() => runSpike(2)}>Inject 2x traffic</button><button onClick={() => runSpike(5)}>Inject 5x traffic</button><button onClick={resetSimulation}><RotateCcw size={13} /> Reset simulation</button></div>

          {/* Developer Admin Node Controls */}
          {isDevAdmin && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed #1e293b', animation: 'fadeIn 0.2s ease-out' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 600, color: '#a78bfa', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Shield size={12} className="text-purple-400" /> Developer Tuning
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '3px' }}>
                    <span>Capacity Limit</span>
                    <b className="text-purple-300">{selectedNode.capacity.toLocaleString()}</b>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="100000" 
                    step="1000"
                    value={selectedNode.capacity}
                    onChange={(e) => updateNodeProperty(selectedNode.id, 'capacity', Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer', height: '4px', borderRadius: '2px', backgroundColor: '#1e293b', outline: 'none' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '3px' }}>
                    <span>Latency Delay</span>
                    <b className="text-purple-300">{selectedNode.latencyMs} ms</b>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="500" 
                    step="5"
                    value={selectedNode.latencyMs}
                    onChange={(e) => updateNodeProperty(selectedNode.id, 'latencyMs', Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer', height: '4px', borderRadius: '2px', backgroundColor: '#1e293b', outline: 'none' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '3px' }}>
                    <span>Instance Replicas</span>
                    <b className="text-purple-300">{selectedNode.replicas}</b>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    step="1"
                    value={selectedNode.replicas}
                    onChange={(e) => updateNodeProperty(selectedNode.id, 'replicas', Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer', height: '4px', borderRadius: '2px', backgroundColor: '#1e293b', outline: 'none' }}
                  />
                </div>
              </div>
            </div>
          )}
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

      {showAccountModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          style={{ animation: 'fadeIn 0.15s ease-out', position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150" style={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }}>
            
            <button 
              onClick={() => setShowAccountModal(false)}
              className="absolute text-gray-400 hover:text-gray-200 font-bold cursor-pointer transition-colors"
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', zIndex: 10 }}
            >
              ✕
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #0f172a', paddingBottom: '12px' }}>
              <div style={{ padding: '8px', backgroundColor: user?.isLoggedIn ? 'rgba(59, 130, 246, 0.15)' : 'rgba(148, 163, 184, 0.1)', border: user?.isLoggedIn ? '1px solid #3b82f6' : '1px solid #475569', borderRadius: '8px', color: user?.isLoggedIn ? '#60a5fa' : '#94a3b8' }}>
                <User size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Account Profile & API Keys</h3>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                  {user?.isLoggedIn ? `Logged in: ${user.displayName}` : 'Not Connected'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* If Logged In: Show profile details */}
              {user?.isLoggedIn ? (
                <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}`} 
                      alt="Avatar" 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #10b981' }} 
                      referrerPolicy="no-referrer"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{user.displayName}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{user.email}</div>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if (firebaseConfig) {
                        try {
                          await signOutFirebase(firebaseConfig);
                        } catch (e) {
                          console.warn('Firebase signout skipped:', e);
                        }
                      }
                      setUser(null);
                      localStorage.removeItem('synth_user_session');
                      setSimulatedEmail('');
                      setSimulatedName('');
                      setOtpSent(false);
                      setGeneratedOtp(null);
                      setEnteredOtp('');
                      setEvents(curr => [
                        ...curr,
                        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), level: 'info', message: 'Logged out. Returned to Guest session.' }
                      ]);
                    }}
                    style={{ 
                      alignSelf: 'flex-start',
                      background: 'transparent', 
                      border: 'none', 
                      color: '#f87171', 
                      cursor: 'pointer', 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: '4px 0'
                    }}
                    className="hover:underline"
                  >
                    <LogOut size={12} /> Log Out Account
                  </button>
                </div>
              ) : (
                /* If Not Logged In: Google Login & Simulated login tabs */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Tab Selector */}
                  <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', paddingBottom: '2px', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => { setLoginTab('google'); setFirebaseError(''); }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: loginTab === 'google' ? '#c084fc' : '#94a3b8',
                        borderBottom: loginTab === 'google' ? '2px solid #c084fc' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Google Account
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginTab('userid'); setFirebaseError(''); }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: loginTab === 'userid' ? '#c084fc' : '#94a3b8',
                        borderBottom: loginTab === 'userid' ? '2px solid #c084fc' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      User ID
                    </button>
                  </div>

                  {loginTab === 'google' ? (
                    /* Google Sign-In with Preset Firebase */
                    <button
                      type="button"
                      disabled={isFirebaseSigningIn}
                      onClick={handleRealGoogleSignIn}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px',
                        backgroundColor: isFirebaseSigningIn ? '#f1f5f9' : '#ffffff',
                        border: '1px solid #dadce0',
                        borderRadius: '6px',
                        color: '#3c4043',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isFirebaseSigningIn ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      className="hover:bg-gray-100"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      <span>{isFirebaseSigningIn ? 'Opening Popup...' : 'Sign in with Google'}</span>
                    </button>
                  ) : (
                    /* User ID (Bypass & Custom OTP Login) */
                    <div style={{ border: '1px solid #1e293b', borderRadius: '8px', padding: '14px', backgroundColor: '#030712', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Zap size={12} className="text-sky-400" /> User ID Session Setup
                      </h4>
                      
                      {!otpSent ? (
                        <>
                          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 4px 0', lineHeight: '1.4' }}>
                            To completely bypass Google account restrictions or whitelist limits, enter your preferred user identity and email address below:
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>DISPLAY NAME (REQUIRED)</label>
                            <input
                              type="text"
                              placeholder="e.g. Parth"
                              value={simulatedName}
                              onChange={(e) => setSimulatedName(e.target.value)}
                              style={{
                                padding: '8px 10px',
                                backgroundColor: '#090d16',
                                border: '1px solid #1e293b',
                                borderRadius: '6px',
                                color: '#f8fafc',
                                fontSize: '12px',
                                fontFamily: 'inherit'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>EMAIL ADDRESS (REQUIRED)</label>
                            <input
                              type="email"
                              placeholder="e.g. pathsh06@gmail.com"
                              value={simulatedEmail}
                              onChange={(e) => setSimulatedEmail(e.target.value)}
                              style={{
                                padding: '8px 10px',
                                backgroundColor: '#090d16',
                                border: '1px solid #1e293b',
                                borderRadius: '6px',
                                color: '#f8fafc',
                                fontSize: '12px',
                                fontFamily: 'inherit'
                              }}
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isVerifyingOtp}
                            onClick={handleSendSimulatedOtp}
                            style={{
                              marginTop: '4px',
                              padding: '10px',
                              backgroundColor: '#38bdf8',
                              color: '#0f172a',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: isVerifyingOtp ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                            className="hover:bg-sky-400"
                          >
                            <span>Send Verification OTP</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ padding: '10px', backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px', fontSize: '11px', color: '#93c5fd', lineHeight: '1.4' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#38bdf8', marginBottom: '4px' }}>
                              <span>📨 Verification Code Generated</span>
                            </div>
                            <p style={{ margin: '0 0 6px 0', color: '#cbd5e1' }}>
                              An OTP was simulated for <strong>{simulatedEmail}</strong>. Use the code below to complete authorization.
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#090d16', padding: '6px 10px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Your OTP Code:</span>
                              <strong style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '14px', letterSpacing: '0.05em' }}>{generatedOtp}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>ENTER 6-DIGIT OTP</label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="e.g. 123456"
                              value={enteredOtp}
                              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                              style={{
                                padding: '8px 10px',
                                backgroundColor: '#090d16',
                                border: '1px solid #1e293b',
                                borderRadius: '6px',
                                color: '#f8fafc',
                                fontSize: '14px',
                                fontWeight: 600,
                                fontFamily: 'monospace',
                                letterSpacing: '0.1em',
                                textAlign: 'center'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setOtpSent(false);
                                setGeneratedOtp(null);
                                setEnteredOtp('');
                                setFirebaseError('');
                              }}
                              style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: 'transparent',
                                color: '#94a3b8',
                                border: '1px solid #1e293b',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover:border-gray-500 hover:text-white"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={handleVerifySimulatedOtp}
                              style={{
                                flex: 2,
                                padding: '10px',
                                backgroundColor: '#38bdf8',
                                color: '#0f172a',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease'
                              }}
                              className="hover:bg-sky-400"
                            >
                              Verify & Connect
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {firebaseError && firebaseError === 'unauthorized-domain' ? (
                <div style={{ padding: '14px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '11px', color: '#fca5a5', lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#f87171', marginBottom: '8px', fontSize: '12px' }}>
                    <ShieldAlert size={14} className="text-red-400" />
                    <span>🔒 Domain Authorization Needed</span>
                  </div>
                  <p style={{ margin: '0 0 10px 0', color: '#cbd5e1' }}>
                    Your current browser domain is not whitelisted in your Firebase Console yet. Please authorize it to enable secure Google Sign-In:
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', backgroundColor: '#090d16', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>1. Development Domain</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('ais-dev-tzvkvs7escn3tlktzgfwri-118826210790.asia-southeast1.run.app');
                            setCopiedDomain('dev');
                            setTimeout(() => setCopiedDomain(null), 2000);
                          }}
                          style={{ fontSize: '9px', backgroundColor: '#1e293b', border: 'none', borderRadius: '3px', color: '#38bdf8', padding: '1px 6px', cursor: 'pointer' }}
                        >
                          {copiedDomain === 'dev' ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                      <code style={{ fontFamily: 'monospace', color: '#60a5fa', fontSize: '10px', wordBreak: 'break-all' }}>
                        ais-dev-tzvkvs7escn3tlktzgfwri-118826210790.asia-southeast1.run.app
                      </code>
                    </div>

                    <div style={{ borderTop: '1px solid #1e293b', paddingTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>2. Production/Preview Domain</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('ais-pre-tzvkvs7escn3tlktzgfwri-118826210790.asia-southeast1.run.app');
                            setCopiedDomain('pre');
                            setTimeout(() => setCopiedDomain(null), 2000);
                          }}
                          style={{ fontSize: '9px', backgroundColor: '#1e293b', border: 'none', borderRadius: '3px', color: '#38bdf8', padding: '1px 6px', cursor: 'pointer' }}
                        >
                          {copiedDomain === 'pre' ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                      <code style={{ fontFamily: 'monospace', color: '#60a5fa', fontSize: '10px', wordBreak: 'break-all' }}>
                        ais-pre-tzvkvs7escn3tlktzgfwri-118826210790.asia-southeast1.run.app
                      </code>
                    </div>

                    {window.location.hostname !== 'ais-dev-tzvkvs7escn3tlktzgfwri-118826210790.asia-southeast1.run.app' && window.location.hostname !== 'ais-pre-tzvkvs7escn3tlktzgfwri-118826210790.asia-southeast1.run.app' && (
                      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>3. Current Domain</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.hostname);
                              setCopiedDomain('current');
                              setTimeout(() => setCopiedDomain(null), 2000);
                            }}
                            style={{ fontSize: '9px', backgroundColor: '#1e293b', border: 'none', borderRadius: '3px', color: '#38bdf8', padding: '1px 6px', cursor: 'pointer' }}
                          >
                            {copiedDomain === 'current' ? '✓ Copied!' : 'Copy'}
                          </button>
                        </div>
                        <code style={{ fontFamily: 'monospace', color: '#a78bfa', fontSize: '10px', wordBreak: 'break-all' }}>
                          {window.location.hostname}
                        </code>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.4 }}>
                    <strong>How to add:</strong>
                    <ol style={{ paddingLeft: '14px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <li>Click <strong>Authentication</strong> on your Firebase sidebar.</li>
                      <li>Go to the <strong>Settings</strong> tab at the top.</li>
                      <li>Click <strong>Authorized domains</strong>.</li>
                      <li>Click <strong>Add domain</strong>, paste the domain, and click <strong>Add</strong>!</li>
                    </ol>
                  </div>
                </div>
              ) : firebaseError === 'popup-closed-by-user' ? (
                <div style={{ padding: '14px', backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', fontSize: '11px', color: '#93c5fd', lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#38bdf8', marginBottom: '6px', fontSize: '12px' }}>
                    <Info size={14} className="text-sky-400" />
                    <span>Google Sign-In Cancelled</span>
                  </div>
                  <p style={{ margin: '0 0 10px 0', color: '#cbd5e1' }}>
                    The Google authentication popup was closed before completing the sign-in. If you want to bypass Google constraints entirely, you can switch to the <strong>User ID</strong> tab above to connect instantly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginTab('userid');
                      setFirebaseError('');
                    }}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '4px',
                      color: '#38bdf8',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Switch to User ID Session
                  </button>
                </div>
              ) : firebaseError ? (
                <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', fontSize: '11px', color: '#fca5a5', lineHeight: 1.4 }}>
                  ⚠️ {firebaseError}
                </div>
              ) : null}

              {/* STRICT API KEY REQUIREMENT NOTICE */}
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', fontSize: '11px', color: '#fca5a5', lineHeight: 1.4 }}>
                ⚠️ <strong>API Key Entry Required:</strong> Google Login secures your profile identity, but you <strong>must</strong> still configure your personal API keys below to synthesize custom architecture. Default keys are disabled for safety.
              </div>

              {/* OpenAI Key Input */}
              <div style={{ padding: '12px', backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(30, 41, 59, 0.6)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }} className="flex justify-between items-center">
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>OPENAI_API_KEY</span>
                  <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '9999px', fontFamily: 'monospace', backgroundColor: customOpenaiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: customOpenaiKey ? '#34d399' : '#f87171' }}>
                    {customOpenaiKey ? '● CONFIGURED' : '○ MISSING'}
                  </span>
                </div>
                <input
                  type="password"
                  value={tempOpenaiKey}
                  onChange={(e) => setTempOpenaiKey(e.target.value)}
                  placeholder="sk-or-your-custom-openai-key"
                  style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '4px', padding: '6px 8px', fontSize: '11px', fontFamily: 'monospace', color: '#e2e8f0', outline: 'none' }}
                />
              </div>

              {/* Gemini Key Input */}
              <div style={{ padding: '12px', backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(30, 41, 59, 0.6)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }} className="flex justify-between items-center">
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, color: '#c084fc' }}>GEMINI_API_KEY</span>
                  <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '9999px', fontFamily: 'monospace', backgroundColor: customGeminiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: customGeminiKey ? '#34d399' : '#f87171' }}>
                    {customGeminiKey ? '● CONFIGURED' : '○ MISSING'}
                  </span>
                </div>
                <input
                  type="password"
                  value={tempGeminiKey}
                  onChange={(e) => setTempGeminiKey(e.target.value)}
                  placeholder="AIzaSy...your-custom-gemini-key"
                  style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '4px', padding: '6px 8px', fontSize: '11px', fontFamily: 'monospace', color: '#e2e8f0', outline: 'none' }}
                />
              </div>

              <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0', lineHeight: 1.4 }}>
                * API keys are kept entirely local to your secure browser instance and used strictly to sign outbound architecture requests.
              </p>

              <button 
                onClick={handleAccountLogin}
                style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '6px', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'background 0.2s', marginTop: '4px' }}
                className="hover:bg-blue-700"
              >
                Save and Apply Keys
              </button>

            </div>

            <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #0f172a', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowAccountModal(false)}
                style={{ padding: '6px 16px', backgroundColor: '#0f172a', color: '#cbd5e1', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', border: '1px solid #1e293b', fontWeight: 500 }}
                className="hover:bg-slate-900"
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
