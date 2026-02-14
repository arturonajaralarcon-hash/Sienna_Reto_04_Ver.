import JSZip from 'jszip';
import { BudgetResult } from './costService';

declare global {
  interface Window {
    JSZip: any;
    saveAs: any;
  }
}

export const generateProjectZip = async (
  projectName: string, 
  structure: any, // Accepts dynamic structure
  costData: BudgetResult, 
  uploadedFiles: Record<string, File>
) => {
  const zip = new window.JSZip();
  const rootFolder = zip.folder(projectName.replace(/\s+/g, '_'));

  // Recursive function to build tree
  const buildTree = (folder: any, currentStructure: any) => {
    if (Array.isArray(currentStructure)) {
      currentStructure.forEach(item => {
        if (typeof item === 'string') {
          const parts = item.split('/');
          let current = folder;
          parts.forEach((part: string) => {
             current = current.folder(part);
          });
        }
      });
    } else {
      Object.keys(currentStructure).forEach(key => {
        const subFolder = folder.folder(key);
        buildTree(subFolder, currentStructure[key]);
      });
    }
  };

  buildTree(rootFolder, structure);

  // Generate Summarized Budget CSV (Partidas and Subpartidas only)
  if (costData && costData.breakdown) {
    let csvContent = "PARTIDA,SUBPARTIDA,IMPORTE_ESTIMADO\n";
    
    // Aggregate data by Partida -> Subpartida
    const aggregation: Record<string, Record<string, number>> = {};

    costData.breakdown.forEach(item => {
        if (!aggregation[item.partida]) {
            aggregation[item.partida] = {};
        }
        if (!aggregation[item.partida][item.subpartida]) {
            aggregation[item.partida][item.subpartida] = 0;
        }
        aggregation[item.partida][item.subpartida] += item.importe;
    });

    // Write sorted rows
    const partidas = Object.keys(aggregation).sort();
    partidas.forEach(partida => {
        const subpartidas = Object.keys(aggregation[partida]).sort();
        subpartidas.forEach(sub => {
            const amount = aggregation[partida][sub];
            csvContent += `${partida},${sub},${amount.toFixed(2)}\n`;
        });
    });

    csvContent += `\nRESUMEN GENERAL,,\n`;
    csvContent += `COSTO DIRECTO,,"$${(costData.total / 1.25).toFixed(2)}"\n`;
    csvContent += `INDIRECTOS Y UTILIDAD (25%),,"$${(costData.total - (costData.total / 1.25)).toFixed(2)}"\n`;
    csvContent += `TOTAL PRESUPUESTO,,"$${costData.total.toFixed(2)}"\n`;
    
    const costsFolder = rootFolder.folder("05_Costos_y_Presupuestos");
    if (costsFolder) {
        costsFolder.file("PRESUPUESTO_SIENNA_PARTIDAS.csv", csvContent);
    }
  }

  rootFolder.file("LEAME_SIENNA.txt", `Expediente generado por SIENNA OS v3.0\nProyecto: ${projectName}\nFecha: ${new Date().toLocaleDateString()}\n\nEl archivo CSV en la carpeta 05 contiene el resumen de costos agrupado por partidas y subpartidas.`);

  const content = await zip.generateAsync({ type: "blob" });
  window.saveAs(content, `${projectName}_Estructura_SIENNA.zip`);
};