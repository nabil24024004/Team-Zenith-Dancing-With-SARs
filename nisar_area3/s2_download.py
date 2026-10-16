import os
import getpass
import asf_search as asf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "nisar_data")
AOI = (89.17225, 25.82127, 89.25285, 25.88062)

FILE_NAME = "NISAR_L2_PR_GUNW_031_019_D_076_032_2000_SH_20260919T124240_20260919T124314_20261001T124240_20261001T124314_P05023_N_F_J_001.h5"


def total_bytes(props):
    b = props.get("bytes")
    if isinstance(b, dict):
        return sum(v.get("bytes", 0) if isinstance(v, dict) else (v or 0)
                   for v in b.values())
    return b or 0


opts = asf.ASFSearchOptions(**{
    "maxResults": 500,
    "bbox": list(AOI),
    "start": "2026-09-27T18:00:00Z",   # keep identical to script 1
    "end": "2026-10-10T17:59:59Z",
    "dataset": ["NISAR"],
    "productionConfiguration": ["PR"],
})
results = asf.search(opts=opts)

matches = [p for p in results if p.properties.get("fileName") == FILE_NAME]
if not matches:
    raise SystemExit("File name not found. Copy it exactly from script 1's output.")

product = matches[0]
size_gb = total_bytes(product.properties) / 1e9
print(f"Selected: {FILE_NAME}  ({size_gb:.2f} GB)")
if input("Download? (y/n): ").strip().lower() != "y":
    raise SystemExit("Cancelled.")

os.makedirs(DATA_DIR, exist_ok=True)
session = asf.ASFSession()
# Free token: urs.earthdata.nasa.gov -> sign in -> "Generate Token"
session.auth_with_token(getpass.getpass("EDL token (hidden): "))
product.download(path=DATA_DIR, session=session)

print("\nFiles in", DATA_DIR)
for root, _, files in os.walk(DATA_DIR):
    for name in files:
        path = os.path.join(root, name)
        print(f"  {path}   {os.path.getsize(path) / 1e6:.0f} MB")