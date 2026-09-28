# end-s28-fix1: the beanie's lit right edge keyline (x 1440-1600, y 120-260) is broken in most locked figure keys (the
# key's ink was traced only inside its silhouette, and the keyline runs along it). Each locked key gets that keyline
# re-traced from its own source frame (two ink levels, as the keys), appended to its ink (opaque, so overlaps with the
# existing ink do not show). Idempotent (shapes tagged x: "bean"). Originals kept in snapshots/end-s28-fix1-tools/keys-orig.
import sys, json, os, shutil, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s28-fix1-tools')
import tp
from traceview import rings_of
from grade import hexc
BOX = (1440, 120, 1600, 260)
def ink_box(t, box, levels):
    pre = tp.pre_frame(t).astype(np.float32); H, W = pre.shape[:2]; S = 2
    P2 = cv2.resize(pre, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    L = cv2.GaussianBlur(0.299 * P2[..., 0] + 0.587 * P2[..., 1] + 0.114 * P2[..., 2], (0, 0), 0.7 * S)
    bg = cv2.dilate(L, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(10 * S) + 1,) * 2)); bg = cv2.GaussianBlur(bg, (0, 0), 3 * S)
    area = np.zeros((H * S, W * S), np.uint8); x0, y0, x1, y1 = box; area[y0 * S:y1 * S, x0 * S:x1 * S] = 1
    out = []
    for li, lay in enumerate(levels):
        m = (L < lay['lmax'])
        if 'contrast' in lay: m &= (bg - L) > lay['contrast']
        m = (m & (area > 0)).astype(np.uint8) * 255
        for rs in rings_of(m, lay.get('eps', 0.7), lay.get('min_area', 4), 2, S=S):
            mm = np.zeros((H * S, W * S), np.uint8); cv2.fillPoly(mm, [np.int32(np.array(rs[0]) * S)], 255)
            for h_ in rs[1:]: cv2.fillPoly(mm, [np.int32(np.array(h_) * S)], 0)
            px = P2[(mm > 0) & (m > 0)]
            if len(px): out.append({'c': hexc(np.clip(np.median(px, 0), 0, 1)), 'l': li, 'r': rs, 'x': 'bean'})
    return out
LEV = [{"lmax": 0.50, "contrast": 0.18, "eps": 0.7, "min_area": 4}, {"lmax": 0.24, "eps": 0.6, "min_area": 3}]
K = '/Users/computer/rootline/apprentice-film/src/shots/s28/keys'
if __name__ == '__main__':
  for name in sorted(f[:-3] for f in os.listdir(K) if f.startswith('lock')):
      p = f'{K}/{name}.js'; bk = f'/Users/computer/rootline/apprentice-film/snapshots/end-s28-fix1-tools/keys-orig/{name}.js'
      if not os.path.exists(bk): shutil.copy(p, bk)
      s = open(p).read(); i = s.index('export default '); head, body = s[:i], s[i + 15:].rstrip().rstrip(';')
      D = json.loads(body)
      D['ink'] = [sh for sh in D['ink'] if sh.get('x') != 'bean']
      new = ink_box(D['t'], BOX, LEV)
      D['ink'] = D['ink'] + new
      if 'beanie keyline' not in head:
          head = head.rstrip('\n') + "\n// + the beanie's lit right-edge keyline re-traced (x 1440-1600, y 120-260) by snapshots/end-s28-fix1-tools/fixbeanie.py.\n"
      open(p, 'w').write(head + 'export default ' + json.dumps(D, separators=(',', ':')) + ';\n')
      print(name, D['t'], 'added', len(new))
