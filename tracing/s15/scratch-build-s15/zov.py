# zov.py times out.jpg [cols] : z-buffered set preview (half res) over source frames
import cv2,json,subprocess,sys,numpy as np
times=sys.argv[1]; out=sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 2
meta=json.loads(subprocess.check_output(['node','zr.mjs',times])); W,H=meta['W'],meta['H']
tiles=[]
for t in times.split(','):
    t=float(t); f=cv2.imread('src/f%04d.png'%round(t*25)); f=cv2.resize(f,(W,H),interpolation=cv2.INTER_AREA)
    raw=np.fromfile(f'zr_{t:.2f}.raw',np.uint8); rgb=raw[:W*H*3].reshape(H,W,3)[...,::-1]; e=raw[W*H*3:].reshape(H,W)
    g=cv2.cvtColor(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)
    m=(rgb.sum(2)>0)[...,None]
    o=np.where(m,cv2.addWeighted(g,0.6,rgb.astype(np.uint8),0.45,0),g)
    o[e>0]=(255,255,255)
    cv2.putText(o,f"{t:.2f}",(8,24),0,0.8,(0,255,255),2)
    for X in range(0,2206,100): cv2.line(o,(int(X*W/2206),0),(int(X*W/2206),6),(0,255,255),1)
    tiles.append(o)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
