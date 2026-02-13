import React, { useState, useEffect } from 'react';
import { Terminal, FolderTree, Upload, Calculator, Download, AlertTriangle, CheckCircle, FileText, Activity, Info } from 'lucide-react';
import { calculate, FinishLevel } from './services/costService';
import { generateProjectZip } from './services/zipService';
import { SIENNA_STRUCTURE } from './data/structure';

type Phase = 'INIT' | 'STRUCTURE' | 'COST' | 'EXECUTION';

const App = () => {
  const [phase, setPhase] = useState<Phase>('INIT');
  const [projectData, setProjectData] = useState({ name: '', city: '', type: '' });
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [costParams, setCostParams] = useState<{ area: number; finishes: FinishLevel }>({ area: 0, finishes: 'Medio' });
  const [costResult, setCostResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>(["SIENNA OS v3.0 iniciado..."]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = { ...uploadedFiles };
      Array.from(e.target.files).forEach((file: File) => {
        newFiles[file.name] = file;
        addLog(`Archivo cargado: ${file.name}`);
      });
      setUploadedFiles(newFiles);
    }
  };

  const executeCostCalculation = () => {
    addLog(`Calculando costo paramétrico para ${costParams.area}m² - ${costParams.finishes}...`);
    const result = calculate(costParams.area, costParams.finishes);
    setCostResult(result);
    addLog(`Estimación completa. Total: $${result.total.toLocaleString('es-MX')}`);
  };

  const executeZipGeneration = async () => {
    addLog("Inicializando estructura de archivos del sistema...");
    addLog("Mapeando plantillas...");
    try {
      await generateProjectZip(projectData.name || "Proyecto_Sienna", costResult, uploadedFiles);
      addLog("ÉXITO: Expediente generado y descargado.");
    } catch (error) {
      addLog("ERROR: Falló la generación del zip.");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 flex flex-col md:flex-row gap-6">
      
      {/* Sidebar / Status Panel */}
      <div className="w-full md:w-1/4 flex flex-col gap-6">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-emerald-400 animate-pulse" />
            <h1 className="text-2xl font-bold text-white tracking-tighter">SIENNA OS</h1>
          </div>
          <div className="text-xs text-slate-400 mb-6 font-mono">v3.0 | SISTEMA OPERATIVO</div>
          
          <div className="space-y-4">
            <PhaseIndicator active={phase === 'INIT'} label="01. INICIALIZACIÓN" />
            <PhaseIndicator active={phase === 'STRUCTURE'} label="02. ESTRUCTURA" />
            <PhaseIndicator active={phase === 'COST'} label="03. COSTO PARAMÉTRICO" />
            <PhaseIndicator active={phase === 'EXECUTION'} label="04. EJECUCIÓN" />
          </div>
        </div>

        {/* Terminal Log */}
        <div className="bg-black/50 p-4 rounded-lg border border-slate-700 font-mono text-xs h-64 overflow-y-auto flex-grow">
          {logs.map((log, i) => (
            <div key={i} className="mb-1 text-emerald-500/80">{log}</div>
          ))}
          <div className="animate-pulse">_</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full md:w-3/4 bg-slate-800 rounded-lg border border-slate-700 shadow-2xl p-6 md:p-10 flex flex-col">
        
        {phase === 'INIT' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 mb-4">
              <h3 className="text-white font-bold flex items-center gap-2 mb-2">
                <Info size={18} className="text-blue-400"/> Bienvenido a SIENNA OS
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Este sistema centralizado gestiona el ciclo de vida de proyectos arquitectónicos. 
                A través de este flujo de trabajo, podrás estructurar automáticamente tus carpetas, 
                integrar archivos plantilla y realizar estimaciones de costos paramétricas para generar 
                un expediente de proyecto completo y estandarizado.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded text-blue-200 flex items-start gap-3">
              <AlertTriangle className="shrink-0" />
              <p className="text-sm">
                <strong>Nota:</strong> Se recomienda subir sus archivos plantilla (.dwg, .skp, .rvt) en el siguiente paso para asegurar la integridad del expediente. Si no se proporcionan, el sistema generará archivos marcadores de posición.
              </p>
            </div>

            <h2 className="text-xl font-semibold text-white">Configuración del Proyecto</h2>
            <div className="grid gap-4 max-w-md">
              <input 
                type="text" 
                placeholder="Nombre del Proyecto (ej. LEON_TORRE-NUBES)"
                className="bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-emerald-500 outline-none"
                value={projectData.name}
                onChange={e => setProjectData({...projectData, name: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Ciudad"
                className="bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-emerald-500 outline-none"
                value={projectData.city}
                onChange={e => setProjectData({...projectData, city: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Tipología (ej. Residencial, Comercial)"
                className="bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-emerald-500 outline-none"
                value={projectData.type}
                onChange={e => setProjectData({...projectData, type: e.target.value})}
              />
            </div>
            
            <button 
              onClick={() => {
                if(!projectData.name) {
                    addLog("Error: Se requiere el nombre del proyecto.");
                    return;
                }
                addLog(`Proyecto ${projectData.name} configurado.`);
                setPhase('STRUCTURE');
              }}
              className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded font-bold transition-all flex items-center gap-2"
            >
              Inicializar Sistema <Terminal size={18} />
            </button>
          </div>
        )}

        {phase === 'STRUCTURE' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FolderTree /> Arquitectura de Directorios
            </h2>
            <p className="text-slate-400 mb-6 text-sm">
              El sistema ha preconfigurado la siguiente estructura basada en los protocolos SIENNA.
              Sube tus plantillas base para mapearlas automáticamente a estas ubicaciones.
            </p>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
              {/* Upload Zone */}
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-emerald-500 transition-colors bg-slate-900/50">
                <Upload size={48} className="text-slate-500 mb-4" />
                <p className="text-slate-300 font-bold mb-2">Arrastra y Suelta Plantillas</p>
                <p className="text-xs text-slate-500 mb-4">Soportado: .dwg, .rvt, .skp, .xlsx</p>
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileUpload} 
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 text-sm text-slate-400"
                />
                <div className="mt-4 w-full text-left max-h-32 overflow-y-auto">
                  {Object.keys(uploadedFiles).map(name => (
                    <div key={name} className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle size={10} /> {name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Structure Preview */}
              <div className="bg-slate-900 rounded p-4 overflow-y-auto max-h-[400px] font-mono text-xs border border-slate-700">
                <StructurePreview data={SIENNA_STRUCTURE} />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setPhase('COST')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded font-bold transition-all flex items-center gap-2"
              >
                Siguiente: Costo Paramétrico <Calculator size={18} />
              </button>
            </div>
          </div>
        )}

        {phase === 'COST' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Calculator /> Estimación de Costo Paramétrico
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Área de Construcción (m²)</label>
                  <input 
                    type="number" 
                    value={costParams.area}
                    onChange={(e) => setCostParams({...costParams, area: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-emerald-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nivel de Acabados</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Básico', 'Medio', 'Lujo'] as FinishLevel[]).map(level => (
                      <button
                        key={level}
                        onClick={() => setCostParams({...costParams, finishes: level})}
                        className={`p-3 rounded border text-sm font-bold transition-all ${
                          costParams.finishes === level 
                          ? 'bg-emerald-600 border-emerald-500 text-white' 
                          : 'bg-slate-900 border-slate-600 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={executeCostCalculation}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded font-bold transition-all"
                >
                  Calcular Estimación
                </button>
              </div>

              {costResult && (
                <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
                  <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">Presupuesto Estimado</h3>
                  <div className="space-y-3 font-mono text-sm">
                    <CostRow label="Preliminares" value={costResult.preliminares} />
                    <CostRow label="Cimentación" value={costResult.cimentacion} />
                    <CostRow label="Estructura" value={costResult.estructura} />
                    <CostRow label="Acabados" value={costResult.acabados} />
                    <CostRow label="Instalaciones" value={costResult.instalaciones} />
                    <div className="border-t border-slate-700 pt-3 mt-4">
                      <CostRow label="TOTAL ESTIMADO" value={costResult.total} isTotal />
                      <div className="text-right text-xs text-slate-500 mt-1">
                        Unitario: ${costResult.unitario.toLocaleString('es-MX', {maximumFractionDigits: 2})} / m²
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between items-center border-t border-slate-700 pt-6">
              <button 
                onClick={() => setPhase('EXECUTION')} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                Omitir Estimación
              </button>
              <button 
                onClick={() => setPhase('EXECUTION')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold transition-all flex items-center gap-2"
              >
                Proceder a Ejecución <FileText size={18} />
              </button>
            </div>
          </div>
        )}

        {phase === 'EXECUTION' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center h-full text-center">
            <FileText size={64} className="text-emerald-500 mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Listo para Ejecutar</h2>
            <p className="text-slate-400 max-w-md mb-8">
              SIENNA OS generará ahora la estructura completa de archivos, integrará tus plantillas
              y compilará el análisis de costos en un archivo ZIP completo.
            </p>
            
            <button 
              onClick={executeZipGeneration}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center gap-3 shadow-lg hover:shadow-emerald-500/20"
            >
              <Download /> Generar y Descargar Expediente
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

// Sub-components

const PhaseIndicator = ({ active, label }: { active: boolean, label: string }) => (
  <div className={`flex items-center gap-3 transition-colors ${active ? 'text-emerald-400' : 'text-slate-600'}`}>
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`} />
    <span className="font-mono text-sm font-bold">{label}</span>
  </div>
);

const CostRow = ({ label, value, isTotal = false }: { label: string, value: number, isTotal?: boolean }) => (
  <div className={`flex justify-between items-center ${isTotal ? 'text-emerald-400 font-bold text-base' : 'text-slate-300'}`}>
    <span>{label}</span>
    <span>${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
  </div>
);

const StructurePreview = ({ data, level = 0 }: { data: any, level?: number }) => {
  return (
    <div style={{ marginLeft: level * 12 }}>
      {Object.keys(data).map(key => {
        if (Array.isArray(data[key])) {
          return (
            <div key={key}>
              <div className="text-blue-400 font-bold flex items-center gap-1">
                <FolderTree size={10} /> {key}
              </div>
              <div className="ml-3 border-l border-slate-700 pl-2">
                {data[key].map((item: string, idx: number) => (
                  <div key={idx} className="text-slate-500 py-0.5 hover:text-slate-300">
                    {item.endsWith('/') ? `📂 ${item}` : `📄 ${item}`}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default App;