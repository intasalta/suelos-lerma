/**
 * Aplicación Principal - Visor de Suelos del Valle de Lerma
 */

let appData = null;
let currentSelectedFeature = null;
let currentSelectedProfile = null;
let currentAnalyticsView = 'full'; // 'full', 'fisica', 'quimica', 'cambio'
let textureChart = null;
let chemChart = null;

function formatCapUso(val) {
  if (!val || val === 'None' || val === 'null') return '-';
  return String(val).replace(/_/g, '-');
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Iniciar mapa
  const map = window.mapModule.initMap();

  // 2. Cargar datos alfanuméricos consolidados
  try {
    const res = await fetch('data/suelos_info.json');
    appData = await res.json();
    console.log("Datos de suelos cargados:", appData);
    populateSeriesCatalog();
    populateSearchSuggestions();
  } catch (err) {
    console.error("Error al cargar data/suelos_info.json:", err);
  }

  // 3. Cargar capa GeoJSON en el mapa
  await window.mapModule.loadSoilLayer('data/suelos_valle_lerma.geojson');

  // 4. Configurar eventos de UI
  setupUIEvents();
});

// Configurar eventos de la interfaz
function setupUIEvents() {
  // Selector de variable temática
  const themeSelect = document.getElementById('thematic-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      window.mapModule.setThematic(e.target.value);
    });
  }

  // Selector de mapa base
  const basemapSelect = document.getElementById('basemap-select');
  if (basemapSelect) {
    basemapSelect.addEventListener('change', (e) => {
      window.mapModule.setBaseMap(e.target.value);
    });
  }

  // Buscador de texto
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  if (searchInput && searchBtn) {
    const doSearch = () => {
      const q = searchInput.value.trim();
      if (q) {
        const found = window.mapModule.findAndHighlight(q);
        if (!found) {
          alert(`No se encontró ninguna unidad o serie que coincida con "${q}". Pruebe con "Cerrillos", "Ce3", "CoBar", etc.`);
        }
      }
    };
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  }

  // Botón GPS
  const gpsBtn = document.getElementById('gps-btn');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      window.mapModule.locateUser();
    });
  }

  // Botón Cerrar Sidebar
  const closeSidebarBtn = document.getElementById('close-sidebar-btn');
  const sidebar = document.getElementById('sidebar');
  if (closeSidebarBtn && sidebar) {
    closeSidebarBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // Botón Maximizar / Restaurar Sidebar
  const toggleMaxBtn = document.getElementById('toggle-maximize-sidebar-btn');
  const maxText = document.getElementById('sb-max-text');
  if (toggleMaxBtn && sidebar) {
    toggleMaxBtn.addEventListener('click', () => {
      const isMax = sidebar.classList.toggle('maximized');
      const icon = toggleMaxBtn.querySelector('i');
      if (icon) {
        if (isMax) {
          icon.className = 'fa-solid fa-compress text-amber-400';
          if (maxText) maxText.textContent = 'Reducir';
          toggleMaxBtn.title = 'Restaurar tamaño original';
        } else {
          icon.className = 'fa-solid fa-expand text-amber-400';
          if (maxText) maxText.textContent = 'Ampliar';
          toggleMaxBtn.title = 'Maximizar o restaurar tamaño de la ficha';
        }
      }
      setTimeout(() => {
        if (textureChart) textureChart.resize();
        if (chemChart) chemChart.resize();
      }, 260);
    });

    const sbHeader = sidebar.querySelector('.p-4.bg-slate-900');
    if (sbHeader) {
      sbHeader.style.cursor = 'default';
      sbHeader.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        toggleMaxBtn.click();
      });
    }
  }

  // Pestañas del Sidebar
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('border-emerald-700', 'text-emerald-800', 'font-bold');
        b.classList.add('border-transparent', 'text-gray-500');
      });
      btn.classList.add('border-emerald-700', 'text-emerald-800', 'font-bold');
      btn.classList.remove('border-transparent', 'text-gray-500');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      const activeContent = document.getElementById(`tab-content-${tabTarget}`);
      if (activeContent) activeContent.classList.remove('hidden');

      // Si se activa tab de gráficos, redimensionar
      if (tabTarget === 'graficos') {
        if (textureChart) textureChart.resize();
        if (chemChart) chemChart.resize();
      }
    });
  });

  // Función común para descargar el PDF del suelo seleccionado
  const downloadSelectedSoilPDF = () => {
    if (!currentSelectedFeature) return;
    const p = currentSelectedFeature.properties || {};
    const nomencla = (p.nomencla || '').trim();
    const s1 = (p.suelo_1 || '').trim();

    const ucData = appData?.unidades_cartograficas?.[nomencla] || {
      simbolo: nomencla,
      nombre: p.suelo_1,
      suelo_1: s1,
      ipc: p.ipc,
      cap_uso: p.cap_uso,
      subgr_usda: p.grangrup
    };

    const serieData = appData?.series?.[s1] || {
      nombre: s1,
      orden: p.orden,
      gran_grupo: p.grangrup,
      horizontes: []
    };

    const cuClase = ucData.cap_uso || p.cap_uso;
    const capUsoData = appData?.capacidad_uso?.[cuClase];

    let practicas = [];
    if (capUsoData && capUsoData.practicas_ids && appData?.practicas_recomendadas) {
      practicas = capUsoData.practicas_ids.map(id => appData.practicas_recomendadas[id]).filter(Boolean);
    }

    window.exportSoilPDF(serieData, ucData, capUsoData, practicas, currentSelectedProfile);
  };

  // Botones de descarga de PDF en el sidebar (superior e inferior)
  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  const topDownloadPdfBtn = document.getElementById('sb-top-download-pdf-btn');
  if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', downloadSelectedSoilPDF);
  if (topDownloadPdfBtn) topDownloadPdfBtn.addEventListener('click', downloadSelectedSoilPDF);

  // Botones de selector de vista analítica (Completa / Física / Química / Cationes)
  document.querySelectorAll('.view-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-filter-btn').forEach(b => {
        b.classList.remove('active', 'bg-white', 'text-emerald-900', 'shadow-sm');
        b.classList.add('hover:text-slate-900');
      });
      btn.classList.add('active', 'bg-white', 'text-emerald-900', 'shadow-sm');
      btn.classList.remove('hover:text-slate-900');
      currentAnalyticsView = btn.getAttribute('data-view') || 'full';
      if (currentSelectedProfile) {
        renderHorizontesTable(currentSelectedProfile.horizontes || [], currentAnalyticsView);
      }
    });
  });

  // Control Solo Bordes / Transparente
  const toggleBordersBtn = document.getElementById('toggle-borders-btn');
  const checkBordersLegend = document.getElementById('check-borders-legend');
  let isOnlyBorders = false;

  const setBordersState = (state) => {
    isOnlyBorders = state;
    window.mapModule.toggleOnlyBorders(isOnlyBorders);
    if (toggleBordersBtn) {
      if (isOnlyBorders) {
        toggleBordersBtn.classList.add('bg-emerald-700', 'text-white', 'border-emerald-800');
        toggleBordersBtn.classList.remove('bg-slate-100', 'text-slate-700', 'border-slate-300');
      } else {
        toggleBordersBtn.classList.remove('bg-emerald-700', 'text-white', 'border-emerald-800');
        toggleBordersBtn.classList.add('bg-slate-100', 'text-slate-700', 'border-slate-300');
      }
    }
    if (checkBordersLegend) {
      checkBordersLegend.checked = isOnlyBorders;
    }
  };

  if (toggleBordersBtn) {
    toggleBordersBtn.addEventListener('click', () => setBordersState(!isOnlyBorders));
  }
  if (checkBordersLegend) {
    checkBordersLegend.addEventListener('change', (e) => setBordersState(e.target.checked));
  }

  // Slider de Opacidad
  const opacitySlider = document.getElementById('opacity-slider');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      window.mapModule.setLayerOpacity(e.target.value);
    });
  }

  // Modales sin desenfoque (Catálogo y Acerca de)
  const catalogModal = document.getElementById('catalog-modal');
  const openCatalogBtn = document.getElementById('open-catalog-btn');
  const closeCatalogBtn = document.getElementById('close-catalog-btn');

  if (openCatalogBtn && catalogModal) {
    openCatalogBtn.addEventListener('click', () => {
      catalogModal.classList.add('active');
      populateSeriesCatalog();
    });
  }
  if (closeCatalogBtn && catalogModal) {
    closeCatalogBtn.addEventListener('click', () => catalogModal.classList.remove('active'));
  }

  const aboutModal = document.getElementById('about-modal');
  const openAboutBtn = document.getElementById('open-about-btn');
  const closeAboutBtn = document.getElementById('close-about-btn');
  const understandAboutBtn = document.getElementById('understand-about-btn');

  if (openAboutBtn && aboutModal) {
    openAboutBtn.addEventListener('click', () => aboutModal.classList.add('active'));
  }
  if (closeAboutBtn && aboutModal) {
    closeAboutBtn.addEventListener('click', () => aboutModal.classList.remove('active'));
  }
  if (understandAboutBtn && aboutModal) {
    understandAboutBtn.addEventListener('click', () => aboutModal.classList.remove('active'));
  }

  // Cerrar modales al hacer clic en el fondo oscuro
  [catalogModal, aboutModal].forEach(m => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.remove('active');
      });
    }
  });

  // Cerrar modales con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (catalogModal) catalogModal.classList.remove('active');
      if (aboutModal) aboutModal.classList.remove('active');
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('open');
    }
  });

  // Escuchar cuando el usuario hace clic en un polígono en el mapa
  window.addEventListener('soilSelected', (e) => {
    currentSelectedFeature = e.detail.feature;
    displaySoilDetails(currentSelectedFeature);
  });
}

// Actualizar factores ambientales en la pestaña Serie
function renderEnvironmentalFactors(prof, isNonSoil, nomencla) {
  const env = prof || {};
  document.getElementById('sb-paisaje').textContent = env.paisaje || (isNonSoil ? '-' : '-');
  document.getElementById('sb-relieve').textContent = env.relieve || '-';
  document.getElementById('sb-pendiente').textContent = env.pendiente_pct ? `${env.pendiente_pct}%` : '-';
  document.getElementById('sb-material').textContent = env.material_originario || '-';
  document.getElementById('sb-vegetacion').textContent = env.vegetacion || '-';
  document.getElementById('sb-drenaje').textContent = env.drenaje || '-';
  document.getElementById('sb-permeabilidad').textContent = env.permeabilidad || '-';
  document.getElementById('sb-limitacion').textContent = env.limitacion_principal || (isNonSoil ? 'Uso urbano / Hidrología' : '-');
  document.getElementById('sb-uso-tierra').textContent = env.uso_tierra || (isNonSoil ? nomencla : '-');
}

// Banner informativo del perfil actualmente seleccionado
function updateActiveProfileBanner(profile) {
  const hojaEl = document.getElementById('prof-info-hoja');
  const ubicEl = document.getElementById('prof-info-ubic');
  const extraEl = document.getElementById('prof-info-extra');

  if (hojaEl) hojaEl.textContent = profile?.hoja ? `Hoja: ${profile.hoja}` : 'Valle de Lerma';
  if (ubicEl) ubicEl.textContent = profile?.ubicacion ? `Sitio: ${profile.ubicacion}` : 'Relevamiento típico';
  if (extraEl) {
    const hCount = (profile?.horizontes || []).length;
    extraEl.textContent = hCount > 0 ? `${hCount} horizontes con analítica` : 'Sin analítica de laboratorio';
  }
}

// Renderizar tabla analítica según la vista seleccionada y tarjetas morfológicas
function renderHorizontesTable(horizs, view = 'full') {
  const thead = document.getElementById('sb-horizontes-thead');
  const tbody = document.getElementById('sb-horizontes-tbody');
  const descContainer = document.getElementById('horizontes-desc-list');
  if (!tbody || !thead) return;

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!horizs || horizs.length === 0) {
    thead.innerHTML = '<tr><th class="py-2 px-3 text-center">Horizontes</th></tr>';
    tbody.innerHTML = '<tr><td class="text-center py-6 text-slate-500 italic">No se registran datos analíticos de laboratorio para este perfil típico en la base oficial.</td></tr>';
    if (descContainer) descContainer.innerHTML = '<p class="text-slate-400 italic text-xs">No se dispone de notas morfológicas de campo para este elemento.</p>';
    return;
  }

  // 1. Configurar columnas del thead según view
  let headerHtml = '';
  if (view === 'full') {
    headerHtml = `
      <tr>
        <th class="sticky left-0 bg-slate-100 z-10 text-emerald-950">Horiz</th>
        <th class="text-center">Prof (cm)</th>
        <th class="text-right">Arc %</th>
        <th class="text-right">Lim %</th>
        <th class="text-right">Are %</th>
        <th class="text-right">pH</th>
        <th class="text-right">MO %</th>
        <th class="text-right">CO %</th>
        <th class="text-right">N %</th>
        <th class="text-right">P (ppm)</th>
        <th class="text-right">CE</th>
        <th class="text-right">CaCO3 %</th>
        <th class="text-right">Ca++</th>
        <th class="text-right">Mg++</th>
        <th class="text-right">Na+</th>
        <th class="text-right">K+</th>
        <th class="text-right">Suma B.</th>
        <th class="text-right">CIC</th>
        <th class="text-right">PSB %</th>
        <th class="text-right">PSI %</th>
      </tr>
    `;
  } else if (view === 'fisica') {
    headerHtml = `
      <tr>
        <th class="text-emerald-950">Horiz</th>
        <th class="text-center">Profundidad (cm)</th>
        <th class="text-right">Arcilla %</th>
        <th class="text-right">Limo %</th>
        <th class="text-right">Arena %</th>
        <th class="text-right">pH pasta</th>
        <th class="text-right">Materia Orgánica %</th>
      </tr>
    `;
  } else if (view === 'quimica') {
    headerHtml = `
      <tr>
        <th class="text-emerald-950">Horiz</th>
        <th class="text-center">Prof (cm)</th>
        <th class="text-right">pH</th>
        <th class="text-right">MO %</th>
        <th class="text-right">Carb. Org. %</th>
        <th class="text-right">Nitrógeno %</th>
        <th class="text-right">P (ppm)</th>
        <th class="text-right">CE (mmhos/cm)</th>
        <th class="text-right">Carbonatos %</th>
      </tr>
    `;
  } else if (view === 'cambio') {
    headerHtml = `
      <tr>
        <th class="text-emerald-950">Horiz</th>
        <th class="text-center">Prof (cm)</th>
        <th class="text-right">Ca++</th>
        <th class="text-right">Mg++</th>
        <th class="text-right">Na+</th>
        <th class="text-right">K+</th>
        <th class="text-right">Suma Bases</th>
        <th class="text-right">CIC</th>
        <th class="text-right">PSB %</th>
        <th class="text-right">PSI %</th>
      </tr>
    `;
  }
  thead.innerHTML = headerHtml;

  // 2. Rellenar filas del tbody
  horizs.forEach(h => {
    const tr = document.createElement('tr');
    const profStr = `${h.desde ?? 0} - ${h.hasta ?? (h.hasta_raw || '+')}`;

    if (view === 'full') {
      tr.innerHTML = `
        <td class="font-bold text-emerald-900 sticky left-0 bg-white shadow-sm">${h.horizonte || '-'}</td>
        <td class="text-center whitespace-nowrap font-mono text-[11px]">${profStr}</td>
        <td class="text-right">${h.arcilla ?? '-'}</td>
        <td class="text-right">${h.limo ?? '-'}</td>
        <td class="text-right">${h.arena ?? '-'}</td>
        <td class="text-right font-medium text-emerald-800">${h.ph ?? '-'}</td>
        <td class="text-right font-medium text-amber-800">${h.mat_org ?? '-'}</td>
        <td class="text-right">${h.carb_org ?? '-'}</td>
        <td class="text-right">${h.nitrogeno ?? '-'}</td>
        <td class="text-right font-medium">${h.fosforo_ppm ?? '-'}</td>
        <td class="text-right">${h.conductividad ?? '-'}</td>
        <td class="text-right">${h.carbonatos ?? '-'}</td>
        <td class="text-right">${h.ca ?? '-'}</td>
        <td class="text-right">${h.mg ?? '-'}</td>
        <td class="text-right">${h.na ?? '-'}</td>
        <td class="text-right">${h.k ?? '-'}</td>
        <td class="text-right font-medium">${h.suma_bases ?? '-'}</td>
        <td class="text-right font-medium text-blue-900">${h.cic ?? '-'}</td>
        <td class="text-right">${h.t_psb ?? '-'}</td>
        <td class="text-right">${h.psi ?? '-'}</td>
      `;
    } else if (view === 'fisica') {
      tr.innerHTML = `
        <td class="font-bold text-emerald-900">${h.horizonte || '-'}</td>
        <td class="text-center whitespace-nowrap font-mono text-[11px]">${profStr}</td>
        <td class="text-right font-medium text-orange-900">${h.arcilla ?? '-'}</td>
        <td class="text-right font-medium text-amber-800">${h.limo ?? '-'}</td>
        <td class="text-right font-medium text-sky-800">${h.arena ?? '-'}</td>
        <td class="text-right font-medium text-emerald-800">${h.ph ?? '-'}</td>
        <td class="text-right font-medium">${h.mat_org ?? '-'}</td>
      `;
    } else if (view === 'quimica') {
      tr.innerHTML = `
        <td class="font-bold text-emerald-900">${h.horizonte || '-'}</td>
        <td class="text-center whitespace-nowrap font-mono text-[11px]">${profStr}</td>
        <td class="text-right font-medium text-emerald-800">${h.ph ?? '-'}</td>
        <td class="text-right font-medium text-amber-800">${h.mat_org ?? '-'}</td>
        <td class="text-right">${h.carb_org ?? '-'}</td>
        <td class="text-right">${h.nitrogeno ?? '-'}</td>
        <td class="text-right font-medium text-indigo-900">${h.fosforo_ppm ?? '-'}</td>
        <td class="text-right">${h.conductividad ?? '-'}</td>
        <td class="text-right">${h.carbonatos ?? '-'}</td>
      `;
    } else if (view === 'cambio') {
      tr.innerHTML = `
        <td class="font-bold text-emerald-900">${h.horizonte || '-'}</td>
        <td class="text-center whitespace-nowrap font-mono text-[11px]">${profStr}</td>
        <td class="text-right">${h.ca ?? '-'}</td>
        <td class="text-right">${h.mg ?? '-'}</td>
        <td class="text-right">${h.na ?? '-'}</td>
        <td class="text-right">${h.k ?? '-'}</td>
        <td class="text-right font-medium">${h.suma_bases ?? '-'}</td>
        <td class="text-right font-medium text-blue-900">${h.cic ?? '-'}</td>
        <td class="text-right">${h.t_psb ?? '-'}</td>
        <td class="text-right">${h.psi ?? '-'}</td>
      `;
    }
    tbody.appendChild(tr);
  });

  // 3. Rellenar descripciones morfológicas de campo
  if (descContainer) {
    descContainer.innerHTML = '';
    const horizsWithDesc = horizs.filter(h => h.descripcion && h.descripcion.trim());
    if (horizsWithDesc.length === 0) {
      descContainer.innerHTML = '<p class="text-slate-400 italic text-xs">Sin descripción morfológica textual registrada para este perfil.</p>';
    } else {
      horizsWithDesc.forEach(h => {
        const item = document.createElement('div');
        item.className = 'bg-slate-50 border border-slate-200 rounded p-2 text-xs';
        item.innerHTML = `
          <div class="flex items-center gap-2 font-bold text-emerald-950 mb-0.5">
            <span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[11px]">${h.horizonte || '-'}</span>
            <span class="text-slate-500 font-normal">(${h.desde ?? 0} - ${h.hasta ?? (h.hasta_raw || '+')} cm)</span>
          </div>
          <p class="text-slate-600 leading-relaxed text-justify mt-1">${h.descripcion}</p>
        `;
        descContainer.appendChild(item);
      });
    }
  }
}

// Mostrar los datos en el Sidebar
function displaySoilDetails(feature) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.add('open');

  const p = feature.properties || {};
  const nomencla = (p.nomencla || '').trim();
  const s1 = (p.suelo_1 || '').trim();
  const s2 = (p.suelo_2 || '').trim();

  // Detección de elementos no edáficos (cuerpos de agua, ciudades, etc.)
  const nonSoilTypes = ['Institución', 'Ciudad', 'Río', 'Arroyo', 'Embalse', 'Quebrada', 'LCa', 'M'];
  const isNonSoil = nonSoilTypes.some(t => nomencla.toLowerCase() === t.toLowerCase() || s1.toLowerCase() === t.toLowerCase());

  // Buscar información ampliada en suelos_info.json
  const uc = appData?.unidades_cartograficas?.[nomencla] || {};
  const serie = appData?.series?.[s1] || {};
  const capUso = appData?.capacidad_uso?.[uc.cap_uso || p.cap_uso] || {};

  // 1. Tarjeta resumen superior
  document.getElementById('sb-simbolo').textContent = nomencla || 'S/N';
  document.getElementById('sb-nombre-uc').textContent = isNonSoil ? `Área No Edáfica (${nomencla})` : (uc.nombre || s1 || 'Unidad Cartográfica');
  document.getElementById('sb-tipo-uc').textContent = isNonSoil ? 'Elemento Misceláneo' : (uc.tipo || 'Consociación');
  document.getElementById('sb-ipc').textContent = (uc.ipc !== undefined && uc.ipc !== null) ? uc.ipc : (p.ipc || '-');
  document.getElementById('sb-cap-uso').textContent = formatCapUso(uc.cap_uso || p.cap_uso);
  document.getElementById('sb-hoja').textContent = p.hoja || 'Valle de Lerma';

  // 2. Pestaña de Serie
  const nomSerie = isNonSoil ? `Elemento: ${nomencla}` : (serie.nombre || s1 || 'No especificada');
  document.getElementById('sb-serie-nombre').textContent = nomSerie;
  document.getElementById('sb-orden').textContent = serie.orden || p.orden || (isNonSoil ? 'No aplica' : '-');
  document.getElementById('sb-suborden').textContent = serie.suborden || (isNonSoil ? 'No aplica' : '-');
  document.getElementById('sb-grangrup').textContent = serie.gran_grupo || p.grangrup || (isNonSoil ? 'No aplica' : '-');
  document.getElementById('sb-subgr-usda').textContent = serie.subgrupo_usda || (isNonSoil ? 'No aplica' : '-');

  // Unidades Cartográficas asociadas
  const ucsContainer = document.getElementById('sb-ucs-asociadas');
  if (ucsContainer) {
    ucsContainer.innerHTML = '';
    const ucs = serie.unidades_asociadas || [];
    if (ucs.length === 0) {
      ucsContainer.innerHTML = '<span class="text-slate-400 italic text-[11px]">No se registran otras unidades para este elemento.</span>';
    } else {
      ucs.forEach(u => {
        const badge = document.createElement('button');
        const isCurrent = u.toLowerCase() === nomencla.toLowerCase();
        badge.className = `px-2 py-0.5 rounded font-mono font-bold text-xs transition ${isCurrent ? 'bg-[#1b4332] text-white shadow-sm' : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300'}`;
        badge.textContent = u;
        badge.title = `Ver unidad cartográfica ${u} en el mapa y ficha técnica`;
        badge.addEventListener('click', () => {
          const found = window.mapModule.findAndHighlight(u);
          if (!found) {
            displaySoilDetailsByUC(u);
          }
        });
        ucsContainer.appendChild(badge);
      });
    }
  }

  if (isNonSoil) {
    document.getElementById('sb-serie-desc').textContent = `Esta superficie corresponde a un área no edáfica o elemento misceláneo (${nomencla}). Representa cursos fluviales, cuerpos de agua superficiales, áreas urbanas o instalaciones de infraestructura que no presentan perfil de suelo con aptitud agronómica clasificada.`;
  } else {
    document.getElementById('sb-serie-desc').textContent = serie.descripcion || uc.descripcion || 'Sin descripción detallada registrada para esta serie.';
  }

  // 3. Selección y configuración del Perfil Activo
  const perfiles = serie.perfiles || [];
  const hojaPoligono = (p.hoja || '').trim().toLowerCase();

  if (perfiles.length > 0) {
    // Buscar perfil que coincida con la Hoja del polígono
    const match = perfiles.find(prof => prof.hoja && hojaPoligono && (prof.hoja.toLowerCase().includes(hojaPoligono) || hojaPoligono.includes(prof.hoja.toLowerCase())));
    currentSelectedProfile = match || perfiles[0];
  } else {
    currentSelectedProfile = serie.perfil_ambiental || { horizontes: serie.horizontes || [] };
  }

  // Configurar Selector de Perfiles (si hay más de 1 perfil en diferentes hojas)
  const profileSelectorContainer = document.getElementById('profile-selector-container');
  const profileButtonsList = document.getElementById('profile-buttons-list');
  const profileActiveBadge = document.getElementById('profile-active-badge');

  if (profileSelectorContainer && profileButtonsList) {
    if (perfiles.length > 1) {
      profileSelectorContainer.classList.remove('hidden');
      profileButtonsList.innerHTML = '';
      if (profileActiveBadge) {
        profileActiveBadge.textContent = `${perfiles.length} relevamientos`;
      }

      perfiles.forEach(prof => {
        const btn = document.createElement('button');
        const isActive = prof.id === currentSelectedProfile?.id;
        btn.type = 'button';
        btn.className = `profile-pill px-2.5 py-1 rounded-lg text-xs font-medium border transition ${isActive ? 'active' : 'bg-white hover:bg-amber-100 text-amber-950 border-amber-300'}`;
        
        const hojaLabel = prof.hoja ? `Hoja ${prof.hoja}` : `Perfil #${prof.id}`;
        const ubicLabel = prof.ubicacion ? ` (${prof.ubicacion})` : '';
        btn.textContent = `${hojaLabel}${ubicLabel}`;
        btn.title = `Ver perfil relevado en ${hojaLabel}`;

        btn.addEventListener('click', () => {
          currentSelectedProfile = prof;
          // Actualizar estilos activos de botones
          profileButtonsList.querySelectorAll('.profile-pill').forEach(b => {
            b.classList.remove('active');
            b.className = 'profile-pill px-2.5 py-1 rounded-lg text-xs font-medium border transition bg-white hover:bg-amber-100 text-amber-950 border-amber-300';
          });
          btn.className = 'profile-pill px-2.5 py-1 rounded-lg text-xs font-medium border transition active';

          // Actualizar banner informativo, tabla y gráficos
          updateActiveProfileBanner(currentSelectedProfile);
          renderEnvironmentalFactors(currentSelectedProfile, isNonSoil, nomencla);
          renderHorizontesTable(currentSelectedProfile?.horizontes || [], currentAnalyticsView);
          renderProfileCharts(currentSelectedProfile?.horizontes || []);
        });

        profileButtonsList.appendChild(btn);
      });
    } else {
      profileSelectorContainer.classList.add('hidden');
    }
  }

  // Actualizar banner del perfil activo
  updateActiveProfileBanner(currentSelectedProfile);

  // Perfil ambiental en pestaña Serie
  renderEnvironmentalFactors(currentSelectedProfile, isNonSoil, nomencla);

  // 4. Renderizar Horizontes y Analítica
  renderHorizontesTable(currentSelectedProfile?.horizontes || [], currentAnalyticsView);

  // 5. Gráficos de Perfil
  renderProfileCharts(currentSelectedProfile?.horizontes || []);

  // 6. Aptitud y Prácticas de Manejo
  document.getElementById('sb-cu-desc').textContent = capUso.descripcion || 'Información de capacidad de uso en desarrollo.';
  
  const practicasContainer = document.getElementById('sb-practicas-list');
  practicasContainer.innerHTML = '';
  
  const pIds = capUso.practicas_ids || [];
  if (pIds.length === 0) {
    practicasContainer.innerHTML = '<p class="text-xs text-gray-500 italic">No se listan prácticas específicas para esta clase.</p>';
  } else {
    pIds.forEach(id => {
      const pr = appData?.practicas_recomendadas?.[id];
      if (pr) {
        const item = document.createElement('div');
        item.className = 'border-l-2 border-emerald-600 pl-3 py-1 bg-emerald-50/50 rounded-r';
        item.innerHTML = `
          <h5 class="text-xs font-bold text-emerald-950">${pr.nombre}</h5>
          <p class="text-[11px] text-gray-600 mt-0.5 leading-snug">${pr.descripcion}</p>
        `;
        practicasContainer.appendChild(item);
      }
    });
  }
}

// Renderizar gráficos de texturas y química en profundidad
function renderProfileCharts(horizontes) {
  if (!window.Chart) return;

  const validH = (horizontes || []).filter(h => h.desde !== null && (h.hasta !== null || h.hasta_raw));
  const ctxTextura = document.getElementById('chart-textura');
  const ctxChem = document.getElementById('chart-quimica');

  if (validH.length === 0) {
    if (textureChart) { textureChart.destroy(); textureChart = null; }
    if (chemChart) { chemChart.destroy(); chemChart = null; }
    return;
  }

  const labels = validH.map(h => `${h.horizonte} (${h.desde}-${h.hasta ?? (h.hasta_raw || '+')} cm)`);
  const arcillaData = validH.map(h => h.arcilla);
  const limoData = validH.map(h => h.limo);
  const arenaData = validH.map(h => h.arena);

  // Gráfico Textura
  if (textureChart) textureChart.destroy();
  if (ctxTextura) {
    textureChart = new Chart(ctxTextura, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Arcilla %', data: arcillaData, backgroundColor: '#c2410c' },
          { label: 'Limo %', data: limoData, backgroundColor: '#ca8a04' },
          { label: 'Arena %', data: arenaData, backgroundColor: '#0284c7' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, ticks: { font: { size: 10 } } },
          y: { stacked: true, max: 100, title: { display: true, text: '% Granulométrico' } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
        }
      }
    });
  }

  // Gráfico pH y MO
  if (chemChart) chemChart.destroy();
  if (ctxChem) {
    const phData = validH.map(h => h.ph);
    const moData = validH.map(h => h.mat_org);

    chemChart = new Chart(ctxChem, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'pH pasta',
            data: phData,
            borderColor: '#16a34a',
            backgroundColor: '#16a34a',
            yAxisID: 'y'
          },
          {
            label: 'Materia Orgánica %',
            data: moData,
            borderColor: '#9333ea',
            backgroundColor: '#9333ea',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { font: { size: 10 } } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'pH' },
            min: 4,
            max: 10
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'MO %' },
            grid: { drawOnChartArea: false }
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
        }
      }
    });
  }
}

// Descargar la ficha técnica en PDF directamente por nombre de serie
function downloadSerieByName(serieName) {
  if (!appData?.series) return;
  const serie = appData.series[serieName];
  if (!serie) {
    alert(`No se encontró la serie "${serieName}".`);
    return;
  }

  // Buscar unidad cartográfica representativa asociada si existe
  let ucData = null;
  if (appData.unidades_cartograficas) {
    for (const uc of Object.values(appData.unidades_cartograficas)) {
      if (uc.suelo_1 === serieName || uc.suelo_2 === serieName) {
        ucData = uc;
        break;
      }
    }
  }

  const cuClase = ucData?.cap_uso || serie?.perfil_ambiental?.clasif_utilitaria || '1';
  const capUsoData = appData?.capacidad_uso?.[cuClase];

  let practicas = [];
  if (capUsoData && capUsoData.practicas_ids && appData?.practicas_recomendadas) {
    practicas = capUsoData.practicas_ids.map(id => appData.practicas_recomendadas[id]).filter(Boolean);
  }

  const defaultProfile = serie.perfil_ambiental || (serie.perfiles && serie.perfiles[0]);
  window.exportSoilPDF(serie, ucData, capUsoData, practicas, defaultProfile);
}

// Variables globales para filtros de catálogo
let currentCatalogFilterText = '';
let currentCatalogOrder = 'ALL';

// Llenar el catálogo de las 38 series con descarga directa de PDF y búsqueda
function populateSeriesCatalog() {
  const container = document.getElementById('catalog-grid');
  if (!container || !appData?.series) return;

  let series = Object.values(appData.series);

  // Filtrar por orden taxonómico
  if (currentCatalogOrder !== 'ALL') {
    series = series.filter(s => (s.orden || '').toLowerCase().includes(currentCatalogOrder.toLowerCase()));
  }

  // Filtrar por texto de búsqueda
  if (currentCatalogFilterText.trim()) {
    const q = currentCatalogFilterText.toLowerCase().trim();
    series = series.filter(s => 
      s.nombre.toLowerCase().includes(q) || 
      (s.subgrupo_usda || '').toLowerCase().includes(q) ||
      (s.gran_grupo || '').toLowerCase().includes(q)
    );
  }

  container.innerHTML = '';

  if (series.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-8 text-center text-slate-500">
        <i class="fa-solid fa-magnifying-glass text-2xl mb-2 text-slate-300"></i>
        <p class="text-sm">No se encontraron series que coincidan con la búsqueda.</p>
      </div>
    `;
    return;
  }

  series.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(s => {
    const pCount = (s.perfiles && s.perfiles.length > 1) ? `${s.perfiles.length} perfiles muestreados` : `${s.horizontes?.length || 0} horizontes analíticos`;
    const hojasLabel = (s.perfiles && s.perfiles.length > 1) ? s.perfiles.map(p => p.hoja).filter(Boolean).join(', ') : (s.perfil_ambiental?.hoja ? 'Hoja ' + s.perfil_ambiental.hoja : '');

    const card = document.createElement('div');
    card.className = 'border border-slate-200 rounded-xl p-3.5 hover:shadow-md transition bg-white flex flex-col justify-between';
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <h4 class="font-bold text-emerald-950 text-sm">${s.nombre}</h4>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">${s.orden || 'Orden S/D'}</span>
        </div>
        <p class="text-[11px] text-slate-500 mb-2 font-mono">${s.subgrupo_usda || s.gran_grupo || ''}</p>
        <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">${s.descripcion || 'Descripción morfogenética registrada en carta de suelos.'}</p>
      </div>
      <div>
        <div class="text-[10px] text-slate-400 mb-2 flex items-center justify-between">
          <span><i class="fa-solid fa-layer-group text-slate-400 mr-1"></i> ${pCount}</span>
          <span class="truncate ml-1" title="${hojasLabel}">${hojasLabel}</span>
        </div>
        <div class="text-[11px] text-emerald-900 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1.5 rounded-lg mb-2.5">
          <div class="flex items-center gap-1.5 mb-1.5 text-slate-600 font-medium text-[11px]">
            <i class="fa-solid fa-map-location-dot text-emerald-700"></i>
            <span>Unidades cartográficas asociadas:</span>
          </div>
          <div class="flex flex-wrap gap-1">
            ${(s.unidades_asociadas && s.unidades_asociadas.length > 0)
              ? s.unidades_asociadas.map(u => `
                  <button type="button" class="catalog-uc-pill px-2 py-0.5 rounded bg-white hover:bg-[#1b4332] hover:text-white text-emerald-900 border border-emerald-300 font-mono font-bold text-xs transition shadow-2xs cursor-pointer" data-uc="${u}" title="Ver unidad ${u} en el mapa y ficha técnica">
                    ${u}
                  </button>
                `).join('')
              : '<span class="text-xs text-slate-400 italic">Consignada en cartas</span>'}
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <button class="download-serie-pdf-btn bg-[#1b4332] hover:bg-[#2d6a4f] text-white py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm" data-serie="${s.nombre}" title="Descargar Ficha PDF">
            <i class="fa-solid fa-file-pdf text-red-300"></i>
            <span>Descargar PDF</span>
          </button>
          <button class="view-serie-map-btn bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition" data-serie="${s.nombre}" title="Ver polígonos de esta serie en el mapa">
            <i class="fa-solid fa-location-dot text-amber-700"></i>
            <span>Ver en mapa</span>
          </button>
        </div>
      </div>
    `;

    // Evento Descargar PDF directo
    const pdfBtn = card.querySelector('.download-serie-pdf-btn');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadSerieByName(s.nombre);
      });
    }

    // Evento Ver en mapa (Resalta TODOS los polígonos donde participa la serie)
    const mapBtn = card.querySelector('.view-serie-map-btn');
    if (mapBtn) {
      mapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catalogModal = document.getElementById('catalog-modal');
        if (catalogModal) catalogModal.classList.remove('active');
        window.mapModule.highlightSeriesPolygons(s.nombre, s.unidades_asociadas || []);
      });
    }

    // Evento Clic en Pills de Unidades Cartográficas asociadas
    card.querySelectorAll('.catalog-uc-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ucSymbol = btn.getAttribute('data-uc');
        const catalogModal = document.getElementById('catalog-modal');
        if (catalogModal) catalogModal.classList.remove('active');
        const found = window.mapModule.findAndHighlight(ucSymbol);
        if (!found) {
          displaySoilDetailsByUC(ucSymbol);
        }
      });
    });

    container.appendChild(card);
  });
}

// Mostrar detalles de suelo a partir del símbolo de unidad cartográfica
function displaySoilDetailsByUC(ucSymbol) {
  if (!appData) return;
  const uc = appData.unidades_cartograficas?.[ucSymbol] || {};
  const s1 = uc.suelo_1 || '';
  const pseudoFeature = {
    type: 'Feature',
    properties: {
      nomencla: ucSymbol,
      suelo_1: s1,
      suelo_2: uc.suelo_2 || '',
      ipc: uc.ipc,
      cap_uso: uc.cap_uso,
      hoja: ''
    }
  };
  displaySoilDetails(pseudoFeature);
}

// Llenar autocompletado en el buscador
function populateSearchSuggestions() {
  const datalist = document.getElementById('search-datalist');
  if (!datalist || !appData) return;
  datalist.innerHTML = '';

  const added = new Set();

  if (appData.unidades_cartograficas) {
    Object.entries(appData.unidades_cartograficas).forEach(([sym, uc]) => {
      if (!added.has(sym)) {
        added.add(sym);
        const opt = document.createElement('option');
        opt.value = sym;
        opt.label = `${sym} - ${uc.nombre || uc.tipo || ''}`;
        datalist.appendChild(opt);
      }
    });
  }

  if (appData.series) {
    Object.keys(appData.series).forEach(sNom => {
      if (!added.has(sNom)) {
        added.add(sNom);
        const opt = document.createElement('option');
        opt.value = sNom;
        opt.label = `Serie ${sNom}`;
        datalist.appendChild(opt);
      }
    });
  }
}

// Configurar buscador y filtros del catálogo
function setupCatalogFilters() {
  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentCatalogFilterText = e.target.value;
      populateSeriesCatalog();
    });
  }

  const filterBtns = document.querySelectorAll('.catalog-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-[#1b4332]', 'text-white', 'font-semibold');
        b.classList.add('bg-slate-100', 'text-slate-700');
      });
      btn.classList.add('bg-[#1b4332]', 'text-white', 'font-semibold');
      btn.classList.remove('bg-slate-100', 'text-slate-700');

      currentCatalogOrder = btn.getAttribute('data-order') || 'ALL';
      populateSeriesCatalog();
    });
  });
}

// Inicializar filtros de catálogo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  setupCatalogFilters();
});

