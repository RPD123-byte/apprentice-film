#!/usr/bin/env python3
# sbs.py RENDERDIR OUTDIR : every frame render | source into OUTDIR/sidebyside.mp4 (25 fps) and a contact sheet
import sys, os, cv2, glob, numpy as np
sys.path.insert(0,os.path.dirname(__file__)); from common import frame
d,out=sys.argv[1],sys.argv[2]; os.makedirs(out,exist_ok=True)
fs=sorted(int(os.path.basename(p)[1:-4]) for p in glob.glob(d+'/r*.png'))
vw=cv2.VideoWriter(out+'/sidebyside.mp4',cv2.VideoWriter_fourcc(*'mp4v'),25,(2206,473))
tiles=[]
for f in fs:
    p=np.hstack([cv2.imread(f'{d}/r{f}.png'),frame(f)]); p=cv2.resize(p,(2206,473),interpolation=cv2.INTER_AREA)
    cv2.putText(p,f'{f/25:.2f}',(8,26),0,0.8,(0,255,255),2); vw.write(p)
    if f%2==0: tiles.append(cv2.resize(p,(1100,236)))
vw.release()
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
sh=np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)])
cv2.imwrite(out+'/sheet.jpg',sh,[cv2.IMWRITE_JPEG_QUALITY,80]); print('wrote',out,len(fs))
