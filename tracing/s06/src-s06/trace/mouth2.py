#!/usr/bin/env python3
# mouth2.py: the smile of s06 (measurement only). The mouth line comes from mouthline.py (fitted on every source
# frame). Everything else that moves in the mouth patch (lower-lip hatching, the upper-lip marks, the stubble) is the
# neutral mean's traced ink (trace.py), moved per source frame by the optical flow (DIS) neutral -> frame sampled at
# each point. Writes out/mouth2.json and src/shots/s06/data/mouth.js.
import cv2, numpy as np, json, os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, '../../../..')); SRC = os.path.join(ROOT, 'snapshots/s06-r2-src'); OUT = os.path.join(SRC, 'out')
MP = [[900, 640], [960, 650], [1060, 655], [1160, 640], [1215, 615], [1255, 620], [1262, 660], [1235, 700], [1160, 758], [1060, 768], [970, 760], [915, 720], [898, 680]]
BOX = [890, 605, 1270, 775]
MN = [[950, 699], [985, 692], [1020, 685], [1045, 686], [1062, 690], [1080, 687], [1110, 683], [1145, 687], [1185, 694]]
band = [[x, y - 3.5] for x, y in MN] + [[x, y + 4] for x, y in MN[::-1]]
LIP = [[985, 707], [1030, 703], [1080, 704], [1140, 708], [1148, 722], [1130, 748], [1060, 752], [995, 744], [982, 725]]
icfg = {"src": os.path.join(SRC, 'neutral_pre.npy'), "mask_src": os.path.join(SRC, 'neutral.npy'), "mode": "dark", "box": BOX,
        "lit": {"blur": 2, "thr": 60, "erode": 0}, "include": [MP], "exclude": [[band, 0], [LIP, 0]],
        "sigmas": [0.8, 1.3], "hi": 6, "lo": 3, "dmin": 4, "prof": 4, "minlen": 4, "bgr": 9}
cp = os.path.join(OUT, 'mouth2_ink.cfg.json'); json.dump(icfg, open(cp, 'w'))
subprocess.run(['python3', os.path.join(HERE, 'trace.py'), cp, os.path.join(OUT, 'mouth2_ink.json'), os.path.join(OUT, 'mouth2_ink.dbg.png')])
INK = json.load(open(os.path.join(OUT, 'mouth2_ink.json')))
# the lower lip's close horizontal hatching: row tracer (rows.py)
rc = {"src": os.path.join(SRC, 'neutral_pre.npy'), "include": [LIP], "angle": 0, "dy": 1.3, "min_dark": 0.05, "minlen": 6, "step": 3}
json.dump(rc, open(os.path.join(OUT, 'mouth2_rows.cfg.json'), 'w'))
subprocess.run(['python3', os.path.join(HERE, 'rows.py'), os.path.join(OUT, 'mouth2_rows.cfg.json'), os.path.join(OUT, 'mouth2_rows.json'), os.path.join(OUT, 'mouth2_rows.dbg.png')])
INK += json.load(open(os.path.join(OUT, 'mouth2_rows.json')))
# the bristle comb above the upper lip (comb.py)
cc = {"src": os.path.join(SRC, 'neutral_pre.npy'), "base": [[958, 697], [985, 692], [1020, 685], [1045, 686], [1062, 690], [1080, 687], [1110, 683], [1145, 687], [1178, 693]], "off": 7, "side": 1, "len": 9, "min_dark": 0.035}
json.dump(cc, open(os.path.join(OUT, 'mouth2_comb.cfg.json'), 'w'))
subprocess.run(['python3', os.path.join(HERE, 'comb.py'), os.path.join(OUT, 'mouth2_comb.cfg.json'), os.path.join(OUT, 'mouth2_comb.json'), os.path.join(OUT, 'mouth2_comb.dbg.png')])
INK += json.load(open(os.path.join(OUT, 'mouth2_comb.json')))
old = os.path.join(OUT, 'mouth2.json')
if os.path.exists(old):   # keep calibrated ink values if the strokes are the same
    O = json.load(open(old))
    if len(O.get('ink', [])) == len(INK) and all(len(a) == len(b) for a, b in zip(O['ink'], INK)): INK = O['ink']
neu = np.load(os.path.join(SRC, 'neutral.npy')); N8 = np.ascontiguousarray(np.clip(neu, 0, 255).astype(np.uint8))
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
def disp(img):
    F = dis.calc(N8, np.ascontiguousarray(np.clip(img, 0, 255).astype(np.uint8)), None)
    F = cv2.GaussianBlur(F, (0, 0), 2)
    return [[[round(float(F[int(round(p[1])), int(round(p[0]))][0]), 1), round(float(F[int(round(p[1])), int(round(p[0]))][1]), 1)] for p in st] for st in INK]
fr = lambda i: cv2.imread(os.path.join(SRC, 'f%03d.png' % i), 0).astype(np.float32)
t_of = lambda i: round(26.72 + (i - 1) * 0.04, 2)
L = json.load(open(os.path.join(OUT, 'mouthline.json')))
res = {'ink': INK, 'neutral_line': L['neutral'], 'smile_line': L['smile'], 'smile_d': disp(np.load(os.path.join(SRC, 'smile.npy'))), 'frames': []}
MOVING = list(range(1, 4)) + list(range(11, 43))   # 26.72-26.80, 27.12-28.36 (the rest hold)
for f in L['frames']:
    i = int(round((f['t'] - 26.72) / 0.04)) + 1
    if i in MOVING: res['frames'].append({'t': f['t'], 'line': f['line'], 'd': disp(fr(i))})
json.dump(res, open(old, 'w'))
print(len(INK), 'strokes', len(res['frames']), 'frames')
subprocess.run(['python3', os.path.join(HERE, 'mouth2js.py')])
