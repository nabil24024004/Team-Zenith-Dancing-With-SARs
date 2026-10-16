import os
import json
import asf_search as asf
from shapely.geometry import shape, box, mapping

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AOI = (89.17225, 25.82127, 89.25285, 25.88062)  # west, south, east, north


def total_bytes(props):
    b = props.get("bytes")
    if isinstance(b, dict):
        return sum(v.get("bytes", 0) if isinstance(v, dict) else (v or 0)
                   for v in b.values())
    return b or 0


opts = asf.ASFSearchOptions(**{
    "maxResults": 500,
    "bbox": list(AOI),
    "start": "2026-09-27T18:00:00Z",
    "end": "2026-10-10T17:59:59Z",
    "dataset": ["NISAR"],
    "productionConfiguration": ["PR"],
})
results = asf.search(opts=opts)
print(len(results), "products found\n")

aoi = box(*AOI)
features = [{"type": "Feature", "properties": {"name": "AOI"}, "geometry": mapping(aoi)}]

for i, p in enumerate(results):
    pr = p.properties
    fp = shape(p.geometry)
    covers = fp.contains(aoi)
    print(f"[{i}] {pr.get('processingLevel')}  {pr.get('startTime')}  "
          f"{pr.get('flightDirection')}  {total_bytes(pr) / 1e9:.2f} GB  "
          f"covers AOI: {covers}")
    print("     ", pr.get("fileName"))
    features.append({"type": "Feature",
                     "properties": {"index": i, "level": pr.get("processingLevel"),
                                    "covers": bool(covers)},
                     "geometry": p.geometry})

out = os.path.join(BASE_DIR, "footprints_and_aoi.geojson")
with open(out, "w") as f:
    json.dump({"type": "FeatureCollection", "features": features}, f)
print("\nSaved", out, "-> drag it into geojson.io to see AOI vs footprints")