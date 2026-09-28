# Complete a designer key where its traced outline cut part of his figure off (the near sleeve in the end orbit):
# GrabCut on the source frame from a hand polygon of the missing part, then trace that part (room_vec.py: flat colour
# regions + ink, un-graded, on a registered grain-free median) and append it to the key; the outline is grown to cover it.
# Measurement -> vector data only. usage: sleeve.py T DKEY.js HAND_JSON [--k 14] [--dry]
import sys, json, re, subprocess, cv2, numpy as np, os
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from common import load
from codec import enc, dec
TOOLS = '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools'
WORK = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/sleeve'
os.makedirs(WORK, exist_ok=True)
a = sys.argv[1:]; T = float(a[0]); DK = a[1]; hand = np.array(json.loads(a[2]), float)
K = int(a[a.index('--k') + 1]) if '--k' in a else 14
f0 = load(T); H, W = f0.shape[:2]
s = open(DK).read()
m = re.search(r'export const (\w+_OUTLINE) = "((?:[^"\\]|\\.)*)";', s)
ONAME = m.group(1); out = np.array(dec(m.group(2).encode().decode('unicode_escape')), float).reshape(-1, 2) / 2
OM = np.zeros((H, W), np.uint8); cv2.fillPoly(OM, [np.int32(np.round(out))], 1)
HM = np.zeros((H, W), np.uint8); cv2.fillPoly(HM, [np.int32(np.round(hand))], 1)
E = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
near = cv2.dilate(HM, E(30))
g = np.full((H, W), cv2.GC_BGD, np.uint8)
g[near > 0] = cv2.GC_PR_BGD; g[HM > 0] = cv2.GC_PR_FGD
g[(cv2.erode(HM, E(9)) > 0)] = cv2.GC_FGD; g[(cv2.erode(OM, E(4)) > 0) & (near > 0)] = cv2.GC_FGD
ys, xs = np.nonzero(near); x0, x1, y0, y1 = max(0, xs.min() - 20), min(W, xs.max() + 20), max(0, ys.min() - 20), min(H, ys.max() + 20)
fb = cv2.bilateralFilter(f0, 7, 30, 5)
gg = g[y0:y1, x0:x1].copy(); bg = np.zeros((1, 65)); fg = np.zeros((1, 65))
cv2.grabCut(np.ascontiguousarray(fb[y0:y1, x0:x1]), gg, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
SM = np.zeros((H, W), np.uint8); SM[y0:y1, x0:x1] = ((gg == cv2.GC_FGD) | (gg == cv2.GC_PR_FGD))
SM &= near
NM = (OM | SM).astype(np.uint8)
NM = cv2.morphologyEx(NM, cv2.MORPH_CLOSE, E(4)); NM = cv2.morphologyEx(NM, cv2.MORPH_OPEN, E(2))
cs, _ = cv2.findContours(NM, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
NM2 = np.zeros_like(NM); cv2.drawContours(NM2, [c], -1, 1, -1)
newO = cv2.approxPolyDP(c, 0.6, True).reshape(-1, 2)
NEW = NM2 & (1 - OM)
print('T', T, 'added px', int(NEW.sum()), 'outline', len(out), '->', len(newO))
tag = ('%.2f' % T).replace('.', '_')
ov = f0.copy(); cv2.polylines(ov, [np.int32(out)], True, (0, 0, 255), 1); cv2.polylines(ov, [newO.astype(np.int32)], True, (0, 255, 0), 1)
cv2.imwrite(f'{WORK}/ov_{tag}.jpg', cv2.resize(ov[max(0, y0 - 60):y1 + 60, max(0, x0 - 60):x1 + 60], None, fx=2, fy=2))
if '--dry' in a: sys.exit()
# trace the added part (+6 px into the old key for overlap, +6 px beyond the new outline so the edge ink is traced)
TM = cv2.dilate(NEW, E(6)) & cv2.dilate(NM2, E(6))
mk = np.zeros((H, W, 3), np.uint8); mk[TM > 0] = (255, 0, 255); cv2.imwrite(f'{WORK}/mask_{tag}.png', mk)
med = f'{WORK}/med_{tag}.png'
subprocess.run(['python3', f'{TOOLS}/reg_median.py', str(T), med, '2', '5'], check=True)
js = f'{WORK}/tr_{tag}.js'
r = subprocess.run(['python3', f'{TOOLS}/room_vec.py', 'X', str(T), str(T), str(T), f'{WORK}/mask_{tag}.png', js, str(K), '--medimg', med,
                    '--dil', '0', '--ring', '0', '--inkmin', '10', '--ink', '18', '--minarea', '12'], capture_output=True, text=True)
print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-800:])
t = open(js).read()
REGn = json.loads(re.search(r'export const X_REGIONS = (.*?);\n', t, re.S).group(1))
INKn = json.loads(re.search(r'export const X_INK = (.*?);\n', t, re.S).group(1))
REGe = [[r_[0]] + [enc(p) for p in r_[1:]] for r_ in REGn]
INKe = [[g_[0]] + [[enc(p) for p in poly] for poly in g_[1:]] for g_ in INKn]
def repl(s, name, val):
    m = re.search(r'export const %s = (.*?);\n' % name, s, re.S)
    return s[:m.start(1)] + val + s[m.end(1):]
names = re.findall(r'export const (\w+) = ', s)
RN = [n for n in names if n.endswith('_REGIONS')][0]; IN = [n for n in names if n.endswith('_INK')][0]
REG = json.loads(re.search(r'export const %s = (.*?);\n' % RN, s, re.S).group(1))
INK = json.loads(re.search(r'export const %s = (.*?);\n' % IN, s, re.S).group(1))
s = repl(s, RN, json.dumps(REG + REGe, separators=(',', ':')))
s = repl(s, IN, json.dumps(INK + INKe, separators=(',', ':')))
newEnc = enc([int(round(v * 2)) for q in newO for v in q]).replace('\\', '\\\\').replace('"', '\\"')
m = re.search(r'export const %s = "((?:[^"\\]|\\.)*)";' % ONAME, s)
s = s[:m.start(1)] + newEnc + s[m.end(1):]
open(DK, 'w').write(s)
print('appended regions', len(REGe), 'ink groups', len(INKe))
