# Pack traced measurements into compact base64 typed arrays for a JS data module (little-endian).
import numpy as np, base64
def b64(a): return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
def pack_strokes(strokes):
  """[[x,y,w,v],...] -> Int16: n, then (x*8, y*8, w*20, v*1000) per point"""
  out = []
  for s in strokes:
    out.append(len(s))
    for x, y, w, v in (q[:4] for q in s): out += [int(round(x * 8)), int(round(y * 8)), int(round(min(w, 1600) * 20)), int(round(max(0, min(1, v)) * 1000))]
  return np.array(out, np.int16)
def pack_zones(zones):
  n = np.array([len(z["p"]) for z in zones], np.uint16)
  p = np.array([int(round(v * 2)) for z in zones for q in z["p"] for v in q], np.int16)
  c = np.array([[z["mx"], z["my"]] + z["c"] for z in zones], np.float32).ravel()
  return n, p, c
def module(header, arrays):
  s = "// " + header.replace("\n", "\n// ") + "\n"
  for k, (kind, a) in arrays.items(): s += f'export const {k} = ["{kind}", "{b64(a)}"];\n'
  return s
def pack_shapes(shapes):
  """Int16: nrings, v*1000, then per ring: npts, (x*2, y*2)*npts"""
  out = []
  for q in shapes:
    out += [len(q["rings"]), int(round(q["v"] * 1000))]
    for r in q["rings"]:
      out.append(len(r))
      for x, y in r: out += [int(round(x * 2)), int(round(y * 2))]
  return np.array(out, np.int16)
