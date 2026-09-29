/**
 * Módulo de Mapa para Visor de Suelos del Valle de Lerma
 */

let map;
let geojsonLayer;
let baseLayers = {};
let currentThematic = 'cap_uso'; // 'cap_uso', 'serie', 'orden', 'grangrup', 'ipc'
let allFeatures = [];
let selectedLayer = null;

// Estados de visualización transparente / solo bordes
let onlyBorders = false;
let layerOpacity = 0.65;

// Paletas de colores
const PALETTES = {
  cap_uso: {
    '1': '#10b981',       // Clase 1: Verde brillante
    '1_2': '#34d399',     // Clase 1-2: Verde medio
    '2': '#84cc16',       // Clase 2: Verde lima
    '2_3': '#a3e635',     // Clase 2-3
    '3': '#eab308',       // Clase 3: Amarillo intenso
    '3sd': '#facc15',     // Clase 3sd: Amarillo cálido
    '4': '#f97316',       // Clase 4: Naranja
    '4sd': '#fb923c',     // Clase 4sd
    '4s': '#fdba74',      // Clase 4s
    '5': '#ef4444',       // Clase 5: Rojo coral
    '5sd': '#f87171',     // Clase 5sd
    '5st': '#fca5a5',     // Clase 5st
    '6': '#8b5cf6',       // Clase 6: Violeta
    '7': '#64748b',       // Clase 7: Gris
    '8': '#334155',       // Clase 8: Gris oscuro
    'default': '#94a3b8'  // Otros / Sin clasificar
  },
  orden: {
    'Alfisol': '#3b82f6',
    'Entisol': '#f59e0b',
    'Inceptisol': '#10b981',
    'Molisol': '#8b5cf6',
    'Alfisol-Entisol': '#06b6d4',
    'default': '#94a3b8'
  }
};

const serieColorCache = {};
function getSerieColor(serieName) {
  if (!serieName || serieName === 'None') return '#94a3b8';
  if (serieColorCache[serieName]) return serieColorCache[serieName];
  let hash = 0;
  for (let i = 0; i < serieName.length; i++) {
    hash = serieName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  const color = '#' + '00000'.substring(0, 6 - c.length) + c;
  serieColorCache[serieName] = color;
  return color;
}

function getIpcColor(ipc) {
  if (ipc === null || ipc === undefined || isNaN(ipc)) return '#cbd5e1';
  const val = Math.max(0, Math.min(100, Number(ipc)));
  if (val >= 75) return '#15803d';
  if (val >= 55) return '#22c55e';
  if (val >= 40) return '#eab308';
  if (val >= 20) return '#f97316';
  return '#ef4444';
}

function getFeatureThemeColor(p) {
  if (currentThematic === 'cap_uso') {
    const cu = (p.cap_uso || '').trim();
    return PALETTES.cap_uso[cu] || PALETTES.cap_uso['default'];
  } else if (currentThematic === 'orden') {
    const orden = (p.orden || '').trim();
    return PALETTES.orden[orden] || PALETTES.orden['default'];
  } else if (currentThematic === 'serie') {
    const serie = (p.suelo_1 || '').trim();
    return getSerieColor(serie);
  } else if (currentThematic === 'ipc') {
    return getIpcColor(p.ipc);
  } else if (currentThematic === 'grangrup') {
    return getSerieColor(p.grangrup);
  }
  return '#94a3b8';
}

// Estilo de cada polígono
function getFeatureStyle(feature) {
  const p = feature.properties || {};
  const themeColor = getFeatureThemeColor(p);

  if (onlyBorders) {
    return {
      fillColor: 'transparent',
      fillOpacity: 0,
      weight: 1.8,
      color: themeColor,
      dashArray: ''
    };
  }

  return {
    fillColor: themeColor,
    weight: 1,
    opacity: 0.85,
    color: '#ffffff',
    dashArray: '',
    fillOpacity: layerOpacity
  };
}

// Inicializar Mapa
function initMap() {
  map = L.map('map', {
    center: [-25.02, -65.48],
    zoom: 10,
    zoomControl: false,
    minZoom: 8,
    maxZoom: 18
  });

  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);

  // Capas Base
  baseLayers.satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS',
    maxZoom: 18
  });

  baseLayers.calles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  });

  baseLayers.topo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Topo Map',
    maxZoom: 18
  });

  baseLayers.satelite.addTo(map);
  return map;
}

// Cargar la capa GeoJSON SIN tooltips fijos superpuestos
async function loadSoilLayer(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    const data = await resp.json();
    allFeatures = data.features;

    const hoverBox = document.getElementById('hover-info-box');

    geojsonLayer = L.geoJSON(data, {
      style: getFeatureStyle,
      onEachFeature: function(feature, layer) {
        // Eventos limpios
        layer.on({
          mouseover: function(e) {
            const l = e.target;
            const p = feature.properties || {};

            // Resaltar borde del polígono
            if (l !== selectedLayer) {
              l.setStyle({
                weight: 3,
                color: '#f59e0b',
                fillOpacity: onlyBorders ? 0.15 : Math.min(1, layerOpacity + 0.25)
              });
              l.bringToFront();
            }

            // Actualizar la caja de información rápida flotante
            if (hoverBox) {
              hoverBox.classList.remove('hidden');
              hoverBox.innerHTML = `
                <div class="text-xs">
                  <div class="flex items-center justify-between gap-2 border-b pb-1 mb-1">
                    <span class="font-bold text-emerald-900">${p.nomencla || 'S/N'}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Cap. Uso: ${p.cap_uso || '-'}</span>
                  </div>
                  <div class="font-medium text-slate-800">${p.suelo_1 || 'Unidad no clasificada'}</div>
                  <div class="text-[11px] text-slate-500 flex justify-between mt-0.5">
                    <span>IPC: <b>${p.ipc ?? '-'}</b></span>
                    <span>Hoja: <b>${p.hoja || '-'}</b></span>
                  </div>
                </div>
              `;
            }
          },
          mouseout: function(e) {
            const l = e.target;
            if (l !== selectedLayer) {
              geojsonLayer.resetStyle(l);
            }
            if (hoverBox) {
              hoverBox.classList.add('hidden');
            }
          },
          click: function(e) {
            selectFeature(feature, layer);
          }
        });
      }
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
    updateLegend();
    return true;
  } catch (err) {
    console.error("Error al cargar capa GeoJSON:", err);
    return false;
  }
}

// Seleccionar feature y abrir panel de información
function selectFeature(feature, layer) {
  if (selectedLayer) {
    geojsonLayer.resetStyle(selectedLayer);
  }
  selectedLayer = layer;
  if (layer) {
    layer.setStyle({
      weight: 3.5,
      color: '#2563eb',
      fillOpacity: onlyBorders ? 0.2 : Math.min(1, layerOpacity + 0.2)
    });
    layer.bringToFront();
  }

  const event = new CustomEvent('soilSelected', { detail: { feature } });
  window.dispatchEvent(event);
}

// Cambiar temática visual
function setThematic(thematicKey) {
  currentThematic = thematicKey;
  if (geojsonLayer) {
    geojsonLayer.setStyle(getFeatureStyle);
    if (selectedLayer) {
      selectedLayer.setStyle({ weight: 3.5, color: '#2563eb' });
    }
  }
  updateLegend();
}

// Alternar entre Solo Bordes Transparentes y Relleno
function toggleOnlyBorders(active) {
  onlyBorders = active;
  if (geojsonLayer) {
    geojsonLayer.setStyle(getFeatureStyle);
    if (selectedLayer) {
      selectedLayer.setStyle({ weight: 3.5, color: '#2563eb' });
    }
  }
}

// Cambiar opacidad de la capa
function setLayerOpacity(opacity) {
  layerOpacity = Number(opacity);
  if (geojsonLayer && !onlyBorders) {
    geojsonLayer.setStyle(getFeatureStyle);
    if (selectedLayer) {
      selectedLayer.setStyle({ weight: 3.5, color: '#2563eb' });
    }
  }
}

// Cambiar mapa base
function setBaseMap(type) {
  Object.values(baseLayers).forEach(l => map.removeLayer(l));
  if (baseLayers[type]) {
    baseLayers[type].addTo(map);
  }
}

// Actualizar leyenda
function updateLegend() {
  const legendDiv = document.getElementById('legend-content');
  if (!legendDiv) return;

  let html = '';
  if (currentThematic === 'cap_uso') {
    html += '<div class="text-xs font-semibold text-gray-700 mb-2">Capacidad de Uso:</div>';
    const items = [
      { label: 'Clase 1: Muy alta aptitud', color: '#10b981' },
      { label: 'Clase 1-2: Alta aptitud', color: '#34d399' },
      { label: 'Clase 2: Buena aptitud agrícola', color: '#84cc16' },
      { label: 'Clase 3: Moderada limitación', color: '#eab308' },
      { label: 'Clase 4: Severa limitación / Pasturas', color: '#f97316' },
      { label: 'Clase 5: No apto cultivo / Pastoreo', color: '#ef4444' },
      { label: 'Clase 6-8: Uso forestal / Conservación', color: '#8b5cf6' }
    ];
    items.forEach(it => {
      html += `
        <div class="flex items-center gap-2 mb-1 text-xs text-gray-600">
          <span class="w-4 h-4 rounded-sm inline-block shadow-sm" style="background-color: ${it.color}"></span>
          <span>${it.label}</span>
        </div>
      `;
    });
  } else if (currentThematic === 'orden') {
    html += '<div class="text-xs font-semibold text-gray-700 mb-2">Orden Taxonómico USDA:</div>';
    const items = [
      { label: 'Alfisol (Suelos arcillosos fértiles)', color: '#3b82f6' },
      { label: 'Entisol (Suelos jóvenes/aluviales)', color: '#f59e0b' },
      { label: 'Inceptisol (Suelos incipientes)', color: '#10b981' },
      { label: 'Molisol (Suelos ricos en MO)', color: '#8b5cf6' },
      { label: 'Asociaciones Alfisol-Entisol', color: '#06b6d4' }
    ];
    items.forEach(it => {
      html += `
        <div class="flex items-center gap-2 mb-1 text-xs text-gray-600">
          <span class="w-4 h-4 rounded-sm inline-block shadow-sm" style="background-color: ${it.color}"></span>
          <span>${it.label}</span>
        </div>
      `;
    });
  } else if (currentThematic === 'ipc') {
    html += '<div class="text-xs font-semibold text-gray-700 mb-2">Índice de Productividad (IPC):</div>';
    const items = [
      { label: '75 - 100: Muy Alta', color: '#15803d' },
      { label: '55 - 74: Alta', color: '#22c55e' },
      { label: '40 - 54: Media / Regular', color: '#eab308' },
      { label: '20 - 39: Baja', color: '#f97316' },
      { label: '0 - 19: Muy Baja / Marginal', color: '#ef4444' }
    ];
    items.forEach(it => {
      html += `
        <div class="flex items-center gap-2 mb-1 text-xs text-gray-600">
          <span class="w-4 h-4 rounded-sm inline-block shadow-sm" style="background-color: ${it.color}"></span>
          <span>${it.label}</span>
        </div>
      `;
    });
  } else if (currentThematic === 'serie') {
    html += '<div class="text-xs font-semibold text-gray-700 mb-1">Series de Suelos:</div>';
    html += '<p class="text-[11px] text-gray-500">Coloreado individual por cada una de las 38 series.</p>';
  } else if (currentThematic === 'grangrup') {
    html += '<div class="text-xs font-semibold text-gray-700 mb-1">Gran Grupo USDA:</div>';
    html += '<p class="text-[11px] text-gray-500">Haplustalf, Natrustalf, Ustifluvents, etc.</p>';
  }

  legendDiv.innerHTML = html;
}

// Resaltar TODOS los polígonos donde participa una Serie (Unidades Cartográficas asociadas)
function highlightSeriesPolygons(serieName, ucsList = []) {
  if (!serieName || !geojsonLayer) return false;

  const sNomLower = serieName.toLowerCase().trim();
  const ucsLower = (ucsList || []).map(u => u.toLowerCase().trim());

  // Limpiar selección previa
  if (selectedLayer) {
    geojsonLayer.resetStyle(selectedLayer);
    selectedLayer = null;
  }

  const matchingLayers = [];

  geojsonLayer.eachLayer(layer => {
    const p = layer.feature.properties || {};
    const nom = (p.nomencla || '').toLowerCase().trim();
    const s1 = (p.suelo_1 || '').toLowerCase().trim();
    const s2 = (p.suelo_2 || '').toLowerCase().trim();

    const isMatch = s1 === sNomLower || 
                    s2 === sNomLower || 
                    ucsLower.includes(nom) || 
                    nom.includes(sNomLower);

    if (isMatch) {
      matchingLayers.push(layer);
      layer.setStyle({
        weight: 3.5,
        color: '#f59e0b', // Borde dorado vibrante
        fillOpacity: Math.min(1, layerOpacity + 0.3)
      });
    } else {
      geojsonLayer.resetStyle(layer);
    }
  });

  if (matchingLayers.length > 0) {
    const group = L.featureGroup(matchingLayers);
    map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 });

    // Seleccionar el primer polígono para abrir el panel
    const firstLayer = matchingLayers[0];
    selectedLayer = firstLayer;
    firstLayer.setStyle({ weight: 4, color: '#2563eb' });

    // Disparar evento para actualizar panel
    const event = new CustomEvent('soilSelected', { detail: { feature: firstLayer.feature } });
    window.dispatchEvent(event);

    return true;
  } else {
    // Si no hay polígonos en el shapefile con ese nombre directo, buscar por texto
    return findAndHighlight(serieName);
  }
}

// Búsqueda de entidad por texto
function findAndHighlight(query) {
  if (!query || !geojsonLayer) return false;
  const q = query.toLowerCase().trim();
  let targetLayer = null;
  let targetFeature = null;

  geojsonLayer.eachLayer(layer => {
    const p = layer.feature.properties || {};
    const nom = (p.nomencla || '').toLowerCase();
    const s1 = (p.suelo_1 || '').toLowerCase();
    const s2 = (p.suelo_2 || '').toLowerCase();

    if (nom === q || s1 === q || s2 === q || nom.includes(q) || s1.includes(q) || s2.includes(q)) {
      if (!targetLayer) {
        targetLayer = layer;
        targetFeature = layer.feature;
      }
    }
  });

  if (targetLayer) {
    map.fitBounds(targetLayer.getBounds(), { maxZoom: 14, padding: [50, 50] });
    selectFeature(targetFeature, targetLayer);
    return true;
  }
  return false;
}

// Localizar por GPS
function locateUser() {
  if (!navigator.geolocation) {
    alert("Geolocalización no soportada por su navegador.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 14);
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 0.9
      }).addTo(map);
      marker.bindPopup("<b>Tu ubicación actual</b>").openPopup();
    },
    err => {
      alert("No se pudo obtener la ubicación: " + err.message);
    },
    { enableHighAccuracy: true }
  );
}

window.mapModule = {
  initMap,
  loadSoilLayer,
  setThematic,
  setBaseMap,
  findAndHighlight,
  highlightSeriesPolygons,
  locateUser,
  selectFeature,
  toggleOnlyBorders,
  setLayerOpacity
};
