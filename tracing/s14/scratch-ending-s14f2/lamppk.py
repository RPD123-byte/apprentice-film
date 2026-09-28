import cv2,numpy as np,glob,re,sys
d=sys.argv[1]
rows={36.96:(300,470),37.6:(300,470),38.2:(300,470),38.52:(290,470),38.8:(280,450),39.08:(260,430),39.4:(240,410),39.72:(200,395),39.84:(150,366)}
for f in sorted(glob.glob(d+'/frame-*.png')):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if t not in rows: continue
    y0,y1=rows[t]; o=[]
    for p in (f,f.replace('frame-','ref-')):
        L=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(float),(0,0),3)[y0:y1]
        i=np.unravel_index(np.argmax(L),L.shape); o.append(f'{L.max():.0f}@({i[1]},{i[0]+y0})')
    print(t,o)
