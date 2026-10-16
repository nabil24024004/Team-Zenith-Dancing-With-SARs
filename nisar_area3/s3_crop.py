import os
import glob
import warnings
import numpy as np
import h5py
from scipy.interpolate import griddata
from pyproj import Transformer
from shapely import wkt
from shapely.geometry import box
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "nisar_data")
OUT_DIR = os.path.join(BASE_DIR, "outputs")
AOI = (89.17225, 25.82127, 89.25285, 25.88062)  # west, south, east, north
os.makedirs(OUT_DIR, exist_ok=True)
warnings.filterwarnings("ignore")


def as_text(v):
    return v.decode() if isinstance(v, bytes) else str(v)


def multilook(a, n):
    """Average n x n blocks to reduce speckle / shrink the image."""
    if n <= 1:
        return a
    r, c = (a.shape[0] // n) * n, (a.shape[1] // n) * n
    return np.nanmean(a[:r, :c].reshape(r // n, n, c // n, n), axis=(1, 3))


def plot_layers(layers, out_png, title):
    """layers: dict name -> 2D array (complex arrays are shown as phase)."""
    fig, axes = plt.subplots(1, len(layers), figsize=(7 * len(layers), 7), squeeze=False)
    for ax, (name, arr) in zip(axes[0], layers.items()):
        if np.iscomplexobj(arr):
            img = np.angle(arr)
            im = ax.imshow(img, cmap="hsv", vmin=-np.pi, vmax=np.pi, aspect="auto")
            name += " (phase, rad)"
        elif "coherence" in name.lower():
            im = ax.imshow(arr, cmap="gray", vmin=0, vmax=1, aspect="auto")
        else:
            lo, hi = np.nanpercentile(arr, [2, 98])
            im = ax.imshow(arr, cmap="viridis", vmin=lo, vmax=hi, aspect="auto")
        ax.set_title(name)
        plt.colorbar(im, ax=ax, shrink=0.7)
    fig.suptitle(title, fontsize=9)
    plt.savefig(out_png, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("saved", out_png)


def find_dataset(f, endswith):
    hits = []
    f.visititems(lambda n, o: hits.append(n)
                 if isinstance(o, h5py.Dataset) and n.endswith(endswith) else None)
    return hits


# ---------- Level 2: regular map grid ----------
def process_l2(f, xs, stem):
    ys = find_dataset(f, "yCoordinates")
    parent_path = xs.rsplit("/", 1)[0]
    parent = f[parent_path]
    x, y = f[xs][:], f[ys[0]][:]
    proj = parent["projection"]
    epsg = int(proj.attrs.get("epsg_code", proj[()]))
    print(f"Level 2 grid: {len(x)} cols x {len(y)} rows, EPSG {epsg}")

    to_proj = Transformer.from_crs(4326, epsg, always_xy=True)
    w, s, e, n = AOI
    pts = [to_proj.transform(lo, la) for lo, la in [(w, s), (e, s), (e, n), (w, n)]]
    xmin, xmax = min(p[0] for p in pts), max(p[0] for p in pts)
    ymin, ymax = min(p[1] for p in pts), max(p[1] for p in pts)
    cols = np.where((x >= xmin) & (x <= xmax))[0]
    rows = np.where((y >= ymin) & (y <= ymax))[0]
    if len(cols) == 0 or len(rows) == 0:
        print("-> AOI is outside this grid, skipping")
        return
    r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
    print(f"AOI window: rows {r0}:{r1}, cols {c0}:{c1}")

    names = []
    parent.visititems(lambda nm, o: names.append(nm)
                      if isinstance(o, h5py.Dataset) and o.shape == (len(y), len(x)) else None)
    print("2D layers on this grid:", names)
    layers = {}
    for nm in names[:3]:                      # first 3 layers only
        a = parent[nm][r0:r1, c0:c1]
        if a.dtype.kind == "f":
            a = np.where(a == 0, np.nan, a)
        layers[nm] = a
    plot_layers(layers, os.path.join(OUT_DIR, stem + "_aoi.png"), stem)


# ---------- Level 1: radar geometry (RIFG / RUNW) ----------
def process_l1(f, prod, stem):
    GG = f"science/LSAR/{prod}/metadata/geolocationGrid"
    SW = f"science/LSAR/{prod}/swaths/frequencyA/interferogram"
    if SW not in f:
        print(f"-> product type {prod} has no 'interferogram' swath; not handled here")
        return

    hgt = f[GG + "/heightAboveEllipsoid"][:]
    k = int(np.argmin(np.abs(hgt)))           # height layer closest to 0 m
    lon, lat = f[GG + "/coordinateX"][k], f[GG + "/coordinateY"][k]
    epsg = int(f[GG + "/epsg"][()])
    if epsg != 4326:
        lon, lat = Transformer.from_crs(epsg, 4326, always_xy=True).transform(lon, lat)

    zt_c, sr_c = f[GG + "/zeroDopplerTime"][:], f[GG + "/slantRange"][:]
    zt_f, sr_f = f[SW + "/zeroDopplerTime"][:], f[SW + "/slantRange"][:]

    # row/col in the full-resolution image for every coarse grid point
    row_c = np.interp(zt_c, zt_f, np.arange(len(zt_f)))
    col_c = np.interp(sr_c, sr_f, np.arange(len(sr_f)))
    row_grid = np.repeat(row_c[:, None], len(sr_c), axis=1)
    col_grid = np.repeat(col_c[None, :], len(zt_c), axis=0)

    # where do the AOI corners land in radar pixels?
    w, s, e, n = AOI
    gx, gy = np.meshgrid(np.linspace(w, e, 8), np.linspace(s, n, 8))
    pts = (lon.ravel(), lat.ravel())
    rr = griddata(pts, row_grid.ravel(), (gx, gy), method="linear")
    cc = griddata(pts, col_grid.ravel(), (gx, gy), method="linear")
    if np.all(np.isnan(rr)):
        print("-> AOI is outside the geolocation grid, skipping")
        return

    pad = 20
    r0 = max(int(np.nanmin(rr)) - pad, 0)
    r1 = min(int(np.nanmax(rr)) + pad, len(zt_f))
    c0 = max(int(np.nanmin(cc)) - pad, 0)
    c1 = min(int(np.nanmax(cc)) + pad, len(sr_f))
    print(f"AOI window: rows {r0}:{r1}, cols {c0}:{c1} ({r1 - r0} x {c1 - c0} px)")

    hh = f[SW + "/HH"]
    names = [k2 for k2 in hh if isinstance(hh[k2], h5py.Dataset)
             and hh[k2].shape == (len(zt_f), len(sr_f))]
    print("2D layers:", names)

    N = max(1, max(r1 - r0, c1 - c0) // 800)
    layers = {nm: multilook(hh[nm][r0:r1, c0:c1], N) for nm in names}
    plot_layers(layers, os.path.join(OUT_DIR, stem + "_aoi.png"), stem)


# ---------- main loop ----------
for path in sorted(glob.glob(os.path.join(DATA_DIR, "**", "*.h5"), recursive=True)):
    stem = os.path.basename(path).replace(".h5", "")
    print("\n=====", os.path.basename(path))
    with h5py.File(path, "r") as f:
        poly = wkt.loads(as_text(f["science/LSAR/identification/boundingPolygon"][()]))
        print("footprint (W,S,E,N):", [round(v, 3) for v in poly.bounds])
        if not poly.intersects(box(*AOI)):
            print("-> does NOT overlap AOI, skipping")
            continue
        print("covers whole AOI:", poly.contains(box(*AOI)))

        xs = find_dataset(f, "xCoordinates")
        if xs:
            process_l2(f, xs[0], stem)
        else:
            prod = [k for k in f["science/LSAR"] if k != "identification"][0]
            print("Level 1 product:", prod)
            process_l1(f, prod, stem)