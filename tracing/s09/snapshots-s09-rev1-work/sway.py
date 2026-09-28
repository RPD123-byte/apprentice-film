import cv2, numpy as np, glob, re, sys
d=sys.argv[1]
key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))
fr=sorted(glob.glob(d+'/frame-*.png'),key=key); rf=sorted(glob.glob(d+'/ref-*.png'),key=key)
def ld(p): return cv2.imread(p,0).astype(np.float32)
F0=ld(fr[0]); R0=ld(rf[0])
regs={'beanie':(20,40,380,540),'hairlow':(0,600,500,946),'slab':(600,740,900,946),'owl':(700,200,1150,650),'room':(1560,50,2000,700)}
def pc(a,b):
    hw=cv2.createHanningWindow((a.shape[1],a.shape[0]),cv2.CV_32F)
    (dx,dy),_=cv2.phaseCorrelate(a.copy(),b.copy(),hw); return dx,dy
for pf,pr in zip(fr,rf):
    t=key(pf); F=ld(pf); R=ld(pr); row=[f'{t:.2f}']
    for k,(x0,y0,x1,y1) in regs.items():
        dxf,dyf=pc(F0[y0:y1,x0:x1],F[y0:y1,x0:x1]); dxr,dyr=pc(R0[y0:y1,x0:x1],R[y0:y1,x0:x1])
        row.append(f'{k} r{dxf:+.2f},{dyf:+.2f} s{dxr:+.2f},{dyr:+.2f}')
    x0,y0,x1,y1=regs['owl']
    row.append(f'owlΔ s{np.abs(cv2.GaussianBlur(R,(0,0),2)-cv2.GaussianBlur(R0,(0,0),2))[y0:y1,x0:x1].mean():.2f} r{np.abs(cv2.GaussianBlur(F,(0,0),2)-cv2.GaussianBlur(F0,(0,0),2))[y0:y1,x0:x1].mean():.2f}')
    print(' | '.join(row))
