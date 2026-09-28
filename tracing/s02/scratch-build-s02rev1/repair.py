# repair.py dir out.jpg [cols] [width] [x0 y0 x1 y1]: pair each render frame with the SOURCE frame it really shows
# (renderSeek floors t to 1/30 s; frame = round(q*25)); writes a sheet (render | source) and repaired mp4
import cv2, glob, re, sys, math, numpy as np
d,out=sys.argv[1],sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 2; W=int(sys.argv[4]) if len(sys.argv)>4 else 960
roi=list(map(int,sys.argv[5:9])) if len(sys.argv)>8 else None
cap=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tiles=[];seen=set()
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1)); q=math.floor(t*30+1e-6)/30; f=math.floor(q*25+0.5)
    if f in seen: continue
    seen.add(f)
    cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,S=cap.read(); R=cv2.imread(p)
    if roi: R=R[roi[1]:roi[3],roi[0]:roi[2]]; S=S[roi[1]:roi[3],roi[0]:roi[2]]
    pair=np.hstack([R,np.full((R.shape[0],8,3),(0,0,255),np.uint8),S])
    pair=cv2.resize(pair,(W,int(pair.shape[0]*W/pair.shape[1])),interpolation=cv2.INTER_AREA)
    cv2.putText(pair,f"f{f} t={f/25:.2f} (q={q:.3f})",(6,22),0,0.6,(0,255,255),2)
    tiles.append(pair)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
sheet=np.vstack(rows)
cv2.imwrite(out,sheet,[cv2.IMWRITE_JPEG_QUALITY,85]); print(out,len(tiles))
