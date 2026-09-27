# hf.py DIR T[,T..] x0 y0 x1 y1 : mid-tone fine-texture energy, render vs source, in value bands of the SOURCE's
# blurred (σ6) value: mean |g - blur(g, σ2)| over the pixels of each band (same pixel set for both images)
import cv2, sys, numpy as np, os
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[3:7])
for ts in sys.argv[2].split(','):
    T=float(ts); fi=round(T*25)
    a=cv2.imread(f'{d}/r-{T:.2f}.png',0).astype(np.float32)[y0:y1,x0:x1]
    b=cv2.imread(f'{SRC}/{fi}.png',0).astype(np.float32)[y0:y1,x0:x1]
    hp=lambda x: np.abs(x-cv2.GaussianBlur(x,(0,0),2))
    ha,hb=hp(a),hp(b); m=cv2.GaussianBlur(b,(0,0),6)
    out=[]
    for lo,hi in [(0,60),(60,120),(120,180),(180,256)]:
        k=(m>=lo)&(m<hi)
        if k.sum()<200: out.append(f'{lo}-{hi}: -'); continue
        out.append(f'{lo}-{hi}: {ha[k].mean():5.1f}/{hb[k].mean():5.1f}')
    print(f'{T:.2f}  '+'  '.join(out))
