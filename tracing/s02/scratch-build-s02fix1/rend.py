# rend.py OUTNAME k1,k2,... [--pairs]  : render source frame indices k exactly (t = round(1.2k)/30 + 1e-4, which the
# snapshot tool floors to 1/30 and s02 rounds to frame k), then pair each with the true source frame src/fKKK.png.
# Writes /Users/computer/rootline/apprentice-film/snapshots/OUTNAME/ (tool output) and ./out/OUTNAME/rKKK.png + pKKK.jpg
import sys, os, subprocess, glob, re, math, cv2, numpy as np
name=sys.argv[1]; ks=[int(v) for v in sys.argv[2].split(',')]
proj='/Users/computer/rootline/apprentice-film'
ts=[]
for k in ks:
    n=round(1.2*k); t=n/30+1e-4
    assert math.floor(math.floor(t*30)/30*25+0.5)==k, k
    ts.append(f'{t:.4f}')
out=f'snapshots/{name}'
if "--skip" not in sys.argv:
    r=subprocess.run(['sh','tools/compare.sh',','.join(ts),out],cwd=proj,capture_output=True,text=True)
    print(r.stdout[-2000:], r.stderr[-2000:])
od=f'out/{name}'; os.makedirs(od,exist_ok=True)
for k,t in zip(ks,ts):
    i=ks.index(k); fs=glob.glob(f'{proj}/{out}/frame-{i:02d}-at-*s.png')
    if not fs: print('missing',k,t); continue
    R=cv2.imread(fs[0]); cv2.imwrite(f'{od}/r{k:03d}.png',R)
    S=cv2.imread(f'src/f{k:03d}.png')
    ga=cv2.GaussianBlur(cv2.cvtColor(R,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    gb=cv2.GaussianBlur(cv2.cvtColor(S,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    mae=np.abs(ga-gb).mean()
    pair=np.hstack([R,np.full((R.shape[0],8,3),(0,0,255),np.uint8),S])
    pair=cv2.resize(pair,(2200,int(pair.shape[0]*2200/pair.shape[1])),interpolation=cv2.INTER_AREA)
    cv2.putText(pair,f"f{k} t={k/25:.2f} MAE8={mae:.1f} mean {ga.mean():.1f}/{gb.mean():.1f}",(8,26),0,0.8,(0,255,255),2)
    cv2.imwrite(f'{od}/p{k:03d}.jpg',pair,[cv2.IMWRITE_JPEG_QUALITY,88])
    print(f'f{k} t={k/25:.2f} MAE8={mae:5.1f} mean {ga.mean():5.1f}/{gb.mean():5.1f}')
