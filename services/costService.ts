import { SIENNA_PRICES_CSV } from "../data/pricesCsv";

export type FinishLevel = 'Básico' | 'Medio' | 'Lujo';

interface CostItem {
  clave: string;
  concepto: string;
  unidad: string;
  precio: number;
}

// Simple CSV parser
const parseCSV = (csvText: string): CostItem[] => {
  const lines = csvText.split('\n');
  const items: CostItem[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;
    
    // Parse line respecting quotes
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            cols.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    cols.push(current);

    // Clean up quotes from columns
    const cleanedCols = cols.map(col => {
        const trimmed = col.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            return trimmed.slice(1, -1).replace(/""/g, '"');
        }
        return trimmed;
    });

    if (cleanedCols.length >= 4) {
      items.push({
        clave: cleanedCols[0],
        concepto: cleanedCols[1],
        unidad: cleanedCols[2],
        precio: parseFloat(cleanedCols[3])
      });
    }
  }
  return items;
};

const items = parseCSV(SIENNA_PRICES_CSV);

export const calculate = (area: number, level: FinishLevel) => {
  // Define assembly costs based on extracted keys from the CSV
  // These are derived from unit prices * inferred quantities per m2 of construction
  
  // 1. Preliminares (Despalme, Trazo)
  const p_despalme = items.find(i => i.clave === "UEC.ED.10.100.1010")?.precio || 66.69;
  const p_trazo = items.find(i => i.clave === "UEC.ED.12.100.1010")?.precio || 10.28;
  const cost_preliminares = (p_despalme + p_trazo) * 1.1; // +10% overhead

  // 2. Cimentación (Excavación, Plantilla, Concreto)
  const p_excavacion = items.find(i => i.clave === "UEC.ED.12.105.1010")?.precio || 148.20;
  const p_concreto_cim = items.find(i => i.clave === "UEC.ED.16.115.1005.1")?.precio || 2936.10;
  // Assume 0.4 m3 exc/m2 and 0.1 m3 conc/m2
  const cost_cimentacion = (p_excavacion * 0.4) + (p_concreto_cim * 0.1);

  // 3. Estructura (Muros, Losas)
  // Muro Tabique (Medio/Lujo) vs Block (Basico)
  const p_muro_tabique = items.find(i => i.clave === "UEC.ED.30.135.1050")?.precio || 464.23;
  const p_muro_block = items.find(i => i.clave === "UEC.ED.30.150.1010.1")?.precio || 384.03;
  
  const p_losa = items.find(i => i.clave === "UEC.ED.20.135.1010.1")?.precio || 928.25;

  let unit_muro = level === 'Básico' ? p_muro_block : p_muro_tabique;
  // Factor: 2.5 m2 wall per 1 m2 floor
  const cost_estructura = (unit_muro * 2.5) + (p_losa * 1.0);

  // 4. Acabados (Pisos, Yeso, Pintura)
  const p_aplanado = items.find(i => i.clave === "UEC.ED.30.205.1110")?.precio || 153.10;
  const p_piso = items.find(i => i.clave === "UEC.ED.78.110.1010")?.precio || 455.51;
  const p_pintura = items.find(i => i.clave === "UEC.ED.78.145.1010")?.precio || 105.57;

  let multiplier = level === 'Básico' ? 1 : level === 'Medio' ? 1.3 : 1.8;
  
  // 2.5m2 walls + 1m2 ceiling for aplanado/pintura
  const cost_acabados = ((p_aplanado + p_pintura) * 3.5) + (p_piso * 1.0);
  
  // 5. Instalaciones (Estimated as % of total)
  // Usually 15-20%
  
  let subtotal = (cost_preliminares + cost_cimentacion + cost_estructura + cost_acabados);
  
  // Apply level multiplier to finishes and structure slightly
  subtotal = subtotal * multiplier;

  const cost_instalaciones = subtotal * 0.20;
  
  const total_directo = subtotal + cost_instalaciones;
  const indirectos = total_directo * 0.25; // 25% indirects + profit

  const total_unit = total_directo + indirectos;

  return {
    preliminares: cost_preliminares * area,
    cimentacion: cost_cimentacion * area * multiplier,
    estructura: cost_estructura * area,
    acabados: cost_acabados * area * multiplier,
    instalaciones: cost_instalaciones * area,
    total: total_unit * area,
    unitario: total_unit
  };
};