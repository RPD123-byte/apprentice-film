import cv2, glob, sys, re, json, subprocess, numpy as np
d, out = sys.argv[1], sys.argv[2]
t0, t1 = float(sys.argv[3]), float(sys.argv[4])
fs = sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
fs = [f for f in fs if t0-1e-6 <= float(re.search(r'at-([\d.]+)s', f).group(1)) <= t1+1e-6]
ts = [re.search(r'at-([\d.]+)s', f).group(1) for f in fs]
cups = json.loads(subprocess.check_output(['node','/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/cups.mjs']+ts))
tiles=[]
for f,t in zip(fs,ts):
    side,cx,cy = cups[str(float(t)) if str(float(t)) in cups else t] if (str(float(t)) in cups or t in cups) else cups[list(cups)[0]]
    # cup-local bbox u -150..200, v -90..120 rotated
    R = [[1,0,0,1],[0,1,-1,0],[-1,0,0,-1],[0,-1,1,0]][side]
    pts = np.array([[u,v] for u in (-150,200) for v in (-90,120)], float)
    X = cx + R[0]*pts[:,0] + R[2]*pts[:,1]; Y = cy + R[1]*pts[:,0] + R[3]*pts[:,1]
    x0,x1,y0,y1 = int(max(0,X.min())), int(min(2206,X.max())), int(max(0,Y.min())), int(min(946,Y.max()))
    A = cv2.imread(f)[y0:y1,x0:x1]; B = cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
    im = np.hstack([A, np.full((A.shape[0],4,3),(0,0,255),np.uint8), B])
    im = cv2.resize(im, (int(im.shape[1]*300/im.shape[0]), 300)) if im.shape[0]!=300 else im
    cv2.putText(im, t, (5,20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,255), 2)
    tiles.append(im)
W = max(t.shape[1] for t in tiles)
tiles = [np.hstack([t, np.zeros((300, W-t.shape[1],3),np.uint8)]) for t in tiles]
per = int(sys.argv[5]) if len(sys.argv)>5 else 6
for i in range(0,len(tiles),per):
    cv2.imwrite(f'{out}-{i//per}.jpg', np.vstack(tiles[i:i+per]), [cv2.IMWRITE_JPEG_QUALITY, 90])
print(len(tiles))
