import JSZip from 'jszip';
import { SIENNA_STRUCTURE } from '../data/structure';

declare global {
  interface Window {
    JSZip: any;
    saveAs: any;
  }
}

export const generateProjectZip = async (
  projectName: string, 
  costData: any, 
  uploadedFiles: Record<string, File>
) => {
  const zip = new window.JSZip();
  const rootFolder = zip.folder(projectName.replace(/\s+/g, '_'));

  // Recursive function to build tree
  const buildTree = (folder: any, structure: any, currentPath: string) => {
    if (Array.isArray(structure)) {
      structure.forEach(item => {
        if (typeof item === 'string') {
          // Check if user uploaded a file for this path
          // We simplify matching: if uploaded file name matches item name
          // In a real app, we'd map specific upload slots to specific paths.
          // Here, if the user uploaded "ARQ-01_Plantas.dwg", we place it.
          const fileName = item.split('/').pop() || item;
          const userFile = Object.values(uploadedFiles).find(f => f.name === fileName);
          
          if (userFile) {
            folder.file(fileName, userFile);
          } else {
            // Create placeholder
            folder.file(fileName, ""); 
          }
        } else {
          // It's a folder defined as object key? 
          // The structure provided is Object with Arrays. 
          // Subfolders inside arrays are just strings ending with / or needing inference?
          // The provided structure is flat arrays per category.
          // However, strings like "00_Bocetos/Sketchup/Modelo.skp" imply paths.
          // We need to parse paths.
        }
      });
    } else {
      Object.keys(structure).forEach(key => {
        const subFolder = folder.folder(key);
        // Handle the array of strings which might contain paths
        structure[key].forEach((filePath: string) => {
            const parts = filePath.split('/');
            let current = subFolder;
            
            // Iterate parts to create subfolders if needed
            for(let i=0; i<parts.length -1; i++) {
                current = current.folder(parts[i]);
            }
            
            const fileName = parts[parts.length-1];
            // Check for upload
            const userFile = Object.values(uploadedFiles).find(f => f.name === fileName);
            if (userFile) {
                current.file(fileName, userFile);
            } else {
                // If it ends with / it's a folder
                if (fileName !== "") {
                    current.file(fileName, ""); 
                }
            }
        });
      });
    }
  };

  buildTree(rootFolder, SIENNA_STRUCTURE, "");

  // Generate Budget CSV
  if (costData) {
    const csvContent = `PARTIDA,COSTO ESTIMADO
PRELIMINARES,${costData.preliminares.toFixed(2)}
CIMENTACION,${costData.cimentacion.toFixed(2)}
ESTRUCTURA,${costData.estructura.toFixed(2)}
ACABADOS,${costData.acabados.toFixed(2)}
INSTALACIONES,${costData.instalaciones.toFixed(2)}
TOTAL,${costData.total.toFixed(2)}`;
    
    // Look for 05_Costos folder to place it
    const costsFolder = rootFolder.folder("05_Costos");
    if (costsFolder) {
        costsFolder.file("PRESUPUESTO_SIENNA.csv", csvContent);
    }
  }

  // Generate readme
  rootFolder.file("README_SIENNA.txt", `Expediente generado por SIENNA OS v3.0\nProyecto: ${projectName}\nFecha: ${new Date().toLocaleDateString()}`);

  const content = await zip.generateAsync({ type: "blob" });
  window.saveAs(content, `${projectName}_Expediente_SIENNA.zip`);
};