import { SIENNA_PRICES_CSV } from "../data/pricesCsv";

export type FinishLevel = 'Básico' | 'Medio' | 'Lujo';

interface CostItem {
  clave: string;
  concepto: string;
  unidad: string;
  precio: number;
}

export interface BudgetLineItem {
  partida: string;
  subpartida: string; // New field
  clave: string;
  concepto: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface BudgetResult {
  breakdown: BudgetLineItem[];
  preliminares: number;
  cimentacion: number;
  estructura: number;
  acabados: number;
  instalaciones: number;
  total: number;
  unitario: number;
}

const parseCSV = (csvText: string): CostItem[] => {
  const lines = csvText.split('\n');
  const items: CostItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { cols.push(current); current = ''; }
        else current += char;
    }
    cols.push(current);
    const cleanedCols = cols.map(col => {
        const trimmed = col.trim();
        return (trimmed.startsWith('"') && trimmed.endsWith('"')) ? trimmed.slice(1, -1).replace(/""/g, '"') : trimmed;
    });
    if (cleanedCols.length >= 4) {
      items.push({ clave: cleanedCols[0], concepto: cleanedCols[1], unidad: cleanedCols[2], precio: parseFloat(cleanedCols[3]) });
    }
  }
  return items;
};

const items = parseCSV(SIENNA_PRICES_CSV);
const findItem = (clave: string) => items.find(i => i.clave === clave) || { clave, concepto: 'ITEM NO ENCONTRADO', unidad: 'pza', precio: 0 };

export const calculate = (area: number, level: FinishLevel, preferences: string = ""): BudgetResult => {
  const breakdown: BudgetLineItem[] = [];
  const prefs = preferences.toLowerCase();

  const addItem = (partida: string, subpartida: string, clave: string, quantityCalc: number, conceptOverride?: string) => {
    const dbItem = findItem(clave);
    const qty = quantityCalc;
    const total = qty * dbItem.precio;
    
    breakdown.push({
      partida,
      subpartida,
      clave: dbItem.clave,
      concepto: conceptOverride || dbItem.concepto,
      unidad: dbItem.unidad,
      cantidad: qty,
      precioUnitario: dbItem.precio,
      importe: total
    });
    return total;
  };

  // --- 1. PRELIMINARES ---
  let sum_preliminares = 0;
  sum_preliminares += addItem("1. PRELIMINARES", "TERRACERÍAS", "UEC.ED.10.100.1010", area * 0.6);
  sum_preliminares += addItem("1. PRELIMINARES", "TOPOGRAFÍA", "UEC.ED.12.100.1010", area * 0.6);

  // --- 2. CIMENTACION ---
  let sum_cimentacion = 0;
  sum_cimentacion += addItem("2. CIMENTACIÓN", "EXCAVACIONES", "UEC.ED.12.105.1010", area * 0.4);
  sum_cimentacion += addItem("2. CIMENTACIÓN", "PLANTILLAS", "UEC.ED.16.100.1010.1", area * 0.3);
  sum_cimentacion += addItem("2. CIMENTACIÓN", "CONCRETOS", "UEC.ED.16.115.1005.1", area * 0.15);

  // --- 3. ESTRUCTURA ---
  let sum_estructura = 0;
  
  // Logic for Walls based on Chat/Level
  let muroClave = "UEC.ED.30.135.1050"; // Default Tabique
  let muroDesc = "Muro de Tabique Rojo";
  
  if (prefs.includes("block") || prefs.includes("bloque")) {
      muroClave = "UEC.ED.30.150.1010.1";
      muroDesc = "Muro de Block (Solicitud Cliente)";
  } else if (prefs.includes("termico") || prefs.includes("térmico") || prefs.includes("hebel")) {
      muroClave = "UEC.ED.30.150.1010.2";
      muroDesc = "Muro Térmico Ligero (Solicitud Cliente)";
  } else if (level === 'Básico') {
      muroClave = "UEC.ED.30.150.1010.1";
      muroDesc = "Muro de Block (Estándar Básico)";
  }

  sum_estructura += addItem("3. ESTRUCTURA", "ALBAÑILERÍA MUROS", muroClave, area * 2.2, muroDesc);
  
  // Logic for Slabs
  let losaClave = "UEC.ED.20.135.1010.1"; // Vigueta
  if (prefs.includes("losa maciza") || prefs.includes("concreto solido")) {
      losaClave = "UEC.ED.20.135.1010.2";
  }
  sum_estructura += addItem("3. ESTRUCTURA", "LOSAS Y ENTREPISOS", losaClave, area);
  
  // Castillos
  sum_estructura += addItem("3. ESTRUCTURA", "ELEMENTOS VERTICALES", "UEC.ED.18.145.1010.1", area * 0.4);

  // --- 4. ACABADOS ---
  let sum_acabados = 0;
  
  // Pisos
  let pisoClave = "UEC.ED.78.110.1010"; // Ceramic
  let pisoDesc = "Piso Cerámico";
  
  if (prefs.includes("marmol") || prefs.includes("mármol") || prefs.includes("piedra")) {
      pisoClave = "UEC.ED.78.110.1020";
      pisoDesc = "Piso de Mármol Travertino (Solicitud Cliente)";
  } else if (prefs.includes("laminado") || prefs.includes("madera") || prefs.includes("duela")) {
      pisoClave = "UEC.ED.78.110.1030";
      pisoDesc = "Piso Laminado (Solicitud Cliente)";
  } else if (level === 'Lujo') {
      pisoClave = "UEC.ED.78.110.1020"; // Auto upgrade for Luxury
      pisoDesc = "Piso de Mármol (Estándar Lujo)";
  }

  sum_acabados += addItem("4. ACABADOS", "PISOS Y FIRMES", pisoClave, area * 1.05, pisoDesc);
  
  // Aplanados
  let aplanadoClave = "UEC.ED.30.205.1110"; // Cemento arena
  if (prefs.includes("yeso") || level === 'Lujo') {
      aplanadoClave = "UEC.ED.30.205.1120";
  }
  sum_acabados += addItem("4. ACABADOS", "RECUBRIMIENTOS MUROS", aplanadoClave, (area * 2.2 * 2));
  
  sum_acabados += addItem("4. ACABADOS", "PINTURA", "UEC.ED.78.145.1010", (area * 2.2 * 2) + area);
  sum_acabados += addItem("4. ACABADOS", "OBRA EXTERIOR", "UEC.UB.10.105.1005.1", area * 0.1);

  // --- 5. INSTALACIONES ---
  let sum_instalaciones = 0;
  // Estimate exits based on area. Approx 1 exit per 3 m2 for electric, 1 per 10m2 for hydro
  sum_instalaciones += addItem("5. INSTALACIONES", "HIDROSANITARIA", "UEC.ED.38.100.1010", Math.ceil(area / 10));
  sum_instalaciones += addItem("5. INSTALACIONES", "ELÉCTRICA", "UEC.ED.46.102.1010", Math.ceil(area / 3));

  const costoDirecto = sum_preliminares + sum_cimentacion + sum_estructura + sum_acabados + sum_instalaciones;
  const porcentajeIndirectos = 0.25;
  const total = costoDirecto * (1 + porcentajeIndirectos);

  return {
    breakdown,
    preliminares: sum_preliminares,
    cimentacion: sum_cimentacion,
    estructura: sum_estructura,
    acabados: sum_acabados,
    instalaciones: sum_instalaciones,
    total: total,
    unitario: total / (area || 1)
  };
};