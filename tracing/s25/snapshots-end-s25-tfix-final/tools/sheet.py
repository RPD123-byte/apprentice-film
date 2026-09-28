# sheet.py OUT f0 f1 [step] [x0 y0 x1 y1] [--w W] [--dirs d1,d2,...]  rows: SRC then each dir; cols: frames
import cv2, numpy as np, sys, os
M='/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-meas'
a=sys.argv[1:]; opts={}; pos=[]
i=0
while i<len(a):
    if a[i].startswith('--'): opts[a[i]]=a[i+1]; i+=2
    else: pos.append(a[i]); i+=1
out=pos[0]; f0=int(pos[1]); f1=int(pos[2]); st=int(pos[3]) if len(pos)>3 else 1
roi=[int(v) for v in pos[4:8]] if len(pos)>=8 else [0,0,2206,946]
tw=int(opts.get('--w',360)); dirs=opts.get('--dirs','').split(',') if opts.get('--dirs') else []
rows=[]
for lab,src in [('SRC',None)]+[(os.path.basename(d.rstrip('/')),d) for d in dirs]:
    tiles=[]
    for f in range(f0,f1+1,st):
        p=os.path.join(M,f'src_{f:05d}.png') if src is None else os.path.join(src,f'{f}.png')
        im=cv2.imread(p)
        if im is None: im=np.zeros((946,2206,3),np.uint8)
        im=im[roi[1]:roi[3],roi[0]:roi[2]]
        th=int(im.shape[0]*tw/im.shape[1]); im=cv2.resize(im,(tw,th),interpolation=cv2.INTER_AREA)
        cv2.putText(im,f'{lab} {f/25:.2f}',(4,16),0,0.45,(0,255,255),1); tiles.append(im)
    rows.append(np.hstack(tiles))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
