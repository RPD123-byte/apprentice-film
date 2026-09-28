# sumev.py OUTDIR -- segment summary from metrics.json (+ sigma-3 MAE and IoU by pose)
import json, sys, numpy as np, cv2, glob, re
out = sys.argv[1]; M = {int(k): v for k, v in json.load(open(out + '/metrics.json')).items()}
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s13-rev1-p3-src'
def fidx(p):
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); k = int(np.floor(t*30+1e-6)); return int(np.floor(k/30*25+1e-3))
s3 = {}
for p in glob.glob(out + '/frame-*.png'):
    fi = fidx(p); a = cv2.imread(p, 0).astype(np.float32); b = cv2.imread(f'{SRC}/f{fi}.png', 0).astype(np.float32)
    s3[fi] = float(np.abs(cv2.GaussianBlur(a, (0, 0), 3) - cv2.GaussianBlur(b, (0, 0), 3)).mean())
P = {'All': range(884, 923), 'A 884-885': range(884, 886), 'B 886-887': range(886, 888), 'Settle 888-889': range(888, 890), 'C 890-898': range(890, 899),
     'Turn 899-900': range(899, 901), 'D 901-911': range(901, 912), 'E 912': range(912, 913), 'Return 913-922': range(913, 923)}
print('| Frames | sigma8 | sigma3 | IoU |')
for k, r in P.items():
    f = [i for i in r if i in M]
    print('| %s | %.2f | %.2f | %.3f |' % (k, np.mean([M[i]['all'] for i in f]), np.mean([s3[i] for i in f]), np.mean([M[i]['iou'] for i in f])))
reg = ['cup3q', 'cupL_D', 'cupR_D', 'undercup', 'wingroot', 'shoulder', 'beakC', 'beakD', 'tail', 'footL', 'chest', 'bandD', 'lowfaceD', 'bandageC', 'bandageD']
C = [i for i in M if 890 <= i <= 898 or 913 <= i <= 922 or 884 <= i <= 900]; D = [i for i in M if 901 <= i <= 911]
print('region: C-ish frames / D frames / E')
for k in reg: print('%-9s %.2f / %.2f / %.2f   dm %.2f / %.2f' % (k, np.mean([M[i][k] for i in C]), np.mean([M[i][k] for i in D]), M[912][k] if 912 in M else -1, np.mean([M[i][k + '_dm'] for i in C]), np.mean([M[i][k + '_dm'] for i in D])))
print('mean level offset range %.2f .. %.2f' % (min(M[i]['mean'] for i in M), max(M[i]['mean'] for i in M)))
