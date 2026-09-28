# layout check: render the s15 set geometry (z-buffered, near-clipped) as visible edges over the SOURCE frame;
# score = symmetric truncated chamfer distance between rendered visible edges and the source's strong edges.
import cv2, json, subprocess, sys, numpy as np
SRC = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
HERE = '/Users/computer/rootline/apprentice-film/snapshots/s15-ov'
S = 2   # downscale
W, H = 2206 // S, 946 // S
def render_ids(polys):
    zb = np.full((H, W), np.inf, np.float32); ib = np.full((H, W), -1, np.int32); kb = np.zeros((H, W), np.int8)
    KIND = {'floor': 1, 'front': 2, 'side': 3, 'top': 4, 'pic': 5}
    for p in polys:
        s = np.array(p['s'], np.float64); s[:, :2] /= S
        if np.abs(s[:, :2]).max() > 50000: continue
        pts = np.round(s[:, :2]).astype(np.int32)
        x0, y0 = max(0, pts[:, 0].min()), max(0, pts[:, 1].min()); x1, y1 = min(W - 1, pts[:, 0].max()), min(H - 1, pts[:, 1].max())
        if x1 < x0 or y1 < y0: continue
        m = np.zeros((y1 - y0 + 1, x1 - x0 + 1), np.uint8)
        cv2.fillPoly(m, [pts - [x0, y0]], 1)
        # 1/z affine in screen: fit from vertices (least squares)
        A = np.c_[s[:, 0], s[:, 1], np.ones(len(s))]; iz = 1 / s[:, 2]
        coef, *_ = np.linalg.lstsq(A, iz, rcond=None)
        yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
        z = 1 / np.maximum(coef[0] * xx + coef[1] * yy + coef[2], 1e-6)
        sub = zb[y0:y1 + 1, x0:x1 + 1]; upd = (m > 0) & (z < sub)
        sub[upd] = z[upd]; ib[y0:y1 + 1, x0:x1 + 1][upd] = p['id']; kb[y0:y1 + 1, x0:x1 + 1][upd] = KIND[p['kind']]
    return ib, kb, zb
def edges_of(ib):
    e = np.zeros(ib.shape, bool)
    e[:, 1:] |= ib[:, 1:] != ib[:, :-1]; e[1:, :] |= ib[1:, :] != ib[:-1, :]
    return e
def src_edges(g):
    g = cv2.GaussianBlur(g, (0, 0), 1.5)
    return cv2.Canny(g, 30, 80) > 0
def score(er, es, cap=30):
    if er.sum() == 0 or es.sum() == 0: return 99, 99
    ds = cv2.distanceTransform((~es).astype(np.uint8), cv2.DIST_L2, 3); dr = cv2.distanceTransform((~er).astype(np.uint8), cv2.DIST_L2, 3)
    return float(np.minimum(ds[er], cap).mean()), float(np.minimum(dr[es], cap).mean())
def main(times, out, force=None):
    args = ['node', f'{HERE}/dump.mjs', times] + ([force] if force else [])
    js = json.loads(subprocess.check_output(args))
    tiles = []; scores = []
    for key, d in js.items():
        t = float(key); fi = int(round(d['t'] * 25))
        g = cv2.imread(f'{SRC}/f{fi}.png', 0); g = cv2.resize(g, (W, H), interpolation=cv2.INTER_AREA)
        ib, kb, zb = render_ids(d['polys'])
        er = edges_of(ib); es = src_edges(g)
        a, b = score(er, es); scores.append((t, a, b))
        vis = cv2.cvtColor((g * 0.75).astype(np.uint8), cv2.COLOR_GRAY2BGR)
        col = {1: (60, 120, 60), 2: (180, 90, 40), 3: (40, 90, 180), 4: (160, 60, 160), 5: (40, 180, 180)}
        tint = np.zeros_like(vis)
        for k, c in col.items(): tint[kb == k] = c
        vis = cv2.addWeighted(vis, 1.0, tint, 0.10, 0)
        vis[er] = (0, 255, 255)
        cv2.putText(vis, f'{t:.2f} {d["set"]} {a:.1f}/{b:.1f}', (8, 26), 0, 0.8, (255, 255, 255), 2)
        tiles.append(vis)
    cols = 2 if len(tiles) > 1 else 1
    while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
    cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]), [cv2.IMWRITE_JPEG_QUALITY, 82])
    for t, a, b in scores: print(f'{t:.2f} r->s {a:5.1f}  s->r {b:5.1f}')
    print('mean', np.mean([s[1] for s in scores]), np.mean([s[2] for s in scores]))
if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
