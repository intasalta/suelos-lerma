import json
import os

path = r"c:\INTA\IA\LERMASUELOS\visor_suelos\data\suelos_valle_lerma.geojson"
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

def round_coords(coords):
    if isinstance(coords, (int, float)):
        return round(coords, 5)
    elif isinstance(coords, list):
        return [round_coords(c) for c in coords]
    return coords

for feature in data.get("features", []):
    geom = feature.get("geometry")
    if geom and "coordinates" in geom:
        geom["coordinates"] = round_coords(geom["coordinates"])

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, separators=(',', ':'))

size_mb = os.path.getsize(path) / (1024 * 1024)
print(f"Redondeo a 5 decimales completado. Nuevo tamaño: {size_mb:.2f} MB")
