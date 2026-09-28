# error maps: blurred abs error per frame, averaged over frame ranges in OUTPUT coords; plus F0-warped mean signed error
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-p4-tools')
from cam import f0, M
rd=sys.argv[1]; out=sys.argv[2]
def ld(p): return cv2.imread(p).astype(np.float32)
acc={}
for name,rng_ in (('early',range(764,772)),('mid',range(785,793)),('late',range(806,815))):
    E=0; S=0
    for k in rng_:
        r=ld(f'{rd}/r{k}.png'); s=ld(f'snapshots/s08-p4-src/f{k}.png')
        rb=cv2.GaussianBlur(r,(0,0),3); sb=cv2.GaussianBlur(s,(0,0),3)
        E=E+np.abs(rb-sb).mean(-1); S=S+(rb-sb).mean(-1)
    E/=len(rng_); S/=len(rng_)
    e=np.clip(E*8,0,255).astype(np.uint8); e=cv2.applyColorMap(e,cv2.COLORMAP_JET)
    sg=np.clip(128+S*6,0,255).astype(np.uint8); sg=cv2.applyColorMap(sg,cv2.COLORMAP_COOL)
    cv2.imwrite(f'{out}/emap_{name}.jpg',cv2.resize(e,(1103,473)),[cv2.IMWRITE_JPEG_QUALITY,85])
    # print top cells 100px
    cells=[]
    for y in range(0,946,100):
        for x in range(0,2206,100):
            cells.append((E[y:y+100,x:x+100].mean(),S[y:y+100,x:x+100].mean(),x,y))
    cells.sort(reverse=True)
    print(name,' '.join(f'({x},{y}):{m:.1f}/{sgn:+.1f}' for m,sgn,x,y in cells[:14]))
