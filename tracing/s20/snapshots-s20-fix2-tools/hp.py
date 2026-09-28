#!/usr/bin/env python3
# hp.py renderdir t1 t2 ... : per frame: high-pass (mean |I-blur3|) in the owl box, bright fraction above head, owl-box mean
import cv2, numpy as np, sys
D='/Users/computer/rootline/apprentice-film/snapshots/s20-fix2-src'
rd=sys.argv[1]
def st(im,box):
    x0,y0,x1,y1=box; a=im[y0:y1,x0:x1].astype(np.float32)
    hp=np.abs(a-cv2.GaussianBlur(a,(0,0),3)).mean()
    return hp,a.mean()
for t in sys.argv[2:]:
    fr=int(round(float(t)*25)); s=cv2.imread(f'{D}/f_{fr}.png',0); r=cv2.imread(f'{rd}/r_{float(t):.2f}.png',0)
    box=(900,380,1300,760)
    hs,ms=st(s,box); hr,mr=st(r,box)
    fs=(s[0:330,700:1600]>150).mean(); fr_=(r[0:330,700:1600]>150).mean()
    bs=cv2.GaussianBlur(s.astype(np.float32),(0,0),6); br=cv2.GaussianBlur(r.astype(np.float32),(0,0),6)
    mae=np.abs(bs-br).mean(); owl=np.abs(bs-br)[150:850,700:1500].mean()
    fan=np.abs(bs-br)[0:380,700:1600].mean()
    print(f'fan {fan:.1f} ', end='')
    print(f'{t} fr{fr} hp src {hs:.1f} r {hr:.1f} | owlbox mean {ms:.0f}/{mr:.0f} | bright>150 above {fs:.3f}/{fr_:.3f} | mae6 {mae:.1f} owlreg {owl:.1f}')
