# Visor de Suelos del Valle de Lerma (Salta, Argentina) - INTA

Aplicación web interactiva, moderna y estática diseñada para **GitHub Pages** que permite explorar, consultar y descargar fichas técnicas de las cartas de suelos del Valle de Lerma.

---

## 🌟 Características

- **Mapa Interactivo:**
  - Visualización vectorial de **1.255 polígonos** de suelos sobre imágenes satelitales de alta resolución (Esri World Imagery), cartografía vial y relieve topográfico.
  - Tematización dinámica con 1 clic:
    - **Capacidad de Uso:** Visualización semáforo de aptitud de tierras agrícolas.
    - **Serie Principal de Suelo:** Coloreado cualitativo para identificar las series en el territorio.
    - **Orden Taxonómico USDA:** Alfisoles, Entisoles, Inceptisoles, Molisoles.
    - **Gran Grupo USDA:** Haplustalf, Natrustalf, Ustifluvents, etc.
    - **Índice de Productividad (IPC):** Gradiente de 0 a 100 de potencial productivo.
  - Búsqueda inteligente por nombre de serie (ej: *Cerrillos*, *Chibilme*, *San Agustín*) o código de unidad cartográfica (ej: *Ce3*, *CoBar*, *SJv2*).
  - Herramienta de GPS en tiempo real para consultas in-situ en el campo desde teléfonos celulares o tablets.

- **Consulta Detallada de Suelos:**
  - Panel lateral reactivo con pestañas:
    1. **Serie y Ambiente:** Taxonomía USDA completa, descripción morfogenética, relieve, paisaje, material originario, vegetación, pendiente y limitaciones de uso.
    2. **Horizontes Analíticos:** Tabla de perfiles típicos con profundidades y datos de laboratorio (% Arcilla, Limo, Arena, pH, Materia Orgánica, Fósforo disponible, CIC).
    3. **Gráficos Dinámicos:** Variación de textura granulométrica y perfil de pH/MO en profundidad generados en tiempo real.
    4. **Aptitud y Prácticas:** Detalle agronómico de la Capacidad de Uso y catálogo de prácticas recomendadas de labranza y conservación del suelo.

- **Generador de Fichas Técnicas Oficiales en PDF:**
  - Botón integrado para descargar la **Ficha Técnica en PDF** con diseño editorial institucional INTA, tabla de horizontes analíticos, taxonomía y recomendaciones de manejo.

- **Catálogo de 38 Series:**
  - Directorio visual con acceso directo a la información y ubicación geográfica de cada serie del valle.

---

## 🚀 Publicación en GitHub Pages (en 2 pasos)

Como la aplicación está construida enteramente con tecnologías frontend (HTML5, Tailwind CSS, Leaflet, Chart.js, jsPDF), **no requiere backend ni base de datos activa** y su alojamiento en GitHub Pages es 100% gratuito.

### Paso 1: Subir a GitHub
Puedes crear un repositorio en GitHub (ejemplo: `valle-lerma-suelos`) y subir el contenido de esta carpeta `visor_suelos`:
```bash
git init
git add .
git commit -m "Initial commit - Visor de Suelos Valle de Lerma"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/valle-lerma-suelos.git
git push -u origin main
```

### Paso 2: Activar GitHub Pages
1. Ve a tu repositorio en GitHub.
2. Ingresa a **Settings** -> **Pages**.
3. En **Build and deployment** / **Source**, selecciona **Deploy from a branch**.
4. En **Branch**, elige `main` y la carpeta `/ (root)`.
5. Haz clic en **Save**. En un minuto tu visor estará activo en `https://TU-USUARIO.github.io/valle-lerma-suelos/`.

---

## 💻 Prueba Local

Para probar la aplicación en tu computadora localmente:
1. Abre una terminal en la carpeta `c:\INTA\IA\LERMASUELOS\visor_suelos`.
2. Inicia un servidor web local liviano de Python:
   ```bash
   python -m http.server 8000
   ```
3. Abre tu navegador web en: `http://localhost:8000`

---

## 📁 Estructura de Archivos

```
visor_suelos/
├── index.html                 # Página principal de la aplicación
├── css/
│   └── styles.css             # Estilos de la UI y diseño de impresión PDF
├── js/
│   ├── app.js                 # Lógica de la aplicación, panel lateral, gráficos y catálogo
│   ├── map.js                 # Controlador del mapa Leaflet, estilos temáticos y GPS
│   └── pdf_export.js          # Motor de generación de Fichas Técnicas en PDF (jsPDF)
├── data/
│   ├── suelos_valle_lerma.geojson  # Capa geográfica optimizada (2.39 MB vs 62.5 MB original)
│   └── suelos_info.json            # Base de datos relacional consolidada (Series, UCs, Horizontes)
└── scripts/
    ├── export_and_optimize.py # Pipeline de extracción desde Access y optimización Shapefile
    └── round_coords.py        # Optimizador de precisión de coordenadas
```

---

## 📚 Referencia Bibliográfica Oficial

> **Castrillo, S., Osinaga, R., Elena, H., Paoli, H. (2012).**  
> *Adecuación a un SIG de las cartas de suelos del Valle de Lerma - Salta*.  
> Laboratorio de Teledetección y SIG, Estación Experimental Agropecuaria Salta, Instituto Nacional de Tecnología Agropecuaria (INTA). Cobertura: 170.000 ha (Hojas Salta, El Aybal, Cerrillos, San Agustín, Osma, Coronel Moldes y Ampascachi).
