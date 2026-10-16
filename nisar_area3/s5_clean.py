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
AOI = (89.17225, 25.82127, 89.25285, 25.88062)
WAVELENGTH_M = 0.238
TO_CM = WAVELENGTH_M / (4 * np.pi) * 100      # radians -> cm of line-of-sight change
G = "science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram"

path = sorted(glob.glob(os.path.join(DATA_DIR, "**", "*GUNW*.h5"), recursive=True))[0]
stem = os.path.basename(path).replace(".h5", "")


def deramp(a):
    """Fit and subtract a tilted plane: a ~ c0 + c1*col + c2*row (least squares)."""
    rows, cols = np.indices(a.shape)
    ok = np.isfinite(a)
    A = np.c_[np.ones(ok.sum()), cols[ok], rows[ok]]
    coef, *_ = np.linalg.lstsq(A, a[ok], rcond=None)
    return a - (coef[0] + coef[1] * cols + coef[2] * rows)


with h5py.File(path, "r") as f:
    grid = f[G]
    x, y = grid["xCoordinates"][:], grid["yCoordinates"][:]
    proj = grid["projection"]
    epsg = int(proj.attrs.get("epsg_code", proj[()]))

    # same AOI crop as script 4
    to_proj = Transformer.from_crs(4326, epsg, always_xy=True)
    w, s, e, n = AOI
    pts = [to_proj.transform(lo, la) for lo, la in [(w, s), (e, s), (e, n), (w, n)]]
    cols = np.where((x >= min(p[0] for p in pts)) & (x <= max(p[0] for p in pts)))[0]
    rows = np.where((y >= min(p[1] for p in pts)) & (y <= max(p[1] for p in pts)))[0]
    r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1

    hh = grid["HH"]
    # Check units/description of the ionosphere layer before trusting it
    print("ionosphere attrs:", dict(hh["ionospherePhaseScreen"].attrs))

    phase = hh["unwrappedPhase"][r0:r1, c0:c1].astype("float64")
    iono = hh["ionospherePhaseScreen"][r0:r1, c0:c1].astype("float64")
    coh = hh["coherenceMagnitude"][r0:r1, c0:c1]
    cc = hh["connectedComponents"][r0:r1, c0:c1]

# mask unreliable pixels
bad = (phase == 0) | ~np.isfinite(phase) | (coh < 0.3) | (cc == 0)
phase = np.where(bad, np.nan, phase)
iono = np.where(np.isfinite(iono), iono, np.nan)

raw = phase - np.nanmedian(phase)
no_iono = phase - iono
no_iono -= np.nanmedian(no_iono)
flat = deramp(no_iono)

versions = {
    "1. raw unwrapped": raw * TO_CM,
    "2. minus ionosphere": no_iono * TO_CM,
    "3. minus ionosphere and ramp": flat * TO_CM,
}

print("\nLOS change in cm (2nd to 98th percentile, and standard deviation):")
for name, a in versions.items():
    lo, hi = np.nanpercentile(a, [2, 98])
    print(f"  {name:32s} {lo:6.2f} to {hi:6.2f}   std {np.nanstd(a):.2f}")

fig, ax = plt.subplots(1, 3, figsize=(19, 6))
for a_ax, (name, a) in zip(ax, versions.items()):
    lim = np.nanpercentile(np.abs(a), 98)
    im = a_ax.imshow(a, cmap="RdBu_r", vmin=-lim, vmax=lim)
    a_ax.set_title(name + " (cm)")
    plt.colorbar(im, ax=a_ax, shrink=0.7)
fig.suptitle(stem, fontsize=8)
out = os.path.join(OUT_DIR, stem + "_clean.png")
plt.savefig(out, dpi=150, bbox_inches="tight")
print("saved", out)

np.save(os.path.join(OUT_DIR, "los_cm_cleaned.npy"), versions["3. minus ionosphere and ramp"])