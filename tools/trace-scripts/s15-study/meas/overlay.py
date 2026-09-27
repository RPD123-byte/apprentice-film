# red = render, cyan = source (edges emphasised), for layout alignment
import cv2,glob,numpy as np,sys
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(p.split('-at-')[1][:-5]))
outs=[]
for f in fs:
    r=cv2.imread(f,0).astype(np.float32); s=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
    im=np.dstack([s,s,r]).astype(np.uint8)
    im=cv2.resize(im,(1103,473))
    cv2.putText(im,f.split('-at-')[1][:-5],(8,24),0,0.8,(255,255,255),2)
    outs.append(im)
while len(outs)%2: outs.append(np.zeros_like(outs[0]))
rows=[np.hstack(outs[i:i+2]) for i in range(0,len(outs),2)]
for k in range(0,len(rows),3): cv2.imwrite(f'{d}/ov{k//3}.jpg',np.vstack(rows[k:k+3]))
