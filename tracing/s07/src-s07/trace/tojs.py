#!/usr/bin/env python3
# WORK/plate.json -> src/shots/s07/data/plate.js ; WORK/hands.json + hands_flow.npy -> src/shots/s07/data/hands.js
import json, sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from pack import pack_strokes, pack_zones, pack_shapes, module
WORK, OUTDIR = sys.argv[1], sys.argv[2]
os.makedirs(OUTDIR, exist_ok=True)
def layer_arrays(L, pre=""):
  n, p, c = pack_zones(L["zones"])
  return {pre + "ZN": ("u16", n), pre + "ZP": ("i16", p), pre + "ZC": ("f32", c), pre + "BROAD": ("i16", pack_strokes(L["broad"])), pre + "SHAPES": ("i16", pack_shapes(L.get("shapes", []))), pre + "FINE": ("i16", pack_strokes(L["fine"])), **({pre + "CORR": ("f32", np.array(L["corr"], np.float32).ravel())} if L.get("corr") else {}), **({pre + "TEX": ("f32", np.array(L["tex"], np.float32))} if L.get("tex") else {})}
if os.path.exists(WORK + "/plate.json"):
  P = json.load(open(WORK + "/plate.json"))
  hdr = """s07 static plate, MEASURED on the source (29.04–30.52 temporal median, exposure-normalised, taken back through the
inverse of the film grade): value zones (polygon + quadratic tone field), broad soft shading strokes and fine ink strokes
(centre-lines with width and value). Measurements only — no source pixels; tracekit.js redraws everything.
Regenerate: src/shots/s07/trace/ (prep.py, plate.py, tojs.py)."""
  s = module(hdr, layer_arrays(P)) + f"export const BLUR = {P['blur']};\n"
  open(OUTDIR + "/plate.js", "w").write(s); print("plate.js", len(s) // 1024, "KB")
if os.path.exists(WORK + "/hands.json"):
  Hd = json.load(open(WORK + "/hands.json")); Q = np.load(WORK + "/hands_flow.npy")
  hdr = """s07 hands, MEASURED on the source: source frame BASE traced inside BOX (zones + strokes, as the plate), the
moving-region mask (polygons, frame px) and, per source frame (29.04 + 0.04 i), the backward optical flow frame -> BASE
on a GRID px lattice (int8, 1/4 px; regularised, zero outside the mask). Regenerate: src/shots/s07/trace/hands.py, tojs.py."""
  arr = layer_arrays(Hd["layer"])
  mk = []
  for poly in Hd["mask"]: mk += [len(poly)] + [int(v) for q in poly for v in q]
  arr["MASK"] = ("i16", np.array(mk, np.int16))
  arr["FLOW"] = ("i8", Q.astype(np.int8).ravel())
  if Hd.get("layer1"):
    arr.update(layer_arrays(Hd["layer1"], "B1_"))
    mk = []
    for poly in Hd["mask1"]: mk += [len(poly)] + [int(v) for q in poly for v in q]
    arr["MASK1"] = ("i16", np.array(mk, np.int16))
  s = module(hdr, arr)
  s += f"export const BLUR = {Hd['layer']['blur']};\nexport const BOX = {json.dumps(Hd['box'])};\nexport const GRID = {Hd['grid']}, GW = {Hd['gw']}, GH = {Hd['gh']}, NF = {Q.shape[0]}, BASE = {Hd['base']};\nexport const OWN = {json.dumps(Hd.get('own', []))};   // frames drawn from their own traced layer (B1_), unwarped\n"
  open(OUTDIR + "/hands.js", "w").write(s); print("hands.js", len(s) // 1024, "KB")
