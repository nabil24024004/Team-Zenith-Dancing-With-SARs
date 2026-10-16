import os
import getpass
import asf_search as asf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "nisar_data")
AOI = (89.17225, 25.82127, 89.25285, 25.88062)

FILE_NAMES = [
    "NISAR_L2_PR_GCOV_024_019_D_076_2005_DHDH_M_20260627T124243_20260627T124317_P05023_N_F_J_001.h5",
    "NISAR_L2_PR_GCOV_025_019_D_076_2005_DHDH_M_20260709T124242_20260709T124317_P05023_N_F_J_001.h5",
]

opts = asf.ASFSearchOptions(
    maxResults=2000, bbox=list(AOI),
    start="2026-01-27T00:00:00Z", end="2026-10-10T23:59:59Z",
    dataset=["NISAR"], productionConfiguration=["PR"],
)
results = asf.search(opts=opts)
wanted = [p for p in results if p.properties.get("fileName") in FILE_NAMES]
if len(wanted) != len(FILE_NAMES):
    raise SystemExit(f"Found {len(wanted)} of {len(FILE_NAMES)}. Copy the names exactly.")

os.makedirs(DATA_DIR, exist_ok=True)
session = asf.ASFSession()
session.auth_with_token(getpass.getpass("EDL token (hidden): "))

for p in wanted:
    name = p.properties["fileName"]
    if os.path.exists(os.path.join(DATA_DIR, name)):
        print("Already have", name)
        continue
    print("Downloading", name)
    p.download(path=DATA_DIR, session=session)
print("Done.")