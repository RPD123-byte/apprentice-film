#!/usr/bin/env python3
# tojs_d.py key.json out.js NAME -- a traced key (draw mode) as a compact JS module:
#   tone  : a 6-value study (simplified outlines of the regions darker than each level), engraved at run time
#   dark / bright : ink strokes (centre lines with a width per point and one ink value per stroke)
#   dirs  : knife direction per 24 px node (the measured line direction of the source's texture)
#   flows : the measured motion to the frames the key covers
# Code alphabet: 91 printable chars (no backslash / quote). See s04/tkey.js for the decoders.
import json, sys
ALPHA = [chr(c) for c in range(35, 127) if c != 92]
assert len(ALPHA) == 91
WK = float(sys.argv[4]) if len(sys.argv) > 4 else 0.7     # stroke width calibration (dark)
BW = float(sys.argv[5]) if len(sys.argv) > 5 else 0.7     # (bright)
def enc_num2(v):
    v = int(round(v)) + 1000; assert 0 <= v < 91 * 91, v
    return ALPHA[v // 91] + ALPHA[v % 91]
def enc_ring(r):
    s = enc_num2(r[0][0]) + enc_num2(r[0][1])
    px, py = r[0]
    for x, y in r[1:]:
        dx, dy = x - px, y - py
        n = max(1, -(-max(abs(dx), abs(dy)) // 45))
        qx0, qy0 = px, py
        for k in range(1, n + 1):
            qx = px + round(dx * k / n); qy = py + round(dy * k / n)
            ex, ey = qx - qx0, qy - qy0
            if abs(ex) <= 4 and abs(ey) <= 4: s += ALPHA[(ex + 4) * 9 + (ey + 4)]
            else: s += ALPHA[81] + ALPHA[ex + 45] + ALPHA[ey + 45]
            qx0, qy0 = qx, qy
        px, py = x, y
    return s
def enc_group(rings): return " ".join(enc_ring(r) for r in rings if len(r) >= 3)
import os
MINC = float(os.environ.get("MINC", "0"))
def enc_strokes(sts, sign, k):
    out = []
    for st in sts:
        if len(st) < 2: continue
        # faint strokes (paper grain picked up as ridges) are dropped: the stroke's peak contrast to its ground
        con = max((q[4] - q[3]) if sign > 0 else (q[3] - q[4]) for q in st)
        if con < MINC: continue
        if sign > 0:
            vd = max(0, min(q[3] for q in st))
            ws = [q[2] * k * max(0.0, q[4] - q[3]) / max(8.0, q[4] - vd) for q in st]
        else:
            vd = min(255, max(q[3] for q in st))
            ws = [q[2] * k * max(0.0, q[3] - q[4]) / max(8.0, vd - q[4]) for q in st]
        if max(ws) < 0.3: continue
        s = ALPHA[min(85, int(round(vd / 3)))]
        x0, y0 = round(st[0][0] * 2), round(st[0][1] * 2)          # half-pixel positions
        s += ALPHA[(x0 + 2000) // 91 // 91] + ALPHA[(x0 + 2000) // 91 % 91] + ALPHA[(x0 + 2000) % 91]
        s += ALPHA[(y0 + 2000) // 91 // 91] + ALPHA[(y0 + 2000) // 91 % 91] + ALPHA[(y0 + 2000) % 91]
        s += ALPHA[min(90, int(round(ws[0] * 10)))]
        px, py = x0, y0
        for q, w in zip(st[1:], ws[1:]):
            x, y = round(q[0] * 2), round(q[1] * 2)
            dx, dy = x - px, y - py
            n = max(1, -(-max(abs(dx), abs(dy)) // 45))
            for kk in range(1, n + 1):
                qx = px + round(dx * kk / n); qy = py + round(dy * kk / n)
                qx0 = px + round(dx * (kk - 1) / n); qy0 = py + round(dy * (kk - 1) / n)
                s += ALPHA[qx - qx0 + 45] + ALPHA[qy - qy0 + 45] + ALPHA[min(90, int(round(w * 10)))]
            px, py = x, y
        out.append(s)
    return " ".join(out)
K = json.load(open(sys.argv[1])); out = sys.argv[2]; name = sys.argv[3]
if K.get("cal"):
    WK = BW = K["cal"]["wk"]
    for b in K["tone"]: b["v"] = max(0.0, min(255.0, b["v"] + K["cal"]["tshift"]))
def groups(lst): return [[round(b["v"]), enc_group(b["rings"])] for b in lst if b["rings"]]
hull = K["hull"]; hull = [hull] if isinstance(hull[0][0], (int, float)) else hull
data = {"enc": 3, "t": K["t"], "hull": hull, "cut": K.get("cut", []), "tone": groups(K["tone"]),
        "dark": enc_strokes(K["dark"], +1, WK), "bright": enc_strokes(K["bright"], -1, BW),
        "inkd": groups(K.get("inkd", [])), "inkb": groups(K.get("inkb", []))}
if K.get("full"):
    data["full"] = 1
    D = K.get("dirs")
    if D:
        data["dgrid"] = [D["nx"], D["ny"], D["step"]]
        if "s" in D: data["ds"] = "".join(ALPHA[v] for v in D["s"])
        # knife direction (0..90 = 0..pi, along the source's fine lines) and hatch weight (texture the value study misses)
        if "v" in D: data["dv"] = "".join(ALPHA[v] for v in D["v"])
        if "w" in D: data["dw"] = "".join(ALPHA[v] for v in D["w"])
if K.get("flows"):
    fl = {}
    for o, F in K["flows"].items():
        vals = F["v"]; xs_ = vals[0::2]; ys_ = vals[1::2]; fo = []
        for plane in (xs_, ys_):
            prev = 0
            for v in plane:
                d = v - prev
                if -40 <= d <= 40: fo.append(ALPHA[d + 40])
                else: fo.append(ALPHA[81] + ALPHA[(v + 4000) // 91] + ALPHA[(v + 4000) % 91])
                prev = v
        fl[o] = "".join(fo)
        data["fgrid"] = [F["nx"], F["ny"], F["step"]]
    data["flows"] = fl
if K.get("held"): data["held"] = K["held"]
if K.get("cal"): data["ts"] = K["cal"]["tshift"]
if K.get("mv"): data["mv"] = K["mv"]
txt = json.dumps(data, separators=(",", ":"))
hdr = f"""// s04 key {K['t']:.2f} s, rotoscoped: the source frame at that time was measured (snapshots/s04-k2/tr: trace_key.py,
// flow_key.py, tojs_d.py) into a 6-value study (simplified region outlines) and its ink lines (centre lines with
// width, one ink value per line); s04/tkey.js engraves the value study and redraws the lines. No pixels are stored.
"""
open(out, "w").write(hdr + f"export const {name} = " + txt + ";\n")
print(out, len(txt), "bytes", "dark", len(K["dark"]), "bright", len(K["bright"]))
