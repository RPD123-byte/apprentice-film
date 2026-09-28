#!/bin/sh
# cmp.sh name t1,t2,... : headless render + pairs sheet (render | source) + stats
D=/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s15
node $D/h/render.mjs $D/hr/$1 $2 || exit 1
python3 - "$1" "$2" <<'PY'
import cv2,numpy as np,sys
D='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s15'
name,times=sys.argv[1],[float(x) for x in sys.argv[2].split(',')]
rows=[]
for t in times:
    r=cv2.imread(f'{D}/hr/{name}/r_{t:.2f}.png'); s=cv2.imread(f'{D}/src/f%04d.png'%round(t*25))
    gr=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(float); gs=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(float)
    print(f'{t:.2f} mean R {gr.mean():5.1f} S {gs.mean():5.1f}  dark<20 R {(gr<20).mean():.2f} S {(gs<20).mean():.2f}  blurdiff {np.abs(cv2.blur(gr,(31,31))-cv2.blur(gs,(31,31))).mean():5.1f}')
    p=np.hstack([cv2.resize(r,(1103,473)),cv2.resize(s,(1103,473))])
    cv2.putText(p,f'{t:.2f}',(8,30),0,1,(0,0,255),2); rows.append(p)
cv2.imwrite(f'{D}/hr/{name}.jpg',np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
PY
