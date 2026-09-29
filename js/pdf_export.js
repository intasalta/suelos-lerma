/**
 * Módulo de Exportación a PDF para Fichas Técnicas de Suelo
 * Utiliza jsPDF y jsPDF-AutoTable
 */

function exportSoilPDF(serieData, ucData, capUsoData, practicasData) {
  if (!window.jspdf) {
    alert("Cargando librerías de PDF, por favor intente nuevamente en unos segundos.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [27, 67, 50]; // #1b4332 Verde INTA
  const secondaryColor = [71, 85, 105]; // Slate

  const serieName = serieData ? serieData.nombre : (ucData ? ucData.suelo_1 : 'Suelo');
  const ucName = ucData ? (ucData.nombre || ucData.simbolo) : (serieData?.unidades_asociadas?.length ? `Unidades: ${serieData.unidades_asociadas.join(', ')}` : 'Valle de Lerma');
  const ucSimb = ucData ? ucData.simbolo : (serieData?.unidades_asociadas?.join(', ') || '-');

  // --- ENCABEZADO INSTITUCIONAL ---
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 24, 'F');

  // Insertar Logo Oficial de INTA
  if (window.LOGO_INTA_BASE64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 3.5, 17, 17, 1.5, 1.5, 'F');
      doc.addImage(window.LOGO_INTA_BASE64, 'PNG', 12.5, 4, 16, 16);
    } catch (err) {
      console.warn("No se pudo cargar el logo en PDF:", err);
    }
  }

  const textStartX = window.LOGO_INTA_BASE64 ? 33 : 14;

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text("INTA - ESTACIÓN EXPERIMENTAL AGROPECUARIA SALTA", textStartX, 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text("SISTEMA DE INFORMACIÓN DE SUELOS DEL VALLE DE LERMA", textStartX, 16);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 168, 16);

  let y = 32;

  // --- TÍTULO DE LA FICHA ---
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`FICHA TÉCNICA: SERIE ${serieName.toUpperCase()}`, 14, y);
  y += 6;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  if (ucData) {
    doc.text(`Unidad Cartográfica: ${ucSimb} - ${ucName}`, 14, y);
  } else if (serieData?.unidades_asociadas?.length) {
    doc.text(`Unidades Cartográficas donde participa en el mapa: ${serieData.unidades_asociadas.join(', ')}`, 14, y);
  } else {
    doc.text(`Cartas de Suelos del Valle de Lerma (Salta)`, 14, y);
  }
  y += 8;

  // --- RECUADRO DE DATOS GENERALES / TAXONOMÍA ---
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 36, 2, 2, 'FD');

  const col1 = 18;
  const col2 = 75;
  const col3 = 135;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  let py = y + 6;
  doc.text("TAXONOMÍA USDA:", col1, py);
  doc.setFont('helvetica', 'normal');
  doc.text(`${serieData?.subgrupo_usda || ucData?.subgr_usda || 'S/D'}`, col1 + 32, py);

  py += 6;
  doc.setFont('helvetica', 'bold');
  doc.text("ORDEN:", col1, py);
  doc.setFont('helvetica', 'normal');
  doc.text(`${serieData?.orden || 'S/D'}`, col1 + 16, py);

  doc.setFont('helvetica', 'bold');
  doc.text("SUBORDEN:", col2, py);
  doc.setFont('helvetica', 'normal');
  doc.text(`${serieData?.suborden || 'S/D'}`, col2 + 20, py);

  doc.setFont('helvetica', 'bold');
  doc.text("GRAN GRUPO:", col3, py);
  doc.setFont('helvetica', 'normal');
  doc.text(`${serieData?.gran_grupo || 'S/D'}`, col3 + 24, py);

  py += 7;
  doc.setFont('helvetica', 'bold');
  doc.text("CAPACIDAD USO:", col1, py);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(194, 65, 12);
  const capUsoVal = ucData?.cap_uso || serieData?.capacidad_uso_sugerida || serieData?.perfil_ambiental?.clasif_utilitaria || 'S/D';
  doc.text(`${capUsoVal}`, col1 + 28, py);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text("ÍNDICE PROD. (IPC):", col2, py);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  const ipcVal = (ucData && ucData.ipc !== null && ucData.ipc !== undefined) ? String(ucData.ipc) : '-';
  doc.text(`${ipcVal}`, col2 + 32, py);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text("TIPO UC / ASOC.:", col3, py);
  doc.setFont('helvetica', 'normal');
  doc.text(`${ucData?.tipo || (serieData?.unidades_asociadas?.length ? 'Componente UCs' : 'Serie pura')}`, col3 + 26, py);

  py += 7;
  const perf = serieData?.perfil_ambiental;
  doc.setFont('helvetica', 'bold');
  doc.text("PAISAJE / RELIEVE:", col1, py);
  doc.setFont('helvetica', 'normal');
  doc.text(`${perf?.paisaje || '-'} | Relieve: ${perf?.relieve || '-'}`, col1 + 32, py);

  y += 42;

  // --- DESCRIPCIÓN MORFOLÓGICA GENERAL ---
  if (serieData?.descripcion) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text("DESCRIPCIÓN DE LA SERIE Y AMBIENTE:", 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const splitDesc = doc.splitTextToSize(serieData.descripcion, 182);
    doc.text(splitDesc, 14, y);
    y += (splitDesc.length * 4.2) + 6;
  }

  // --- TABLA DE HORIZONTES ANALÍTICOS ---
  const horizs = serieData?.horizontes || [];
  if (horizs.length > 0 && doc.autoTable) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text("PERFIL TÍPICO - HORIZONTES Y ANÁLISIS FÍSICO-QUÍMICOS:", 14, y);
    y += 4;

    const head = [["Horiz.", "Prof. (cm)", "Descrip. / Color", "Arcilla %", "Limo %", "Arena %", "pH", "MO %", "P ppm", "CIC"]];
    const body = horizs.map(h => [
      h.horizonte || '-',
      `${h.desde ?? 0} - ${h.hasta ?? ''}`,
      (h.descripcion || '').substring(0, 45) + (h.descripcion?.length > 45 ? '...' : ''),
      h.arcilla ?? '-',
      h.limo ?? '-',
      h.arena ?? '-',
      h.ph ?? '-',
      h.mat_org ?? '-',
      h.fosforo_ppm ?? '-',
      h.cic ?? '-'
    ]);

    doc.autoTable({
      startY: y,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 14 },
        1: { halign: 'center', cellWidth: 18 },
        2: { cellWidth: 62 },
        3: { halign: 'right', cellWidth: 14 },
        4: { halign: 'right', cellWidth: 14 },
        5: { halign: 'right', cellWidth: 14 },
        6: { halign: 'right', cellWidth: 11 },
        7: { halign: 'right', cellWidth: 11 },
        8: { halign: 'right', cellWidth: 12 },
        9: { halign: 'right', cellWidth: 12 }
      },
      margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 8;
  } else {
    // Si la serie no tiene análisis de laboratorio (como La Bolsa)
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, 182, 14, 2, 2, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Nota edafológica: La serie ${serieName} cuenta con descripción morfogenética de campo; los análisis físico-químicos de laboratorio no formaron parte del muestreo analítico en la carta original.`, 18, y + 8);
    y += 20;
  }

  // --- CAPACIDAD DE USO Y PRÁCTICAS RECOMENDADAS ---
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  if (capUsoData) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text(`APTITUD AGRONÓMICA - CAPACIDAD DE USO (CLASE ${capUsoData.clase}):`, 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitCU = doc.splitTextToSize(capUsoData.descripcion || 'Sin descripción', 182);
    doc.text(splitCU, 14, y);
    y += (splitCU.length * 3.8) + 6;
  }

  // Prácticas recomendadas asociadas
  if (practicasData && practicasData.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryColor);
    doc.text("PRÁCTICAS DE MANEJO Y CONSERVACIÓN RECOMENDADAS:", 14, y);
    y += 5;

    doc.setFontSize(7.5);
    practicasData.slice(0, 4).forEach((p, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`• ${p.nombre}:`, 16, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const prText = doc.splitTextToSize(p.descripcion || '', 170);
      doc.text(prText, 20, y + 3.5);
      y += (prText.length * 3.2) + 5;
    });
  }

  // --- PIE DE PÁGINA ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Fuente: Adecuación a SIG de Cartas de Suelos del Valle de Lerma (Salta, 2012) - Castrillo, Osinaga, Elena, Paoli. INTA EEA Salta.",
      14,
      290
    );
    doc.text(`Página ${i} de ${totalPages}`, 180, 290);
  }

  // Descargar archivo PDF
  const filename = `Ficha_Suelo_${serieName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

window.exportSoilPDF = exportSoilPDF;
