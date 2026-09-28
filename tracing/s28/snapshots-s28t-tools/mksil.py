# s28t: the refined orbit figure silhouettes (measured on the source frames; see silfix.py) -> sil_new.json
# (then silmanual.py elbow, silmanual.py beanie). NOTE: it starts from the keys' current `sil`, so re-running it after the
# re-trace refines the refined outlines again; the committed result is sil_new.json.
import sys, json, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools')
import silfix
from silfix import key, mask_of, lidmask, disk, W, H
OUT = '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools/sil_new.json'
KEYS = [129.32, 129.52, 129.72, 129.92, 130.12, 130.32, 130.52, 130.72, 130.92, 131.12]
YLIM = {130.92: 470, 131.12: 470}           # below this, keep the old outline (GrabCut takes cabinet pieces there)
INCLUDE = {
    129.32: [[[256, 468], [238, 557], [205, 690], [167, 790], [140, 845], [150, 852], [270, 852], [270, 468]],   # hoodie drape by the chair
             [[1250, 505], [1300, 498], [1330, 515], [1268, 730], [1232, 722], [1218, 650], [1220, 585], [1232, 535]]],  # the owl
}
CUT = {
    129.52: [[[90, 480], [285, 480], [285, 520], [278, 556], [240, 600], [200, 660], [90, 660]]],               # bookshelf pieces
    130.92: [[[1510, 400], [1600, 400], [1600, 470], [1510, 470]]],                                            # wainscot strip
}
def build(t):
    name, K, S0, G, ink = silfix.refine_gc(t, R=80)
    S1 = G.copy()
    if t in YLIM: S1[YLIM[t]:] = S0[YLIM[t]:]
    near = cv2.dilate(lidmask(t, 0), disk(30)) > 0
    S1[near & (S0 > 0)] = 255                                  # GrabCut leaves spikes in the hair just above the lid
    for p in INCLUDE.get(t, []): cv2.fillPoly(S1, [np.int32(p)], 255)
    for p in CUT.get(t, []): cv2.fillPoly(S1, [np.int32(p)], 0)
    S1[lidmask(t, 5) > 0] = 0
    S1 = cv2.morphologyEx(S1, cv2.MORPH_OPEN, disk(2))
    # every sizeable piece (the lid can cut a piece off him, e.g. the elbow left of it at 130.3-131.1)
    n, lab, st, _ = cv2.connectedComponentsWithStats(S1)
    keep = [i for i in range(1, n) if st[i, 4] >= 1500]
    S1 = np.isin(lab, keep).astype(np.uint8) * 255
    cs, _ = cv2.findContours(S1, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    rings = [cv2.approxPolyDP(c.astype(np.float32), 1.0, True).reshape(-1, 2).tolist() for c in sorted(cs, key=cv2.contourArea, reverse=True)]
    return name, S0, S1, rings
if __name__ == '__main__':
    only = [float(a) for a in sys.argv[1:]]
    res = json.load(open(OUT)) if only else {}
    for t in KEYS:
        if only and t not in only: continue
        name, S0, S1, rings = build(t)
        res[f"{t:.2f}"] = rings
        silfix.contours_vis(t, S0, S1, f'/Users/computer/rootline/apprentice-film/snapshots/s28t-work/ns{int(round(t*100))}.jpg', 0.5)
        print(t, name, 'pieces', [len(r) for r in rings], 'area old', int((S0 > 0).sum()), 'new', int((S1 > 0).sum()), flush=True)
    json.dump(res, open(OUT, 'w'))
