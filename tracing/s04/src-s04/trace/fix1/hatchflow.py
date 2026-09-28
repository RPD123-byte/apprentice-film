# hatchflow.py : the image motion between consecutive source frames of s04 (478-577), for anchoring the hatching to
# the drawing (s04/hatch.js): for every frame f, DIS optical flow from f to its neighbour one step nearer the hold frame
# 514 (f-1 for f > 514, f+1 for f < 514), smoothed (sigma 12) and sampled on a 48 px grid. Writes s04/hatchflow.js
# (1/4 px, delta-coded like the key flows). Measurements only (node displacements).
import cv2, numpy as np, os, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
cap=None
def src(fi):
    global cap
    p=f'{SP}/{fi}.png'
    if os.path.exists(p): return cv2.imread(p)
    if cap is None: cap=cv2.VideoCapture(V)
    cap.set(cv2.CAP_PROP_POS_FRAMES,fi); ok,f=cap.read(); cv2.imwrite(p,f); return f
G=lambda fi: cv2.GaussianBlur(cv2.cvtColor(src(fi),cv2.COLOR_BGR2GRAY),(0,0),1.5)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
W,H=2206,946; S=48; nx,ny=W//S+2,H//S+2
xs=np.minimum(np.arange(nx)*S,W-1); ys=np.minimum(np.arange(ny)*S,H-1)
ALPHA=[chr(c) for c in range(35,127) if c!=92]
def enc(a):   # row-major, x plane then y plane, deltas in 1/4 px: one char for -40..40, else escape + 2 chars
    out=[]
    for plane in (0,1):
        v=0
        for k in a[...,plane].ravel():
            q=int(round(k*4)); d=q-v
            if -40<=d<=40: out.append(ALPHA[d+40])
            else:
                z=q+4000; out.append(ALPHA[81]+ALPHA[z//91]+ALPHA[z%91])
            v=q
    return ''.join(out)
res={}
for f in range(478,578):
    if f==514: continue
    g=f-1 if f>514 else f+1
    fl=dis.calc(G(f),G(g),None)                       # for each pixel of f: where it is in g
    fl=np.stack([cv2.GaussianBlur(fl[...,0],(0,0),12),cv2.GaussianBlur(fl[...,1],(0,0),12)],-1)
    grid=fl[ys][:,xs]
    res[str(f)]=enc(grid)
    print(f, 'mean', np.round(grid.reshape(-1,2).mean(0),2), 'max', round(float(np.abs(grid).max()),1), flush=True)
out='/Users/computer/rootline/apprentice-film/src/shots/s04/hatchflow.js'
open(out,'w').write('// s04: image motion between consecutive source frames (trace/fix1/hatchflow.py): per frame f, where each 48 px grid\n'
  '// node of f sits in the neighbouring frame one step nearer 20.56 (f-1 past 514, f+1 before it); 1/4 px, delta-coded.\n'
  '// Used only to anchor the generated hatching to the drawing (s04/hatch.js). Measurements only.\n'
  f'export const HATCHFLOW = {{ S: {S}, nx: {nx}, ny: {ny}, f: {json.dumps(res)} }};\n')
print('wrote', out, os.path.getsize(out))
