import os
import glob
import numpy as np
import h5py
from pyproj import Transformer
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "nisar_data")
OUT_DIR = os.path.join(BASE_DIR, "outputs")
AOI = (89.17225, 25.82127, 89.25285, 25.88062)   # west, south, east, north
WAVELENGTH_M = 0.238                              # NISAR L-band, about 23.8 cm
os.makedirs(OUT_DIR, exist_ok=True)

path = sorted(glob.glob(os.path.join(DATA_DIR, "**", "*GUNW*.h5"), recursive=True))[0]
stem = os.path.basename(path).replace(".h5", "")
print("Opening", stem)

with h5py.File(path, "r") as f:
    # 1. Show every 2D layer, grouped by the grid it lives on
    print("\n--- All 2D layers ---")
    f.visititems(lambda n, o: print(f"{n}  {o.shape}")
                 if isinstance(o, h5py.Dataset) and o.ndim == 2 else None)

    # 2. Locate the unwrapped phase and its grid
    hits = []
    f.visititems(lambda n, o: hits.append(n)
                 if isinstance(o, h5py.Dataset) and n.endswith("unwrappedPhase") else None)
    if not hits:
        raise SystemExit("No unwrappedPhase found. Check the list above.")
    up = hits[0]
    print("\nUsing:", up)
    pol_grp = f[up.rsplit("/", 1)[0]]          # .../unwrappedInterferogram/HH
    grid_grp = f[up.rsplit("/", 2)[0]]         # .../unwrappedInterferogram

    x, y = grid_grp["xCoordinates"][:], grid_grp["yCoordinates"][:]
    proj = grid_grp["projection"]
    epsg = int(proj.attrs.get("epsg_code", proj[()]))
    print(f"Grid: {len(x)} cols x {len(y)} rows, EPSG {epsg}")

    # 3. Crop to AOI
    to_proj = Transformer.from_crs(4326, epsg, always_xy=True)
    w, s, e, n = AOI
    pts = [to_proj.transform(lo, la) for lo, la in [(w, s), (e, s), (e, n), (w, n)]]
    xmin, xmax = min(p[0] for p in pts), max(p[0] for p in pts)
    ymin, ymax = min(p[1] for p in pts), max(p[1] for p in pts)
    cols = np.where((x >= xmin) & (x <= xmax))[0]
    rows = np.where((y >= ymin) & (y <= ymax))[0]
    if len(cols) == 0 or len(rows) == 0:
        raise SystemExit("AOI is outside this grid.")
    r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
    print(f"AOI window: rows {r0}:{r1}, cols {c0}:{c1}  ({r1 - r0} x {c1 - c0} px)")

    def read(name):
        return pol_grp[name][r0:r1, c0:c1] if name in pol_grp else None

    phase = read("unwrappedPhase").astype("float64")
    coh = read("coherenceMagnitude")
    cc = read("connectedComponents")

    # 4. Mask unreliable pixels
    bad = (phase == 0) | ~np.isfinite(phase)
    if coh is not None:
        bad |= coh < 0.3
    if cc is not None:
        bad |= cc == 0
    phase = np.where(bad, np.nan, phase)
    print(f"Valid pixels: {100 * np.mean(~bad):.1f}%")

    # 5. Phase -> line-of-sight displacement (cm)
    # InSAR is relative, so subtract the median to make the area's average zero.
    phase -= np.nanmedian(phase)
    los_cm = phase * WAVELENGTH_M / (4 * np.pi) * 100
    print(f"LOS change range: {np.nanmin(los_cm):.2f} to {np.nanmax(los_cm):.2f} cm")

    # 6. Plot
    extent = [x[c0], x[c1 - 1], y[r1 - 1], y[r0]]
    fig, ax = plt.subplots(1, 3, figsize=(19, 6))
    im0 = ax[0].imshow(phase, cmap="RdBu_r", extent=extent)
    ax[0].set_title("Unwrapped phase (rad, relative)")
    plt.colorbar(im0, ax=ax[0], shrink=0.7)

    lim = np.nanpercentile(np.abs(los_cm), 98)
    im1 = ax[1].imshow(los_cm, cmap="RdBu_r", vmin=-lim, vmax=lim, extent=extent)
    ax[1].set_title("LOS change (cm, relative)")
    plt.colorbar(im1, ax=ax[1], shrink=0.7)

    if coh is not None:
        im2 = ax[2].imshow(coh, cmap="gray", vmin=0, vmax=1, extent=extent)
        ax[2].set_title("Coherence")
        plt.colorbar(im2, ax=ax[2], shrink=0.7)

    fig.suptitle(stem, fontsize=8)
    out = os.path.join(OUT_DIR, stem + "_unwrapped.png")
    plt.savefig(out, dpi=150, bbox_inches="tight")
    print("saved", out)