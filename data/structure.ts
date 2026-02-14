const MASTER_STRUCTURE = {
    "00_Insumos": [
        "00_Cotizacion",
        "01_Referencias",
        "02_Normativa"
    ],
    "01_Anteproyecto": [
        "00_Memoria_Descriptiva",
        "01_Levantamiento",
        "02_Bocetos/Sketchup",
        "02_Bocetos/Diagramas",
        "03_Maquetas/Fotos",
        "03_Maquetas/Editables",
        "04_Presentacion_Cliente"
    ],
    "02_Ejecutivo_Arquitectonico": [
        "01_Planos_Generales",
        "02_Albañilerias",
        "03_Acabados",
        "04_Carpinterias",
        "05_Herrerias",
        "06_Cancelerias",
        "07_Obra_Exterior"
    ],
    "03_Ejecutivo_Estructural": [
        "01_Memorias_Calculo",
        "02_Cimentacion",
        "03_Estructura_Principal",
        "04_Losas_y_Entrepisos",
        "05_Detalles_Estructurales"
    ],
    "04_Ejecutivo_Instalaciones": [
        "01_Electrico/Memorias",
        "01_Electrico/Planos",
        "02_Hidrosanitario/Memorias",
        "02_Hidrosanitario/Planos",
        "03_Voz_y_Datos",
        "04_Aire_Acondicionado",
        "05_Especiales"
    ],
    "05_Costos_y_Presupuestos": [
        "01_Fichas_Tecnicas",
        "02_Cotizaciones_Proveedores",
        "03_Generadores_Obra",
        "04_Analisis_Precios_Unitarios"
    ],
    "06_Visualizacion": [
        "01_Modelo_3D",
        "02_Renders_Proceso",
        "03_Renders_Finales",
        "04_Recorrido_Virtual"
    ],
    "07_Legal_y_Permisos": [
        "01_Escrituras",
        "02_Licencia_Construccion",
        "03_Contratos"
    ]
};

export const getDynamicStructure = (context: string) => {
    // Deep copy to avoid mutating the master
    const structure: any = JSON.parse(JSON.stringify(MASTER_STRUCTURE));
    const ctx = context.toLowerCase();

    // LOGIC: OBRA PUBLICA
    if (ctx.includes('publica') || ctx.includes('gobierno') || ctx.includes('licitacion')) {
        structure["00_Insumos"].push("03_Bases_Licitacion");
        structure["00_Insumos"].push("04_Junta_Aclaraciones");
        structure["07_Legal_y_Permisos"].push("04_Bitacora_Obra_Publica");
        structure["07_Legal_y_Permisos"].push("05_Acta_Entrega_Recepcion");
        
        // Add specific folder for reports
        structure["08_Reportes_Dependencia"] = [
            "01_Estimaciones",
            "02_Reporte_Fotografico",
            "03_Notas_Bitacora"
        ];
    }

    // LOGIC: REMODELACION / INTERIORES
    if (ctx.includes('remodelacion') || ctx.includes('interior') || ctx.includes('remodelación')) {
        // En remodelación, la estructura pesada a veces no aplica igual, pero el levantamiento es critico
        structure["01_Anteproyecto"].push("00_Estado_Actual_Fotografico");
        structure["01_Anteproyecto"].push("01_Levantamiento_Critico_Instalaciones");
        
        // Remove Despalme logic folder conceptually (though keep generic structural folder)
        structure["02_Ejecutivo_Arquitectonico"].push("08_Desmontajes_y_Demoliciones");
    }

    return structure;
};
