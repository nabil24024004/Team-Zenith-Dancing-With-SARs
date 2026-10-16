import os
import glob
import numpy as np
import h5py
from pyproj import Transformer
from scipy.ndimage import uniform_filter
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "nisar_data")
OUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUT_DIR, exist_ok=True)

AOI = (89.17225, 25.82127, 89.25285, 25.88062)
FILE_A = "NISAR_L2_PR_GCOV_025_019_D_076_2005_DHDH_M_20260709T124242_20260709T124317_P05023_N_F_J_001.h5"
FILE_B = "NISAR_L2_PR_GCOV_024_019_D_076_2005_DHDH_M_20260627T124243_20260627T124317_P05023_N_F_J_001.h5"
POL = "HHHH"          # HH power. Use "HVHV" for vegetation-sensitive view
SMOOTH = 5            # pixels, speckle reduction
WATER_DB = -18.0      # starting threshold; check it against the histogram
CHANGE_DB = 3.0       # |change| above this is flagged as significant

GRID = "science/LSAR/GCOV/grids/frequencyA"


def nearest_idx(axis, vals):
    order = np.argsort(axis)
    s = axis[order]
    pos = np.clip(np.searchsorted(s, vals), 1, len(s) - 1)
    left, right = s[pos - 1], s[pos]
    pick = np.where(np.abs(vals - left) <= np.abs(vals - right), pos - 1, pos)
    return order[pick]


def load_window(path, target=None):
    """Read the AOI window. If target=(x, y, epsg) is given, resample onto it."""
    with h5py.File(path, "r") as f:
        g = f[GRID]
        if POL not in g:
            print("Layers in this grid:", list(g.keys()))
            raise SystemExit(f"'{POL}' not found. Pick one from the list above.")
        x, y = g["xCoordinates"][:], g["yCoordinates"][:]
        proj = g["projection"]
        epsg = int(proj.attrs.get("epsg_code", proj[()]))
        ds = g[POL]
        print(os.path.basename(path))
        print("  grid:", len(x), "x", len(y), "| EPSG", epsg,
              "| spacing (m):", abs(float(x[1] - x[0])), abs(float(y[1] - y[0])))
        print("  layer attrs:", {k: v for k, v in ds.attrs.items()
                                 if k in ("description", "units")})

        if target is None:
            to_p = Transformer.from_crs(4326, epsg, always_xy=True)
            w, s, e, n = AOI
            pts = [to_p.transform(lo, la) for lo, la in [(w, s), (e, s), (e, n), (w, n)]]
            cols = np.where((x >= min(p[0] for p in pts)) & (x <= max(p[0] for p in pts)))[0]
            rows = np.where((y >= min(p[1] for p in pts)) & (y <= max(p[1] for p in pts)))[0]
            if len(cols) == 0 or len(rows) == 0:
                raise SystemExit("AOI is outside this file's grid.")
            r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
            arr = ds[r0:r1, c0:c1].astype("float32")
            return arr, (x[c0:c1], y[r0:r1], epsg)

        xt, yt, epsg_t = target
        if epsg != epsg_t:
            raise SystemExit(f"Different projections ({epsg} vs {epsg_t}). "
                             "Choose products from the same track and frame.")
        ci, ri = nearest_idx(x, xt), nearest_idx(y, yt)
        gap = max(np.abs(x[ci] - xt).max(), np.abs(y[ri] - yt).max())
        print(f"  max grid mismatch vs image A: {gap:.1f} m")
        r0, r1, c0, c1 = ri.min(), ri.max() + 1, ci.min(), ci.max() + 1
        win = ds[r0:r1, c0:c1].astype("float32")
        return win[np.ix_(ri - r0, ci - c0)], target


def smooth_db(a, n):
    """Average in linear power (ignoring NaNs), then convert to dB."""
    a = np.where(np.isfinite(a) & (a > 0), a, np.nan)
    valid = np.isfinite(a).astype("float32")
    num = uniform_filter(np.nan_to_num(a), n)
    den = uniform_filter(valid, n)
    with np.errstate(divide="ignore", invalid="ignore"):
        lin = num / den
    lin[den < 0.5] = np.nan
    return 10 * np.log10(lin)


def otsu(vals, bins=256):
    h, edges = np.histogram(vals, bins=bins)
    c = (edges[:-1] + edges[1:]) / 2
    w0 = np.cumsum(h)
    w1 = w0[-1] - w0
    m0 = np.cumsum(h * c) / np.maximum(w0, 1)
    m1 = (np.sum(h * c) - np.cumsum(h * c)) / np.maximum(w1, 1)
    return c[np.argmax(w0 * w1 * (m0 - m1) ** 2)]


def find(name):
    hits = glob.glob(os.path.join(DATA_DIR, "**", name), recursive=True)
    if not hits:
        raise SystemExit(f"{name} not found in nisar_data/")
    return hits[0]


# ---------- load both dates on the same grid ----------
a_lin, target = load_window(find(FILE_A))
b_lin, _ = load_window(find(FILE_B), target)
a_db, b_db = smooth_db(a_lin, SMOOTH), smooth_db(b_lin, SMOOTH)
diff = b_db - a_db

x, y, _ = target
pix_km2 = abs(float(x[1] - x[0])) * abs(float(y[1] - y[0])) / 1e6
print(f"\nWindow: {a_db.shape[1]} x {a_db.shape[0]} px, {pix_km2 * 1e6:.0f} m2 per pixel")
print(f"Valid pixels: A {100 * np.mean(np.isfinite(a_db)):.1f}%  "
      f"B {100 * np.mean(np.isfinite(b_db)):.1f}%")

# ---------- water maps ----------
ok = np.isfinite(a_db) & np.isfinite(b_db)
wa, wb = (a_db < WATER_DB) & ok, (b_db < WATER_DB) & ok
print(f"\nOtsu threshold  A: {otsu(a_db[np.isfinite(a_db)]):.1f} dB   "
      f"B: {otsu(b_db[np.isfinite(b_db)]):.1f} dB   (fixed threshold used: {WATER_DB} dB)")
print(f"Water area  A: {wa.sum() * pix_km2:.2f} km2   B: {wb.sum() * pix_km2:.2f} km2")

# 0 land, 1 water in both, 2 new water (B only), 3 water lost (A only)
cls = np.zeros(a_db.shape, dtype="int8")
cls[wa & wb] = 1
cls[~wa & wb] = 2
cls[wa & ~wb] = 3
cls = np.where(ok, cls, -1)
for k, label in [(1, "water in both"), (2, "new water"), (3, "water lost")]:
    print(f"  {label:14s} {np.sum(cls == k) * pix_km2:.2f} km2")

dec = np.sum((diff < -CHANGE_DB) & ok) * pix_km2
inc = np.sum((diff > CHANGE_DB) & ok) * pix_km2
print(f"Backscatter drop > {CHANGE_DB} dB: {dec:.2f} km2 | rise > {CHANGE_DB} dB: {inc:.2f} km2")

# ---------- plots ----------
fig, ax = plt.subplots(2, 3, figsize=(20, 12))
lo, hi = np.nanpercentile(np.r_[a_db[np.isfinite(a_db)], b_db[np.isfinite(b_db)]], [2, 98])
for a_ax, img, t in [(ax[0, 0], a_db, "Date A (dB)"), (ax[0, 1], b_db, "Date B (dB)")]:
    im = a_ax.imshow(img, cmap="gray", vmin=lo, vmax=hi)
    a_ax.set_title(t)
    plt.colorbar(im, ax=a_ax, shrink=0.7)
im = ax[0, 2].imshow(diff, cmap="RdBu", vmin=-8, vmax=8)
ax[0, 2].set_title("B minus A (dB): blue = brighter, red = darker")
plt.colorbar(im, ax=ax[0, 2], shrink=0.7)

ax[1, 0].hist(a_db[np.isfinite(a_db)], bins=150, alpha=0.6, label="A")
ax[1, 0].hist(b_db[np.isfinite(b_db)], bins=150, alpha=0.6, label="B")
ax[1, 0].axvline(WATER_DB, color="k", ls="--", label=f"threshold {WATER_DB} dB")
ax[1, 0].set_title("Histogram: water is the low-dB peak")
ax[1, 0].set_xlabel("dB")
ax[1, 0].legend()

cmap = ListedColormap(["#d9d9d9", "#08306b", "#e31a1c", "#ffd92f"])
ax[1, 1].imshow(np.where(cls < 0, np.nan, cls), cmap=cmap, vmin=0, vmax=3,
                interpolation="nearest")
ax[1, 1].set_title("Gray land | dark blue water both | red new water | yellow water lost")

sig = np.where(ok, 0, np.nan)
sig = np.where(diff < -CHANGE_DB, -1, sig)
sig = np.where(diff > CHANGE_DB, 1, sig)
ax[1, 2].imshow(sig, cmap=ListedColormap(["#d73027", "#e0e0e0", "#4575b4"]),
                vmin=-1, vmax=1, interpolation="nearest")
ax[1, 2].set_title(f"Change over {CHANGE_DB} dB: red darker, blue brighter")

fig.suptitle(f"{FILE_A[:60]}...\nvs {FILE_B[:60]}...", fontsize=8)
out = os.path.join(OUT_DIR, "water_change.png")
plt.savefig(out, dpi=130, bbox_inches="tight")
print("\nsaved", out)
np.save(os.path.join(OUT_DIR, "water_class.npy"), cls)
np.save(os.path.join(OUT_DIR, "diff_db.npy"), diff)