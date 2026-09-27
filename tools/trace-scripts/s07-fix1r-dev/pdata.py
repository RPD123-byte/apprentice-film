# load s07 data js (plate.js / hands.js) arrays in python
import re, base64, numpy as np
def load(path):
  s = open(path).read(); D = {}
  for m in re.finditer(r'export const (\w+) = \["(\w+)", "([^"]*)"\]', s):
    k, t, b = m.groups(); raw = base64.b64decode(b)
    D[k] = np.frombuffer(raw, {'i16': np.int16, 'u16': np.uint16, 'f32': np.float32, 'i8': np.int8, 'u8': np.uint8}[t]).copy()
  return D
def shapes(S):
  out = []; i = 0
  while i < len(S):
    nr = S[i]; v = S[i+1] / 1000; i += 2; rings = []
    for r in range(nr):
      n = S[i]; i += 1; rings.append(S[i:i+2*n].reshape(-1, 2) / 2.0); i += 2*n
    out.append((v, rings))
  return out
def strokes(S):
  out = []; i = 0
  while i < len(S):
    n = S[i]; i += 1; a = S[i:i+4*n].reshape(-1, 4).astype(float); i += 4*n
    out.append(np.stack([a[:, 0]/8, a[:, 1]/8, a[:, 2]/20, a[:, 3]/1000], 1))
  return out
