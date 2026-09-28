# KLT feature tracks over the unique source frames of s15 (held duplicates skipped), owl masked out.
# out: tracks.npz with obs list [(frame_idx, track_id, x, y)]
import cv2, numpy as np, re, json, sys
SRC = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
HOLDS = {1023, 1042, 1048, 1067, 1072, 1092, 1097, 1117, 1121, 1142}
txt = open('/Users/computer/rootline/apprentice-film/src/shots/s15/track.js').read()
OWL = json.loads('[' + re.search(r'OWL = \[(.*?)\];', txt, re.S).group(1) + ']')
owl = {int(round(r[0] * 25)): r for r in OWL}
a, b = int(sys.argv[1]), int(sys.argv[2])
frames = [i for i in range(a, b + 1) if i not in HOLDS]
def mask_for(i):
    m = np.full((946, 2206), 255, np.uint8)
    r = owl.get(i)
    if r:
        _, cx, cy, w, h = r
        cv2.rectangle(m, (int(cx - 0.75 * w), int(cy - 0.95 * h)), (int(cx + 0.75 * w), int(cy + 1.1 * h)), 0, -1)
    m[:8] = 0; m[-8:] = 0; m[:, :8] = 0; m[:, -8:] = 0
    return m
obs = []
prev = None; pts = None; ids = None; nid = 0
lk = dict(winSize=(31, 31), maxLevel=5, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, 0.01))
for fi, i in enumerate(frames):
    g = cv2.imread(f'{SRC}/f{i}.png', 0)
    m = mask_for(i)
    if prev is not None and len(pts):
        p1, st, err = cv2.calcOpticalFlowPyrLK(prev, g, pts, None, **lk)
        p0r, st2, _ = cv2.calcOpticalFlowPyrLK(g, prev, p1, None, **lk)
        fb = np.linalg.norm(pts - p0r, axis=2).ravel()
        ok = (st.ravel() == 1) & (st2.ravel() == 1) & (fb < 1.0)
        xy = p1.reshape(-1, 2)
        inb = (xy[:, 0] > 8) & (xy[:, 0] < 2198) & (xy[:, 1] > 8) & (xy[:, 1] < 938)
        ok &= inb
        ok[ok] &= m[xy[ok, 1].astype(int), xy[ok, 0].astype(int)] > 0
        # epipolar sanity: fundamental RANSAC
        if ok.sum() > 20:
            F, inl = cv2.findFundamentalMat(pts.reshape(-1, 2)[ok], xy[ok], cv2.FM_RANSAC, 1.5, 0.999)
            if inl is not None:
                okk = np.where(ok)[0]; ok[okk[inl.ravel() == 0]] = False
        pts = p1[ok]; ids = ids[ok]
    else:
        pts = np.zeros((0, 1, 2), np.float32); ids = np.zeros(0, int)
    # new corners away from existing ones
    mm = m.copy()
    for p in pts.reshape(-1, 2): cv2.circle(mm, (int(p[0]), int(p[1])), 12, 0, -1)
    newp = cv2.goodFeaturesToTrack(g, 2500, 0.004, 12, mask=mm, blockSize=7)
    if newp is not None:
        pts = np.concatenate([pts, newp.astype(np.float32)]); ids = np.concatenate([ids, np.arange(nid, nid + len(newp))]); nid += len(newp)
    for p, k in zip(pts.reshape(-1, 2), ids): obs.append((i, k, p[0], p[1]))
    prev = g
    print(i, f'{i/25:.2f}', 'tracks', len(pts), file=sys.stderr)
obs = np.array(obs)
np.save(f'/Users/computer/rootline/apprentice-film/snapshots/s15-sfm/obs_{a}_{b}.npy', obs)
print('saved', len(obs))
