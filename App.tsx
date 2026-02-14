import React, { useState, useRef, useEffect } from 'react';
import { Terminal, FolderTree, Calculator, Download, FileText, Activity, Info, CheckCircle, Send, Bot, User, Grid } from 'lucide-react';
import { calculate, FinishLevel, BudgetResult } from './services/costService';
import { generateProjectZip } from './services/zipService';
import { getDynamicStructure } from './data/structure';

type Phase = 'INIT' | 'STRUCTURE' | 'COST' | 'EXECUTION';

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
}

const App = () => {
  const [phase, setPhase] = useState<Phase>('INIT');
  
  // Project State
  const [projectData, setProjectData] = useState({ name: '', city: '', type: 'General' });
  const [generatedStructure, setGeneratedStructure] = useState<any>(null);
  
  // Cost State
  const [costParams, setCostParams] = useState<{ area: number; finishes: FinishLevel }>({ area: 0, finishes: 'Medio' });
  const [costResult, setCostResult] = useState<BudgetResult | null>(null);
  const [logs, setLogs] = useState<string[]>(["SIENNA OS v3.0 iniciado..."]);

  // Chatbot State (Init Phase)
  const [initChatHistory, setInitChatHistory] = useState<ChatMessage[]>([
    { role: 'bot', text: 'Bienvenido a SIENNA OS. Soy tu arquitecto asistente. ¿Cómo se llamará tu nuevo proyecto y dónde se ubicará? (Ej. "Casa Las Lomas en CDMX")' }
  ]);
  const [initChatInput, setInitChatInput] = useState("");
  const initChatEndRef = useRef<HTMLDivElement>(null);

  // Chatbot State (Cost Phase)
  const [costChatHistory, setCostChatHistory] = useState<ChatMessage[]>([
    { role: 'bot', text: 'Ahora definamos los costos. ¿Tienes alguna preferencia de materiales? (Ej: Pisos de mármol, muros de block, etc.)' }
  ]);
  const [costChatInput, setCostChatInput] = useState("");
  const costChatEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

  // Scroll logic
  useEffect(() => { initChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [initChatHistory]);
  useEffect(() => { costChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [costChatHistory]);

  // --- INIT CHAT LOGIC ---
  const handleSendInitMessage = () => {
    if (!initChatInput.trim()) return;
    const userMsg = initChatInput;
    setInitChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setInitChatInput("");

    // Simulated NLP for Init
    setTimeout(() => {
        let botReply = "¿Podrías darme más detalles? ¿Es obra nueva, remodelación o proyecto público?";
        const lowerMsg = userMsg.toLowerCase();
        
        // Extract Name/City rudimentarily if not set
        if (!projectData.name) {
           // Assume first capitalized words might be name, or just take the whole string if short
           if (lowerMsg.includes("casa") || lowerMsg.includes("torre") || lowerMsg.includes("proyecto")) {
               setProjectData(prev => ({ ...prev, name: userMsg.split(' ')[0] + "_" + Math.floor(Math.random()*100) })); 
           }
        }

        // Logic branching
        if (lowerMsg.includes("remodelación") || lowerMsg.includes("remodelacion")) {
             setProjectData(prev => ({ ...prev, type: 'Remodelación' }));
             botReply = "Entendido, configuraré la estructura para una REMODELACIÓN. Se añadirán carpetas para levantamientos críticos y demoliciones.";
        } else if (lowerMsg.includes("pública") || lowerMsg.includes("publica") || lowerMsg.includes("gobierno")) {
             setProjectData(prev => ({ ...prev, type: 'Obra Pública' }));
             botReply = "Configurando entorno para OBRA PÚBLICA. Se añadirán carpetas para Licitación, Bitácora Electrónica y Normativa aplicable.";
        } else if (lowerMsg.includes("casa") || lowerMsg.includes("departamento")) {
             setProjectData(prev => ({ ...prev, type: 'Residencial' }));
             botReply = "Perfecto, un proyecto Residencial. ¿Cuántos metros cuadrados aproximados estimas?";
        } else if (lowerMsg.includes("m2") || !isNaN(Number(userMsg))) {
             // Try to catch area in this chat
             const numbers = userMsg.match(/\d+/);
             if (numbers) {
                 setCostParams(prev => ({...prev, area: Number(numbers[0])}));
                 botReply = `Registrado ${numbers[0]} m². Puedes inicializar el proyecto cuando estés listo.`;
             }
        }
        
        setInitChatHistory(prev => [...prev, { role: 'bot', text: botReply }]);
    }, 600);
  };

  const finalizeInit = () => {
     if (!projectData.name) {
         setProjectData(prev => ({ ...prev, name: "PROYECTO_SIN_NOMBRE" }));
     }
     // Generate context string for structure generator
     const context = `${projectData.type} ${initChatHistory.map(m => m.text).join(' ')}`;
     const struct = getDynamicStructure(context);
     setGeneratedStructure(struct);
     addLog(`Estructura generada para: ${projectData.type}`);
     setPhase('STRUCTURE');
  };

  // --- COST CHAT LOGIC ---
  const handleSendCostMessage = () => {
    if (!costChatInput.trim()) return;
    const userMsg = costChatInput;
    setCostChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setCostChatInput("");

    setTimeout(() => {
        let botReply = "Entendido, anotado.";
        const lowerMsg = userMsg.toLowerCase();
        if (lowerMsg.includes("marmol") || lowerMsg.includes("mármol")) botReply = "He actualizado ACABADOS: Mármol Travertino.";
        else if (lowerMsg.includes("madera") || lowerMsg.includes("laminado")) botReply = "Perfecto, piso laminado tipo madera considerado.";
        else if (lowerMsg.includes("block")) botReply = "Ajustando estructura para Block de concreto.";
        
        setCostChatHistory(prev => [...prev, { role: 'bot', text: botReply }]);
    }, 600);
  };

  const executeCostCalculation = () => {
    const fullContext = costChatHistory.filter(m => m.role === 'user').map(m => m.text).join(" ");
    addLog(`Calculando presupuesto para ${costParams.area}m²...`);
    const result = calculate(costParams.area, costParams.finishes, fullContext);
    setCostResult(result);
    addLog(`Total estimado: $${result.total.toLocaleString('es-MX')}`);
  };

  const executeZipGeneration = async () => {
    addLog("Generando ZIP...");
    try {
      await generateProjectZip(projectData.name || "Proyecto_Sienna", generatedStructure, costResult!, {});
      addLog("Descarga iniciada.");
    } catch (error) {
      addLog("ERROR en generación.");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-2 md:p-6 flex flex-col md:flex-row gap-4">
      
      {/* Sidebar */}
      <div className="w-full md:w-1/4 flex flex-col gap-4">
        <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tighter">SIENNA OS</h1>
          </div>
          <div className="text-xs text-slate-400 mb-6 font-mono">v3.2 | SISTEMA INTELIGENTE</div>
          
          <div className="space-y-2">
            {(['INIT', 'STRUCTURE', 'COST', 'EXECUTION'] as Phase[]).map((p, idx) => (
                <button key={p} onClick={() => setPhase(p)} className="w-full text-left hover:bg-slate-800/50 p-2 rounded transition-colors">
                    <PhaseIndicator active={phase === p} label={`0${idx+1}. ${p === 'INIT' ? 'INICIALIZACIÓN' : p === 'COST' ? 'PRESUPUESTO' : p === 'STRUCTURE' ? 'ESTRUCTURA' : 'EJECUCIÓN'}`} />
                </button>
            ))}
          </div>
        </div>

        {/* Console */}
        <div className="bg-black/60 p-4 rounded-lg border border-slate-700 font-mono text-xs h-48 md:h-auto md:flex-grow overflow-y-auto shadow-inner">
          {logs.map((log, i) => <div key={i} className="mb-1 text-emerald-500/80 break-words">{log}</div>)}
          <div className="animate-pulse">_</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full md:w-3/4 bg-slate-800 rounded-lg border border-slate-700 shadow-2xl p-4 md:p-8 flex flex-col min-h-[600px]">
        
        {/* PHASE 1: INITIALIZATION WITH CHAT */}
        {phase === 'INIT' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col md:flex-row gap-6">
            
            {/* Left: Live Data Preview */}
            <div className="w-full md:w-1/3 flex flex-col gap-4">
               <h3 className="text-white font-bold flex items-center gap-2"><Info size={18} className="text-blue-400"/> Datos del Proyecto</h3>
               <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600 text-sm space-y-3">
                  <div>
                      <span className="text-slate-400 block text-xs uppercase">Nombre</span>
                      <input value={projectData.name} onChange={e => setProjectData({...projectData, name: e.target.value})} className="bg-transparent border-b border-slate-500 w-full text-white focus:border-emerald-500 outline-none pb-1" placeholder="Pendiente..."/>
                  </div>
                  <div>
                      <span className="text-slate-400 block text-xs uppercase">Tipo</span>
                      <div className="text-emerald-400 font-bold">{projectData.type}</div>
                  </div>
                  {costParams.area > 0 && (
                      <div>
                          <span className="text-slate-400 block text-xs uppercase">Área Estimada</span>
                          <div className="text-white">{costParams.area} m²</div>
                      </div>
                  )}
               </div>
               <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                   <p className="text-xs text-slate-400 mb-2">El sistema detectará el tipo de obra y ajustará las carpetas automáticamente.</p>
               </div>
               <button onClick={finalizeInit} className="mt-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded font-bold transition-all flex items-center justify-center gap-2">
                 Inicializar <Terminal size={18} />
               </button>
            </div>

            {/* Right: Init Chatbot */}
            <div className="w-full md:w-2/3 flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center gap-2">
                    <Bot size={16} className="text-emerald-400"/>
                    <span className="text-sm font-bold text-white">Asistente de Configuración</span>
                </div>
                <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-black/20">
                    {initChatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={initChatEndRef} />
                </div>
                <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
                    <input 
                        type="text" 
                        value={initChatInput}
                        onChange={(e) => setInitChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendInitMessage()}
                        placeholder="Ej. Es una remodelación de oficinas de gobierno..." 
                        className="flex-grow bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                    <button onClick={handleSendInitMessage} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded">
                        <Send size={16} />
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* PHASE 2: STRUCTURE PREVIEW */}
        {phase === 'STRUCTURE' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FolderTree /> Estructura Generada: <span className="text-emerald-400">{projectData.type}</span>
            </h2>
            <div className="flex-grow bg-slate-900 rounded p-6 overflow-y-auto max-h-[500px] font-mono text-sm border border-slate-700 shadow-inner mb-6">
              {generatedStructure ? (
                  <StructurePreview data={generatedStructure} />
              ) : (
                  <div className="text-slate-500">Debes inicializar el proyecto primero.</div>
              )}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setPhase('COST')} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded font-bold transition-all flex items-center gap-2">
                Siguiente: Costos <Calculator size={18} />
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: COST WITH CHAT */}
        {phase === 'COST' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col md:flex-row gap-6">
            {/* Left Controls */}
            <div className="w-full md:w-1/2 flex flex-col gap-4">
               <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Calculator /> Presupuesto</h2>
               <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600 space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase">Superficie (m²)</label>
                    <input type="number" value={costParams.area} onChange={(e) => setCostParams({...costParams, area: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase">Nivel Acabados</label>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {(['Básico', 'Medio', 'Lujo'] as FinishLevel[]).map(level => (
                        <button key={level} onClick={() => setCostParams({...costParams, finishes: level})} className={`p-2 rounded text-xs font-bold border ${costParams.finishes === level ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>{level}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={executeCostCalculation} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded font-bold transition-all">
                    Calcular
                  </button>
               </div>
               {costResult && (
                 <div className="flex-grow bg-slate-900 p-4 rounded-lg border border-slate-700 overflow-y-auto max-h-[300px]">
                    <div className="flex justify-between items-end border-b border-slate-700 pb-2 mb-2">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-xl font-bold text-emerald-400">${costResult.total.toLocaleString('es-MX',{maximumFractionDigits:0})}</span>
                    </div>
                    <div className="space-y-2">
                       {Array.from(new Set(costResult.breakdown.map(i => i.partida))).map(partida => {
                          const subTotal = costResult.breakdown.filter(i => i.partida === partida).reduce((acc, curr) => acc + curr.importe, 0);
                          return (
                            <div key={partida} className="text-sm">
                               <div className="flex justify-between text-slate-300 font-semibold bg-slate-800/50 px-2 py-1 rounded"><span>{partida}</span><span>${subTotal.toLocaleString('es-MX', {maximumFractionDigits:0})}</span></div>
                               <div className="pl-4 mt-1 space-y-1">
                                  {Array.from(new Set(costResult.breakdown.filter(i => i.partida === partida).map(i => i.subpartida))).map(sub => (
                                     <div key={sub} className="text-xs text-slate-500 flex items-center gap-1"><div className="w-1 h-1 bg-slate-600 rounded-full"></div> {sub}</div>
                                  ))}
                               </div>
                            </div>
                          )
                       })}
                    </div>
                 </div>
               )}
            </div>
            {/* Right Cost Chat */}
            <div className="w-full md:w-1/2 flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center gap-2">
                    <Bot size={16} className="text-blue-400"/>
                    <span className="text-sm font-bold text-white">Asistente de Materiales</span>
                </div>
                <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-black/20">
                    {costChatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>{msg.text}</div>
                        </div>
                    ))}
                    <div ref={costChatEndRef} />
                </div>
                <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
                    <input type="text" value={costChatInput} onChange={(e) => setCostChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendCostMessage()} placeholder="Ej. Quiero piso de mármol..." className="flex-grow bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    <button onClick={handleSendCostMessage} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded"><Send size={16} /></button>
                </div>
                {costResult && (
                    <div className="p-3 border-t border-slate-700 bg-emerald-900/10">
                        <button onClick={() => setPhase('EXECUTION')} className="w-full bg-white text-emerald-900 font-bold py-2 rounded text-sm hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">Aprobar <CheckCircle size={14}/></button>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* PHASE 4: EXECUTION */}
        {phase === 'EXECUTION' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center h-full text-center">
            <FileText size={64} className="text-emerald-500 mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Expediente Listo</h2>
            <p className="text-slate-400 max-w-md mb-8">El sistema ha compilado la estructura de carpetas personalizada para <strong>{projectData.type}</strong> y el presupuesto estimado.</p>
            <button onClick={executeZipGeneration} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center gap-3 shadow-lg hover:shadow-emerald-500/20"><Download /> Descargar Expediente</button>
          </div>
        )}

      </div>
    </div>
  );
};

const PhaseIndicator = ({ active, label }: { active: boolean, label: string }) => (
  <div className={`flex items-center gap-3 transition-colors ${active ? 'text-emerald-400' : 'text-slate-600'}`}>
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`} />
    <span className="font-mono text-xs font-bold">{label}</span>
  </div>
);

const StructurePreview = ({ data, level = 0 }: { data: any, level?: number }) => {
  return (
    <div style={{ marginLeft: level * 12 }}>
      {Object.keys(data).map(key => {
        const content = data[key];
        const isArray = Array.isArray(content);
        return (
          <div key={key} className="mb-2">
            <div className="text-blue-400 font-bold flex items-center gap-2 text-xs"><FolderTree size={14} /> {key}</div>
            {isArray ? (
              <div className="ml-4 border-l border-slate-700 pl-3 mt-1 space-y-1">
                {content.map((subItem: string, idx: number) => (
                  <div key={idx} className="text-slate-500 text-xs flex items-center gap-2"><div className="w-1 h-1 bg-slate-600 rounded-full"></div>{subItem}</div>
                ))}
              </div>
            ) : (<div className="mt-1"><StructurePreview data={content} level={level + 1} /></div>)}
          </div>
        );
      })}
    </div>
  );
}

export default App;