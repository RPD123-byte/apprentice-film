# blocks.py F : dense block matching of frame F against the globally warped B&W page and colour page
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def grab(F): cap.set(1,F); ok,f=cap.read(); return f
F=int(sys.argv[1]); R=int(sys.argv[2]) if len(sys.argv)>2 else 26
G=json.load(open(f'glob-{F}.json'))
fr=grab(F).astype(np.float32)
A=cv2.imread('../medA.png').astype(np.float32); Cc=grab(2937).astype(np.float32)
Wb=cv2.warpAffine(A,np.float32(G['bw']['M']),(2206,946),flags=cv2.INTER_LINEAR,borderValue=0)
Wc=cv2.warpAffine(Cc,np.float32(G['col']['M']),(2206,946),flags=cv2.INTER_LINEAR,borderValue=0)
np.save(f'Wb-{F}.npy',Wb.astype(np.uint8)); np.save(f'Wc-{F}.npy',Wc.astype(np.uint8))
gf=cv2.cvtColor(fr.astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
gb=cv2.cvtColor(Wb.astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
gc=cv2.cvtColor(Wc.astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
B=12; S=6
H,W=gf.shape
ys=list(range(B+R,H-B-R,S)); xs=list(range(B+R,W-B-R,S))
out=np.zeros((len(ys),len(xs),7),np.float32)   # score_b, dx_b, dy_b, score_c, dx_c, dy_c, std
for j,y in enumerate(ys):
    for i,x in enumerate(xs):
        t=gf[y-B:y+B,x-B:x+B]; sd=t.std(); out[j,i,6]=sd
        if sd<6: continue
        for k,ref in ((0,gb),(3,gc)):
            win=ref[y-B-R:y+B+R,x-B-R:x+B+R]
            m=cv2.matchTemplate(win,t,cv2.TM_CCOEFF_NORMED)
            _,mv,_,ml=cv2.minMaxLoc(m)
            out[j,i,k]=mv; out[j,i,k+1]=ml[0]-R; out[j,i,k+2]=ml[1]-R
np.save(f'blocks-{F}.npy',out); json.dump({'ys':ys,'xs':xs,'B':B,'S':S,'R':R},open(f'blocks-{F}.json','w'))
sb=out[...,0]; sc=out[...,3]
print('blocks',out.shape[:2],'bw>0.7: %.2f  col>0.7: %.2f  textured: %.2f'%((sb>0.7).mean(),(sc>0.7).mean(),(out[...,6]>=6).mean()))
vis=np.zeros(out.shape[:2]+(3,),np.uint8)
vis[...,1]=np.clip(sb*255,0,255); vis[...,2]=np.clip(sc*255,0,255)
cv2.imwrite(f'blocks-{F}.png',cv2.resize(vis,(1103,473),interpolation=cv2.INTER_NEAREST))
