# s16 fix 2: the flying owl's headphone band (measurement only; never loaded by the film).
# The source draws the band as a soft grey bar (~6-8 px at half height, peak 0.2-0.5 pre-grade) over the black gap
# above the head, with thicker lit sliders. The fix-1 data had only the sliders (HP.band) and the band's top was left
# to a badly fitted "far cup" (a flat grey D). This traces the band's pale centre-line inside each drawing's dark
# headphone shape (HP.rings, minus the cups' ellipses): Hessian ridge (tr.strokes, bright polarity on black), with the
# width (ink mass / depth) and the peak value per point. Output: data/band.js, BAND[id] = strokes [x, y, w, v, ...].
# Usage: python3 band.py OWLJSON   (OWLJSON = the drawings exported by snapshots/s16-fix2-tools/owljson.mjs)
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s16-fix2-final/tools')
import tr, h16
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'band.js')
# far cups whose ellipse lies on the black above the head (mean source value < 0.2): the band runs through them
OVER_BLACK = {(1144, 0), (1157, 0), (1158, 0)}
def main(path):
    D = json.load(open(path)); res = {}; cm = {}; keep = {}
    for k in sorted(D, key=int):
        n = int(k); d = D[k]
        if not d or not d.get('HP') or n > 1163: continue
        Y = cv2.GaussianBlur(h16.pre(n), (0, 0), 0.8)
        m = np.zeros(Y.shape, np.uint8)
        for r in d['HP']['rings']: cv2.fillPoly(m, [np.array(r, np.float32).reshape(-1, 2).round().astype(np.int32)], 1)
        m = cv2.erode(m, np.ones((3, 3), np.uint8))
        for i, c in enumerate(d['HP']['cups']):
            if (n, i) in OVER_BLACK: continue
            cv2.ellipse(m, (int(round(c[0])), int(round(c[1]))), (int(c[2]) + 2, int(c[3]) + 2), c[4], 0, 360, 0, -1)
        S = tr.strokes(Y, np.zeros_like(Y), m > 0, polarity='bright', sigmas=(1.5, 2.5), hi=0.05, lo=0.02, minlen=8,
                       dmin=0.08, maxw=11, valley=0.05, smooth=7)
        # the band runs along the silhouette's outer edge: drop ridges more than 10 px inside it (the head's lit top)
        sm = np.zeros(Y.shape, np.uint8)
        for r in d['sil']: cv2.fillPoly(sm, [np.array(r, np.float32).reshape(-1, 2).round().astype(np.int32)], 1)
        dist = cv2.distanceTransform(sm, cv2.DIST_L2, 5)
        out = []
        for s in S:
            A = np.array(s)
            dd = [float(dist[int(round(y)), int(round(x))]) for x, y in A[:, :2]]
            if np.mean(dd) > 10: continue
            # value: the brightness on the centre-line (bilinear on the sigma-0.8 frame)
            v = [float(cv2.getRectSubPix(Y, (1, 1), (float(x), float(y)))[0, 0]) for x, y in A[:, :2]]
            out.append([round(float(x), 2) for row in [[A[i, 0], A[i, 1], min(7.0, A[i, 2]), v[i]] for i in range(len(A))] for x in row])
        res[n] = out
        # each cup's mean value inside its fitted ellipse (the new cup model is scaled to it)
        cm[n] = []
        for c in d['HP']['cups']:
            mm = np.zeros(Y.shape, np.uint8); cv2.ellipse(mm, (int(round(c[0])), int(round(c[1]))), (int(c[2]), int(c[3])), c[4], 0, 360, 1, -1)
            cm[n].append(round(float(h16.pre(n)[mm > 0].mean()), 3))
        # the pale edge lines (HP.hl) that follow the head's lit top edge (more than 7 px inside the silhouette's
        # outer edge) are kept; the rest lie on the band and printed as highlight blobs
        keep[n] = []
        for i, st in enumerate(d['HP'].get('hl', [])):
            A = np.array(st).reshape(-1, 4)
            if np.mean([float(dist[int(round(y)), int(round(x))]) for x, y in A[:, :2]]) > 7: keep[n].append(i)
        print(n, len(out), [round(len(s) / 4) for s in out], 'cups', cm[n], 'hl keep', keep[n], '/', len(d['HP'].get('hl', [])))
    with open(OUT, 'w') as f:
        f.write('// s16 fix 2: the flying owl\'s headphone band, pale centre-lines per drawing [x, y, w, v, ...] (frame px),\n'
                '// measured by src/shots/s16/trace/band.py (geometry, a width and a value per point; no pixels)\n')
        f.write('export const BAND = {\n' + ',\n'.join(f'{k}: {json.dumps(v, separators=(",", ":"))}' for k, v in res.items()) + '\n};\n')
        f.write('// the source\'s mean value inside each cup\'s fitted ellipse (pre-grade), in the order of HP.cups\n')
        f.write('export const CUPM = ' + json.dumps({str(k): v for k, v in cm.items()}, separators=(',', ':')) + ';\n')
        f.write('// indices of HP.hl lines kept (the head\'s lit top edge; the others lay on the band as highlight blobs)\n')
        f.write('export const HLKEEP = ' + json.dumps({str(k): v for k, v in keep.items()}, separators=(',', ':')) + ';\n')
if __name__ == '__main__': main(sys.argv[1])
