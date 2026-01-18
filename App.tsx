
import React, { useState, useEffect, useRef } from 'react';
import { AppMode, MatchState } from './types';
import { syncService } from './services/syncService';
import { getMatchCommentary } from './services/geminiService';
import { QRCodeDisplay } from './components/QRCodeDisplay';

const INITIAL_STATE: MatchState = {
  teamA: { name: 'Local', score: 0, color: '#ef4444' },
  teamB: { name: 'Visitante', score: 0, color: '#3b82f6' },
  matchTitle: 'Partido en Vivo',
  lastUpdated: Date.now(),
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.SETUP);
  const [roomId, setRoomId] = useState<string>('');
  const [state, setState] = useState<MatchState>(INITIAL_STATE);
  const [commentary, setCommentary] = useState<string>('¡Bienvenidos al encuentro!');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'scores' | 'settings'>('scores');
  const [isSynced, setIsSynced] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  
  const lastUpdateRef = useRef<number>(Date.now());
  const pollingActiveRef = useRef<boolean>(true);

  // Detectar configuración desde la URL (Hash Routing es ideal para GitHub Pages)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      const params = new URLSearchParams(hash);
      const id = params.get('room');
      const role = params.get('role');

      if (id) {
        setRoomId(id);
        if (role === 'remote') {
          setMode(AppMode.REMOTE);
        } else {
          setMode(AppMode.BOARD);
        }
      } else {
        setMode(AppMode.SETUP);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Bucle de sincronización
  useEffect(() => {
    if (!roomId) return;

    pollingActiveRef.current = true;
    const interval = setInterval(async () => {
      if (!pollingActiveRef.current) return;
      
      const remoteState = await syncService.getState(roomId);
      
      if (remoteState) {
        setIsSynced(true);
        if (remoteState.lastUpdated > lastUpdateRef.current) {
          setState(remoteState);
          lastUpdateRef.current = remoteState.lastUpdated;
        }
      } else {
        setIsSynced(false);
      }
    }, 3000); 

    return () => {
      pollingActiveRef.current = false;
      clearInterval(interval);
    };
  }, [roomId]);

  // Comentarios de la IA
  useEffect(() => {
    if (mode === AppMode.BOARD && (state.teamA.score > 0 || state.teamB.score > 0)) {
      const fetchCommentary = async () => {
        const text = await getMatchCommentary(state);
        setCommentary(text);
      };
      const timeout = setTimeout(fetchCommentary, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state.teamA.score, state.teamB.score, mode]);

  const startMatch = async () => {
    setLoading(true);
    const newId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const firstState = { ...state, lastUpdated: Date.now() };
    
    const success = await syncService.saveState(newId, firstState);
    setIsSynced(success);
    
    setRoomId(newId);
    lastUpdateRef.current = firstState.lastUpdated;
    // Construimos la URL de navegación interna
    window.location.hash = `room=${newId}&role=board`;
    setLoading(false);
  };

  const updateGlobalState = async (newState: MatchState) => {
    const finalState = { ...newState, lastUpdated: Date.now() };
    setState(finalState);
    lastUpdateRef.current = finalState.lastUpdated;
    if (roomId) {
      const success = await syncService.saveState(roomId, finalState);
      setIsSynced(success);
    }
  };

  const updateScore = (team: 'A' | 'B', delta: number) => {
    const newState = { ...state };
    if (team === 'A') {
      newState.teamA.score = Math.max(0, newState.teamA.score + delta);
    } else {
      newState.teamB.score = Math.max(0, newState.teamB.score + delta);
    }
    updateGlobalState(newState);
  };

  // Generar URL completa para el control remoto
  const getRemoteUrl = () => {
    const baseUrl = window.location.href.split('#')[0];
    return `${baseUrl}#room=${roomId}&role=remote`;
  };

  const copyRemoteLink = () => {
    navigator.clipboard.writeText(getRemoteUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SyncBadge = () => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all ${isSynced ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
       <div className={`w-2 h-2 rounded-full ${isSynced ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
       <span className="text-[10px] font-black uppercase tracking-widest">{isSynced ? 'Sincronizado' : 'Error de Red'}</span>
    </div>
  );

  // --- RENDERING SETUP ---
  if (mode === AppMode.SETUP) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617]">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-blue-500/10 rounded-3xl mb-4">
              <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">LiveScore AI</h1>
            <p className="text-slate-400 text-sm mt-2">Crea un tablero sincronizado para cualquier deporte.</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] uppercase font-black text-slate-500 mb-2 tracking-widest">Título del Torneo</label>
              <input 
                type="text" 
                value={state.matchTitle}
                onChange={(e) => setState({ ...state, matchTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700 font-bold"
                placeholder="Nombre del evento..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-black text-slate-500 mb-2 tracking-widest">Equipo Local</label>
                <input 
                  type="text" 
                  value={state.teamA.name}
                  onChange={(e) => setState({ ...state, teamA: { ...state.teamA, name: e.target.value }})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:ring-2 focus:ring-red-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-black text-slate-500 mb-2 tracking-widest">Visitante</label>
                <input 
                  type="text" 
                  value={state.teamB.name}
                  onChange={(e) => setState({ ...state, teamB: { ...state.teamB, name: e.target.value }})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
            </div>
            <button 
              onClick={startMatch}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-blue-900/20 transition-all transform active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
            >
              {loading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : "INICIAR PARTIDO"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING BOARD ---
  if (mode === AppMode.BOARD) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between p-6 md:p-12 relative overflow-hidden font-inter">
        <div className="absolute top-6 right-6 z-20">
          <SyncBadge />
        </div>

        <div className="z-10 text-center w-full max-w-7xl">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-[0.3em] text-slate-600 mb-10 opacity-50">{state.matchTitle}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            <div className="score-gradient-1 rounded-[3rem] p-12 flex flex-col items-center shadow-2xl border border-white/5 relative overflow-hidden">
              <h2 className="text-4xl md:text-6xl font-black mb-6 uppercase text-white drop-shadow-2xl">{state.teamA.name}</h2>
              <div className="font-digital text-[180px] md:text-[320px] leading-none text-white drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                {state.teamA.score.toString().padStart(2, '0')}
              </div>
            </div>

            <div className="score-gradient-2 rounded-[3rem] p-12 flex flex-col items-center shadow-2xl border border-white/5 relative overflow-hidden">
              <h2 className="text-4xl md:text-6xl font-black mb-6 uppercase text-white drop-shadow-2xl">{state.teamB.name}</h2>
              <div className="font-digital text-[180px] md:text-[320px] leading-none text-white drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                {state.teamB.score.toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>

        <div className="z-10 w-full max-w-5xl mt-12 bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10 shadow-2xl">
          <div className="flex-1 text-center md:text-left">
             <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
               <span className="flex h-4 w-4 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-xs font-black uppercase tracking-widest text-emerald-500">IA EN VIVO</span>
             </div>
             <p className="text-2xl md:text-3xl font-bold text-white italic leading-snug">
               "{commentary}"
             </p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <QRCodeDisplay url={getRemoteUrl()} />
            <button 
              onClick={copyRemoteLink}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-700 transition-all flex items-center gap-2"
            >
              {copied ? '¡ENLACE COPIADO!' : 'COPIAR ENLACE DE CONTROL'}
              {!copied && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING REMOTE ---
  if (mode === AppMode.REMOTE) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col text-white font-inter">
        <header className="px-6 py-8 border-b border-slate-900 bg-slate-950/80 backdrop-blur-lg sticky top-0 z-30">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Mando de Control</h1>
              <p className="font-black text-xl truncate max-w-[180px] uppercase italic">{state.matchTitle}</p>
            </div>
            <SyncBadge />
          </div>
        </header>

        <div className="flex p-1.5 bg-slate-900/50 mx-6 mt-8 rounded-2xl border border-slate-800 shadow-inner">
          <button onClick={() => setActiveTab('scores')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'scores' ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500'}`}>Puntos</button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500'}`}>Ajustes</button>
        </div>

        <main className="flex-1 p-6 pb-24 overflow-y-auto">
          {activeTab === 'scores' ? (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {/* Equipo A */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[60px] rounded-full"></div>
                <div className="flex justify-between items-center mb-8">
                   <h2 className="text-3xl font-black italic uppercase text-red-500 tracking-tighter">{state.teamA.name}</h2>
                   <div className="text-7xl font-digital text-white drop-shadow-lg">{state.teamA.score}</div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => updateScore('A', -1)} className="w-20 aspect-square bg-slate-800 rounded-2xl flex items-center justify-center text-4xl border border-slate-700 active:scale-90 transition-transform">-</button>
                  <button onClick={() => updateScore('A', 1)} className="flex-1 bg-red-600 rounded-2xl flex items-center justify-center text-6xl font-black shadow-lg active:scale-95 transition-transform">+</button>
                </div>
              </div>

              {/* Equipo B */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full"></div>
                <div className="flex justify-between items-center mb-8">
                   <h2 className="text-3xl font-black italic uppercase text-blue-500 tracking-tighter">{state.teamB.name}</h2>
                   <div className="text-7xl font-digital text-white drop-shadow-lg">{state.teamB.score}</div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => updateScore('B', -1)} className="w-20 aspect-square bg-slate-800 rounded-2xl flex items-center justify-center text-4xl border border-slate-700 active:scale-90 transition-transform">-</button>
                  <button onClick={() => updateScore('B', 1)} className="flex-1 bg-blue-600 rounded-2xl flex items-center justify-center text-6xl font-black shadow-lg active:scale-95 transition-transform">+</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Editor</h3>
                <div className="space-y-4">
                  <input type="text" value={state.matchTitle} onChange={(e) => updateGlobalState({ ...state, matchTitle: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-bold outline-none" />
                  <input type="text" value={state.teamA.name} onChange={(e) => updateGlobalState({ ...state, teamA: { ...state.teamA, name: e.target.value }})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-bold outline-none border-l-4 border-l-red-500" />
                  <input type="text" value={state.teamB.name} onChange={(e) => updateGlobalState({ ...state, teamB: { ...state.teamB, name: e.target.value }})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-bold outline-none border-l-4 border-l-blue-500" />
                </div>
              </div>
              <button onClick={() => confirm("¿Resetear puntos?") && updateGlobalState({ ...state, teamA: { ...state.teamA, score: 0 }, teamB: { ...state.teamB, score: 0 }})} className="w-full py-5 bg-red-600/10 text-red-500 font-black rounded-2xl border border-red-500/30 uppercase tracking-widest text-xs">Resetear Puntos</button>
            </div>
          )}
        </main>

        <footer className="p-6 bg-slate-950/80 border-t border-slate-900 text-center sticky bottom-0 z-30 backdrop-blur-md">
           <p className="text-[10px] text-slate-600 font-mono tracking-widest font-bold uppercase">ID DE SESIÓN: {roomId}</p>
        </footer>
      </div>
    );
  }

  return null;
};

export default App;
