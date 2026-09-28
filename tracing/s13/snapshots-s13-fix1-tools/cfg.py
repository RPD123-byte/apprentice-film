# shared config for the s13 fix1 measurement scripts
from common import *
SP = 40
def ellx(cx, cy, rx, ry): return lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1
def boxx(x0, y0, x1, y1): return lambda x, y: x0 <= x <= x1 and y0 <= y <= y1
EXC = {
  'head': [ellx(964, 332, 50, 75), ellx(1177, 323, 80, 81), boxx(995, 385, 1125, 520), ellx(1015, 125, 95, 55), ellx(1470, 285, 110, 150), boxx(1290, 225, 1325, 305), boxx(1060, 0, 1480, 60)],
  'headF': [ellx(1109, 342, 82, 86), ellx(1336, 319, 74, 82), boxx(1180, 380, 1285, 505), ellx(1100, 135, 90, 55), boxx(800, 150, 965, 480), boxx(1430, 150, 1560, 420), boxx(880, 0, 1480, 110)],
  'headE': [ellx(1035, 343, 80, 88), ellx(1277, 325, 86, 90), boxx(1105, 390, 1205, 510), ellx(1050, 140, 90, 55), boxx(780, 150, 925, 470), boxx(1400, 150, 1545, 420), boxx(860, 0, 1480, 110)],
  'body': [], 'wing': [], 'tail': [], 'nub': [], 'farA': [], 'farB': [],
}
EXB = {  # feature boxes left out of the stroke statistics (eyes, beak, bandage, headphones)
  'head': [('e', 964, 332, 50, 75), ('e', 1177, 323, 80, 81), (990, 380, 1130, 525), (925, 70, 1105, 180), (1370, 0, 1600, 480), (1060, 0, 1370, 62), (1290, 225, 1325, 305)],
  'headF': [(1030, 250, 1420, 430), (1175, 380, 1290, 510), (1010, 80, 1190, 190), (800, 150, 965, 480), (1425, 150, 1560, 420), (880, 0, 1480, 95)],
  'headE': [(955, 250, 1365, 425), (1100, 390, 1210, 515), (960, 85, 1140, 200), (780, 150, 925, 470), (1395, 150, 1545, 420), (860, 0, 1480, 95)],
}
JOBS = [('head', '891-898', 'silC', 'head'), ('body', '891-898', 'silC', 'body'), ('wing', '891-898', 'silC', 'wing'), ('tail', '891-898', 'silC', 'tail'),
        ('nub', '891-898', 'silC', 'nub'), ('headF', '901-902', 'silD', 'headF'), ('headE', '912', 'silX', 'SILE'), ('farA', '884-885', 'silX', 'SILFAR.A'), ('farB', '886-887', 'silX', 'SILFAR.B')]
def rings_for(mod, key):
    if mod == 'silX':
        if key == 'SILE': return jsdata('silX', 'SILE')
        return jsdata('silX', 'SILFAR')[key.split('.')[1]]
    return jsdata(mod)[key]

# the measured key lines of a part (drawn as their own strokes) are left out of its hatching statistics
def keylines_mask(name):
    m = np.ones((946, 2206), np.uint8)
    import re
    if name in ('wing', 'tail', 'head', 'headF'):
        s = open(ROOT + '/src/shots/s13/wingC.js').read()
        i, j, k = s.index('export const TAILLINES'), s.index('export const HEADLINES'), s.index('export const FACELINES_D')
        s = s[:i] if name == 'wing' else s[i:j] if name == 'tail' else s[j:k] if name == 'head' else s[k:]
        for a in re.findall(r'\[\[([\d.]+), ([\d.]+)\], \[([\d.]+), ([\d.]+)\], \[([\d.]+), ([\d.]+)\], ([\d.]+), ([\d.]+)\]', s):
            v = list(map(float, a)); t = np.linspace(0, 1, 40)[:, None]
            p0, p1, p2 = np.array(v[0:2]), np.array(v[2:4]), np.array(v[4:6])
            B = (1 - t) ** 2 * p0 + 2 * t * (1 - t) * p1 + t ** 2 * p2
            cv2.polylines(m, [np.round(B).astype(np.int32).reshape(-1, 1, 2)], False, 0, int(v[6] + 4))
    return m

def apply_exb(M, name):
    for b in EXB.get(name, []):
        if b[0] == 'e':
            m = np.zeros_like(M); cv2.ellipse(m, ((b[1], b[2]), (2 * b[3], 2 * b[4]), 0), 1, -1); M[m > 0] = 0
        else:
            x0, y0, x1, y1 = b; M[y0:y1, x0:x1] = 0
    return M
