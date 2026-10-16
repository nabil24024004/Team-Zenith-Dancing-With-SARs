import asf_search as asf
from collections import defaultdict
from shapely.geometry import shape, box

AOI = (89.17225, 25.82127, 89.25285, 25.88062)


def total_bytes(props):
    b = props.get("bytes")
    if isinstance(b, dict):
        return sum(v.get("bytes", 0) if isinstance(v, dict) else (v or 0)
                   for v in b.values())
    return b or 0


opts = asf.ASFSearchOptions(
    maxResults=2000, bbox=list(AOI),
    start="2026-01-27T00:00:00Z", end="2026-10-10T23:59:59Z",
    dataset=["NISAR"], productionConfiguration=["PR"],
)
results = asf.search(opts=opts)
print(len(results), "products of all types in the window")

aoi = box(*AOI)
groups = defaultdict(list)
for p in results:
    pr = p.properties
    if pr.get("processingLevel") != "GCOV":
        continue
    if not shape(p.geometry).contains(aoi):
        continue
    parts = pr["fileName"].split(".")[0].split("_")
    # NISAR_L2_PR_GCOV_<cycle>_<track>_<dir>_<frame>_<mode>_<pols>_<flag>_<start>_...
    key = tuple(parts[5:11])            # everything except the cycle number
    groups[key].append((parts[11], total_bytes(pr) / 1e9, pr["fileName"]))

print("\nGCOV products that fully cover your AOI, grouped so each group is comparable:\n")
for key, items in sorted(groups.items(), key=lambda kv: -len(kv[1])):
    track, direction, frame, mode, pols, flag = key
    tag = "  <-- usable pair" if len(items) >= 2 else ""
    print(f"track {track} {direction} frame {frame} mode {mode} {pols} {flag}: "
          f"{len(items)} date(s){tag}")
    for date, gb, name in sorted(items):
        print(f"    {date[:8]}  {gb:5.2f} GB  {name}")
    print()