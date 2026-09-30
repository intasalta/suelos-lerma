import os
import json
import re
import geopandas as gpd

# Rutas
BASE_DIR = r"c:\INTA\IA\LERMASUELOS"
OUT_DIR = os.path.join(BASE_DIR, "visor_suelos")
DATA_OUT_DIR = os.path.join(OUT_DIR, "data")
MDB_JSON_PATH = r"C:\Users\elena.hernan\.gemini\antigravity\brain\c7681b87-509c-49b5-9161-3e8046d0879f\scratch\mdb_dump.json"

os.makedirs(DATA_OUT_DIR, exist_ok=True)

print("Cargando dump de Access...")
with open(MDB_JSON_PATH, "r", encoding="utf-8-sig") as f:
    mdb = json.load(f)

# Diccionario exhaustivo para reparar \ufffd según términos edafológicos y geográficos del Valle de Lerma
REPLACEMENTS = {
    'Chu\ufffdapampa': 'Chuñapampa',
    'Vi\ufffdaco': 'Viñaco',
    'La Vi\ufffda': 'La Viña',
    'Zanj\ufffdn': 'Zanjón',
    'San Agust\ufffdn': 'San Agustín',
    'R\ufffdo': 'Río',
    'r\ufffdo': 'río',
    'v\ufffdas': 'vías',
    'v\ufffda': 'vía',
    'desag\ufffde': 'desagüe',
    '\ufffdrea': 'área',
    '\ufffdreas': 'áreas',
    'l\ufffdmite': 'límite',
    'l\ufffdticos': 'líticos',
    'l\ufffdtica': 'lítica',
    'f\ufffdcil': 'fácil',
    'ra\ufffdces': 'raíces',
    'ra\ufffdz': 'raíz',
    't\ufffdpico': 'típico',
    't\ufffdpica': 'típica',
    '\ufffdcuico': 'ácuico',
    '\ufffdcuica': 'ácuica',
    '\ufffddico': 'údico',
    'v\ufffdrtico': 'vértico',
    '\ufffdrgico': 'árgico',
    'Chaque\ufffdo': 'Chaqueño',
    'chaque\ufffdo': 'chaqueño',
    'cartogr\ufffdafica': 'cartográfica',
    'cartogr\ufffdaficas': 'cartográficas',
    'pr\ufffdcticas': 'prácticas',
    'pr\ufffdctica': 'práctica',
    'descripci\ufffdn': 'descripción',
    'Descripci\ufffdn': 'Descripción',
    'clim\ufffdticas': 'climáticas',
    'per\ufffdo': 'período',
    'posici\ufffdn': 'posición',
    'condici\ufffdn': 'condición',
    'inclinaci\ufffdn': 'inclinación',
    'rotaci\ufffdn': 'rotación',
    'adici\ufffdn': 'adición',
    'aplicaci\ufffdn': 'aplicación',
    'conservaci\ufffdn': 'conservación',
    'erosi\ufffdn': 'erosión',
    'retenci\ufffdn': 'retención',
    'penetraci\ufffdn': 'penetración',
    'penetrac\ufffdn': 'penetración',
    'aereaci\ufffdn': 'aireación',
    'vegetaci\ufffdn': 'vegetación',
    'clasificaci\ufffdn': 'clasificación',
    'clasificac\ufffdn': 'clasificación',
    'asociaci\ufffdn': 'asociación',
    'consociaci\ufffdn': 'consociación',
    'Consociaci\ufffdn': 'Consociación',
    'litol\ufffdgica': 'litológica',
    'litol\ufffdgico': 'litológico',
    'h\ufffdmicos': 'húmicos',
    'h\ufffdmico': 'húmico',
    'h\ufffdmedo': 'húmedo',
    'est\ufffdn': 'están',
    'est\ufffd': 'está',
    'podr\ufffdan': 'podrían',
    'f\ufffdsicas': 'físicas',
    'f\ufffdsico': 'físico',
    'qu\ufffdmicas': 'químicas',
    'qu\ufffdmico': 'químico',
    'd\ufffdbilmente': 'débilmente',
    'calc\ufffdreos': 'calcáreos',
    'calc\ufffdreo': 'calcáreo',
    'm\ufffds': 'más',
    'a\ufffdos': 'años',
    'a\ufffdo': 'año',
    'ma\ufffdz': 'maíz',
    'E\ufffdlico': 'Eólico',
    'e\ufffdlico': 'eólico',
    'm\ufffdxima': 'máxima',
    'm\ufffdnima': 'mínima',
    'Agr\ufffdcola': 'Agrícola',
    'agr\ufffdcola': 'agrícola',
    '25\ufffd': '25°',
    '65\ufffd': '65°',
    'pl\ufffdstico': 'plástico',
    'pl\ufffdstica': 'plástica',
    'Sol\ufffd': 'Solá',
    'Aut\ufffddromo': 'Autódromo',
    'Pardque': 'Parque',
    'Estaci\ufffdn': 'Estación'
}

def clean_text(text):
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    
    # Reemplazos dirigidos
    for orig, rep in REPLACEMENTS.items():
        if orig in text:
            text = text.replace(orig, rep)
    
    # Si queda algún \ufffd suelto que no coincidió, limpiarlo sin romper la palabra
    text = text.replace('\ufffd', '')
    
    # Limpiar espacios repetidos
    return re.sub(r'[ \t]+', ' ', text).strip()

def get_desc(row):
    for k, v in row.items():
        if k.lower().startswith('descrip'):
            return clean_text(v)
    return ""

def num_val(v):
    if v is None or v == "":
        return None
    try:
        if isinstance(v, str):
            v = v.replace(',', '.').strip()
            v = v.replace('+', '').strip()
        return round(float(v), 2)
    except:
        return None

print("Normalizando tablas de Access...")

# 1. Prácticas recomendadas
practicas_dict = {}
for r in mdb['Pract_recomend']:
    id_p = r.get('Id_pract') or r.get('Id')
    if id_p is not None:
        practicas_dict[int(id_p)] = {
            "id": int(id_p),
            "nombre": clean_text(r.get('Practicas_recomendadas')),
            "descripcion": get_desc(r)
        }

# 2. Capacidad de uso y prácticas asociadas
cap_uso_dict = {}
for r in mdb['Cap_Uso']:
    cu_id = clean_text(r.get('cap_uso'))
    if cu_id:
        cap_uso_dict[cu_id] = {
            "clase": cu_id,
            "descripcion": clean_text(r.get('Desc_CU')),
            "practicas_ids": []
        }

for r in mdb['Cap_Uso_prac']:
    cu_id = clean_text(r.get('cap_uso'))
    pr_id = r.get('Practica_link') or r.get('Pract_rec')
    if cu_id in cap_uso_dict and pr_id is not None:
        try:
            pr_int = int(pr_id)
            if pr_int not in cap_uso_dict[cu_id]["practicas_ids"]:
                cap_uso_dict[cu_id]["practicas_ids"].append(pr_int)
        except:
            pass

# 3. Perfiles de campo ambientales (Tabla Datos)
perfiles_dict = {}
for r in mdb['Datos']:
    p_id = r.get('Id')
    if p_id is None:
        continue
    nom_serie = clean_text(r.get('Nomb_Serie'))
    hoja = clean_text(r.get('Hoja'))
    ubic = clean_text(r.get('Ubic_'))
    
    perfiles_dict[p_id] = {
        "id": p_id,
        "serie": nom_serie,
        "hoja": hoja,
        "ubicacion": ubic,
        "fecha": clean_text(r.get('Fecha')),
        "lat": clean_text(r.get('Lat')),
        "long": clean_text(r.get('Long')),
        "altitud_msnm": clean_text(r.get('Altitud')),
        "paisaje": clean_text(r.get('Paisaj_')),
        "posicion": clean_text(r.get('Posic_')),
        "relieve": clean_text(r.get('Relieve')),
        "pendiente_pct": clean_text(r.get('Pend_%')),
        "material_originario": clean_text(r.get('Mat_origi')),
        "vegetacion": clean_text(r.get('Veg_nat')),
        "uso_tierra": clean_text(r.get('uso_tierra')),
        "drenaje": clean_text(r.get('Drenaje')),
        "permeabilidad": clean_text(r.get('Permeabil_')),
        "prof_napa": clean_text(r.get('Prof_napa')),
        "anegamiento": clean_text(r.get('Anegamiento')),
        "pedregosidad": clean_text(r.get('Pedreg_Rocosi')),
        "sales_alcalis": clean_text(r.get('Sales_alcali')),
        "erosion": clean_text(r.get('Erosi')),
        "limitacion_principal": clean_text(r.get('Limitac_princ')),
        "subgrupo_usda": clean_text(r.get('Sub_grup')),
        "clasif_utilitaria": clean_text(r.get('Clas_Utilitar')),
        "horizontes": []
    }

# 4. Horizontes analíticos (Tabla Desc_morfol_anal)
seen_horizons = set()

for r in mdb['Desc_morfol_anal']:
    link = r.get('LINKEO')
    nom_serie = clean_text(r.get('Nombre'))
    
    # Omitir filas sin linkeo que son duplicadas no enlazadas en el mdb original
    if link is None and nom_serie == 'Cerrillos':
        continue
        
    horiz_nombre = clean_text(r.get('Horizonte'))
    desde = num_val(r.get('desde'))
    hasta = num_val(r.get('hasta'))
    hasta_raw = clean_text(r.get('hasta'))
    
    # Deduplicar filas idénticas accidentales en Access
    dup_key = (link, nom_serie, horiz_nombre, desde, hasta, str(r.get('pH_pasta')), str(r.get('arcilla')))
    if dup_key in seen_horizons:
        continue
    seen_horizons.add(dup_key)
    
    h_data = {
        "id": r.get('Id'),
        "horizonte": horiz_nombre,
        "desde": desde,
        "hasta": hasta,
        "hasta_raw": hasta_raw,
        "descripcion": get_desc(r),
        "arcilla": num_val(r.get('arcilla')),
        "limo": num_val(r.get('limo')),
        "arena": num_val(r.get('arena')),
        "ph": num_val(r.get('pH_pasta')),
        "mat_org": num_val(r.get('Mat_org')),
        "carb_org": num_val(r.get('Carb_org')),
        "nitrogeno": num_val(r.get('Nitrog_')),
        "fosforo_ppm": num_val(r.get('P_ppm')),
        "conductividad": num_val(r.get('conduct_mmhos/cm')),
        "carbonatos": num_val(r.get('carbonat_%')),
        "ca": num_val(r.get('Ca++')),
        "mg": num_val(r.get('Mg++')),
        "k": num_val(r.get('K+')),
        "na": num_val(r.get('Na+')),
        "suma_bases": num_val(r.get('S_SumBase')),
        "cic": num_val(r.get('CIC')),
        "t_psb": num_val(r.get('T_PSB')),
        "psi": num_val(r.get('%Sod_intercamb'))
    }
    
    if link in perfiles_dict:
        perfiles_dict[link]["horizontes"].append(h_data)

# Ordenar horizontes dentro de cada perfil cronológicamente por profundidad
for p in perfiles_dict.values():
    p["horizontes"].sort(key=lambda x: (x['desde'] if x['desde'] is not None else 999))

# 5. Series de suelos
series_dict = {}
for r in mdb['Serie de suelos']:
    nombre = clean_text(r.get('Serie'))
    if not nombre:
        continue
    
    # Asociar todos los perfiles de campo donde participó esta serie
    perfiles_de_serie = []
    for p_id, p in perfiles_dict.items():
        if p["serie"].lower() == nombre.lower():
            perfiles_de_serie.append(p)
            
    # Perfil ambiental por defecto
    perfil_default = None
    for p in perfiles_de_serie:
        if p["horizontes"]:
            perfil_default = p
            break
    if not perfil_default and perfiles_de_serie:
        perfil_default = perfiles_de_serie[0]
        
    horizontes_default = perfil_default["horizontes"] if perfil_default else []
    
    series_dict[nombre] = {
        "nombre": nombre,
        "descripcion": get_desc(r),
        "orden": clean_text(r.get('Orden')),
        "suborden": clean_text(r.get('Suborden')),
        "gran_grupo": clean_text(r.get('Grangrup')),
        "subgrupo_usda": clean_text(r.get('Subgr_USDA')),
        "perfiles": perfiles_de_serie,
        "perfil_ambiental": perfil_default,
        "horizontes": horizontes_default
    }

# 6. Unidades cartográficas
unidades_cart_dict = {}
for r in mdb['Unid_Cart']:
    simbolo = clean_text(r.get('Simb_'))
    if not simbolo:
        continue
    
    simbolo = simbolo.strip()
    nom_uc = clean_text(r.get('Nomb_'))
    tipo = "Consociación"
    if "complejo" in nom_uc.lower():
        tipo = "Complejo"
    elif "asociación" in nom_uc.lower() or "asociacion" in nom_uc.lower():
        tipo = "Asociación"
    elif "fase" in nom_uc.lower():
        tipo = "Fase"
        
    s1 = clean_text(r.get('Suelo_1'))
    s2 = clean_text(r.get('Suelo_2'))
    desc_uc = get_desc(r)

    unidades_cart_dict[simbolo] = {
        "simbolo": simbolo,
        "nombre": nom_uc,
        "tipo": tipo,
        "ipc": num_val(r.get('Ipc')),
        "cap_uso": clean_text(r.get('cap_uso')),
        "descripcion": desc_uc,
        "suelo_1": s1,
        "suelo_2": s2,
        "series_componentes": []
    }

# 7. Relación Bidireccional: Vincular Serie <-> Unidades Cartográficas
for nom_serie, s_data in series_dict.items():
    ucs_de_serie = []
    pat = r'\b' + re.escape(nom_serie) + r'\b'
    
    for simb, uc in unidades_cart_dict.items():
        es_componente = False
        if uc['suelo_1'] == nom_serie or uc['suelo_2'] == nom_serie:
            es_componente = True
        elif re.search(pat, uc['nombre'], re.IGNORECASE) or re.search(pat, uc['descripcion'], re.IGNORECASE):
            es_componente = True
            
        if es_componente:
            if simb not in ucs_de_serie:
                ucs_de_serie.append(simb)
            if nom_serie not in uc['series_componentes']:
                uc['series_componentes'].append(nom_serie)
                
    s_data["unidades_asociadas"] = sorted(ucs_de_serie)
    
    cu_sug = None
    if s_data.get("perfil_ambiental") and s_data["perfil_ambiental"].get("clasif_utilitaria"):
        cu_sug = s_data["perfil_ambiental"]["clasif_utilitaria"]
    elif ucs_de_serie:
        cu_sug = unidades_cart_dict[ucs_de_serie[0]].get("cap_uso")
    s_data["capacidad_uso_sugerida"] = cu_sug or "1"

info_consolidada = {
    "metadatos": {
        "titulo": "Carta de Suelos del Valle de Lerma - Salta",
        "autores": "Castrillo, S., Osinaga, R., Elena, H., Paoli, H.",
        "institucion": "INTA EEA Salta - Laboratorio de Teledetección y SIG",
        "superficie_ha": 170000,
        "total_series": len(series_dict),
        "total_unidades": len(unidades_cart_dict)
    },
    "unidades_cartograficas": unidades_cart_dict,
    "series": series_dict,
    "capacidad_uso": cap_uso_dict,
    "practicas_recomendadas": practicas_dict
}

suelos_info_path = os.path.join(DATA_OUT_DIR, "suelos_info.json")
with open(suelos_info_path, "w", encoding="utf-8") as f:
    json.dump(info_consolidada, f, ensure_ascii=False, indent=2)

print(f"Información consolidada guardada en {suelos_info_path}")
print("¡Procesamiento finalizado con éxito!")
