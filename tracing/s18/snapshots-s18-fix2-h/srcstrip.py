import cv2, numpy as np, sys, re
# srcstrip.py out.jpg x0 y0 x1 y1 scale frames... [--reg]  source crops tiled (with optional render dir via --r DIR)
args=[a for a in sys.argv[1:]]; reg='--reg' in args; args=[a for a in args if a!='--reg']
rdir=None
if '--r' in args: i=args.index('--r'); rdir=args[i+1]; del args[i:i+2]
out=args[0]; x0,y0,x1,y1=map(int,args[1:5]); sc=float(args[5]); frames=[int(a) for a in args[6:]]
txt=open('../../src/shots/s18/shotA.js').read(); PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
tiles=[]
for n in frames:
    dx,dy=P[n] if (reg and n in P) else (0,0)
    def cut(img):
        c=np.zeros((y1-y0,x1-x0,3),np.uint8); ya,xa=max(0,y0+dy),max(0,x0+dx); yb,xb=min(946,y1+dy),min(2206,x1+dx)
        c[ya-(y0+dy):yb-(y0+dy),xa-(x0+dx):xb-(x0+dx)]=img[ya:yb,xa:xb]; return c
    s=cut(cv2.imread('../s18-fix2-src/f%04d.png'%n)); t=[s]
    if rdir: t.insert(0,cut(cv2.imread('%s/r%d.png'%(rdir,n))))
    t=np.vstack([cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC) for a in t])
    cv2.putText(t,str(n),(4,16),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,0,255),1)
    tiles.append(np.pad(t,((0,4),(0,4),(0,0))))
cols=int(np.ceil(np.sqrt(len(tiles)*1.0)))
rows=[np.hstack(tiles[i:i+cols]+[np.zeros_like(tiles[0])]*(cols-len(tiles[i:i+cols]))) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
