import cv2,numpy as np,sys
D='/Users/computer/rootline/apprentice-film/snapshots/'
out=sys.argv[1]; ns=[int(a) for a in sys.argv[2].split(',')]
rows=[]
for n in ns:
    s=cv2.imread(f'{D}end-critic-src/src-{n}.png'); s=cv2.imread(f'{D}end-critic-src/src-{n}.jpg') if s is None else s
    r=cv2.imread(f'{D}end-critic-render/{n}.png')
    sf,rf=[cv2.cvtColor((cv2.GaussianBlur(a.astype(np.float32),(0,0),4)/255.),cv2.COLOR_BGR2Lab) for a in (s,r)]
    de=np.sqrt(((sf-rf)**2).sum(2)); hm=cv2.applyColorMap(np.clip(de*12,0,255).astype(np.uint8),cv2.COLORMAP_INFERNO)
    dl=rf[...,0]-sf[...,0]; sg=np.zeros_like(s); sg[...,2]=np.clip(dl*12,0,255); sg[...,0]=np.clip(-dl*12,0,255)
    f=lambda a,t: cv2.putText(cv2.resize(a,(736,316)),t,(5,20),cv2.FONT_HERSHEY_SIMPLEX,0.6,(255,255,255),1)
    rows.append(np.hstack([f(s,f'SRC {n/25:.2f}'),f(r,'NOW'),f(hm,f'dE s4 mean {de.mean():.2f}'),f(sg,'red=NOW lighter blue=darker')]))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
