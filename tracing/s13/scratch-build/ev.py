# usage: ev.py OUTDIR [frames...]  -- pairs render frames (frame-*-at-Ts.png) with exact source frames, prints metrics
import cv2, glob, re, sys, numpy as np, json, os
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s13-rev1-p3-src'
out = sys.argv[1]
R = {
 'cupL_D': (820,180,980,500), 'cupR_D': (1380,140,1520,440), 'cup3q': (1370,20,1560,420), 'undercup': (1430,395,1525,475),
 'wingroot': (1480,480,1700,700), 'shoulder': (1480,330,1600,480), 'beakC': (1000,390,1110,510), 'beakD': (1190,385,1285,505),
 'tail': (1560,640,1860,946), 'footL': (1160,840,1330,946), 'chest': (960,480,1420,820), 'bandD': (880,0,1480,250),
 'lowfaceD': (880,400,1180,640), 'bandageC': (930,60,1110,180), 'bandageD': (1000,70,1180,190),
}
def fidx(p):
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); k = int(np.floor(t*30+1e-6)); return int(np.floor(k/30*25+1e-3))
res = {}
for p in sorted(glob.glob(out+'/frame-*.png')):
    fi = fidx(p); a = cv2.imread(p, 0).astype(np.float32); b = cv2.imread(f'{SRC}/f{fi}.png', 0).astype(np.float32)
    ba, bb = cv2.GaussianBlur(a,(0,0),8), cv2.GaussianBlur(b,(0,0),8)
    d = np.abs(ba-bb); r = {'all': float(d.mean()), 'mean': float(a.mean()-b.mean())}
    for k,(x0,y0,x1,y1) in R.items(): r[k] = float(d[y0:y1,x0:x1].mean()); r[k+'_dm'] = float((ba-bb)[y0:y1,x0:x1].mean())
    ma = cv2.GaussianBlur(a,(0,0),1) > 70; mb = cv2.GaussianBlur(b,(0,0),1) > 70
    r['iou'] = float((ma&mb).sum()/(ma|mb).sum())
    res[fi] = r
keys = sys.argv[2].split(',') if len(sys.argv) > 2 else ['all','iou','cup3q','undercup','wingroot','beakC','tail','footL','chest']
print('fi   ' + ' '.join(f'{k[:9]:>9}' for k in keys))
for fi in sorted(res): print(f'{fi} ' + ' '.join(f'{res[fi][k]:9.2f}' for k in keys))
json.dump(res, open(out+'/metrics.json','w'))
