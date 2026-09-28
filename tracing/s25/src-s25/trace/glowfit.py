import cv2,numpy as np,json
from pc import P
regs={'top':(300,10,1900,110),'left':(10,200,120,850),'right':(2060,200,2195,850)}
out={}
for f in range(2512,2763):
    r=cv2.imread(f'r/pre6/r-{f:05d}.png',0).astype(np.float32)/255
    s=P(f)
    num=0;den=0; row=[]
    for k,(x0,y0,x1,y1) in regs.items():
        a=float(np.median(s[y0:y1,x0:x1])); b=float(np.median(r[y0:y1,x0:x1]))
        row.append((a,b)); num+=a*b; den+=b*b
    g=num/max(den,1e-6)
    out[f]=round(g,3)
    if f%10==2: print(f/25, 'gain %.2f'%g, ' '.join(f'{a*255:.0f}/{b*255:.0f}' for a,b in row))
json.dump(out,open('glowfit.json','w'))
