# owlsheet.py step zoom outprefix [t0 t1]: render|source crops around the owl, every `step` frames
import cv2, numpy as np, sys
step=int(sys.argv[1]); z=float(sys.argv[2]); pre=sys.argv[3]
t0=float(sys.argv[4]) if len(sys.argv)>4 else 69.44; t1=float(sys.argv[5]) if len(sys.argv)>5 else 74.48
def interp(K,t):
    if t<=K[0][0]: return K[0][1:]
    if t>=K[-1][0]: return K[-1][1:]
    i=0
    while K[i+1][0]<t: i+=1
    a,b=K[i],K[i+1]; u=(t-a[0])/(b[0]-a[0]); return [x+(y-x)*u for x,y in zip(a[1:],b[1:])]
WALK_CX=[[69.44,20],[69.56,49],[69.64,69],[69.72,91],[69.8,109],[69.88,130],[69.96,145],[70.04,163],[70.12,182],[70.2,203],[70.28,225],[70.36,245],[70.44,266],[70.52,288],[70.6,308],[70.68,328],[70.76,347],[70.845,366]]
FLY=[[71.98,388,800],[72.0,390,790],[72.04,403,736],[72.08,417,686],[72.12,424,635],[72.16,420,585],[72.2,411,544],[72.24,393,513],[72.28,367,478],[72.32,331,441],[72.36,304,410],[72.4,279,382],[72.44,253,349],[72.48,233,308],[72.52,226,261],[72.56,220,215],[72.6,221,157],[72.64,222,114],[72.68,227,79],[72.72,231,56],[72.76,233,40],[72.8,236,44],[72.84,233,38],[72.92,243,63],[73.0,247,74]]
def win(t):
    if t<70.845: cx=interp(WALK_CX,t)[0]; return (int(cx-190),690,int(cx+130),910)
    if t<71.98: return (230,690,550,910)
    if t<72.72: cx,cy=interp(FLY,t); return (int(cx-180),int(cy-110),int(cx+140),int(cy+110))
    if t<73.3: return (60,0,420,220)
    return (180,0,580,220)
tiles=[]
fr=[f for f in range(1736,1863,step) if t0-1e-6<=f/25<=t1+1e-6]
for f in fr:
    t=f/25; x0,y0,x1,y1=win(t)
    R=cv2.imread(f'../s21-fix2-h/r-{t:.2f}.png'); S=cv2.imread(f'../s21-r3-src/f{f:04d}.png')
    def cr(im):
        H,W=im.shape[:2]; pad=cv2.copyMakeBorder(im,300,300,300,300,cv2.BORDER_CONSTANT,value=(40,0,40))
        c=pad[y0+300:y1+300,x0+300:x1+300]; c=cv2.resize(c,None,fx=z,fy=z,interpolation=cv2.INTER_AREA if z<1 else cv2.INTER_CUBIC); return c
    a,b=cr(R),cr(S)
    cv2.putText(a,f'R {t:.2f}',(4,16),0,0.5,(0,255,0),1); cv2.putText(b,f'S {t:.2f} ({x0},{y0})',(4,16),0,0.5,(0,255,255),1)
    tiles.append(np.hstack([a,np.full((a.shape[0],3,3),255,np.uint8),b]))
mw=max(t.shape[1] for t in tiles); mh=max(t.shape[0] for t in tiles)
tiles=[cv2.copyMakeBorder(t,0,mh-t.shape[0],0,mw-t.shape[1],cv2.BORDER_CONSTANT,value=(0,0,0)) for t in tiles]
# pack 2 per row, 6 rows per sheet
k=0
for s in range(0,len(tiles),12):
    grp=tiles[s:s+12]
    while len(grp)%2: grp.append(np.zeros_like(grp[0]))
    rows=[np.hstack([grp[i],np.full((grp[i].shape[0],8,3),128,np.uint8),grp[i+1]]) for i in range(0,len(grp),2)]
    cv2.imwrite(f'{pre}-{k}.jpg',np.vstack([np.vstack([r,np.full((6,r.shape[1],3),128,np.uint8)]) for r in rows]),[cv2.IMWRITE_JPEG_QUALITY,88]); k+=1
print(k,'sheets',len(tiles))
