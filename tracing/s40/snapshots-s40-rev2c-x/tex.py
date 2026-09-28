import cv2, numpy as np, glob, sys
d=sys.argv[1]; idx=sys.argv[2]
a=cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0]).astype(np.float32); b=cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0]).astype(np.float32)
ga=cv2.cvtColor(a.astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32); gb=cv2.cvtColor(b.astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
regs={'sky_top':(800,20,1300,150),'sky_mid':(700,560,1100,640),'sky_right':(1700,350,1800,450),'cloudL_in':(100,800,300,930),'cloudR_in':(1900,850,2150,940),'face_a':(700,390,760,450),'face_o':(1150,360,1200,420),'ribcream_L':(40,215,80,245),'owlbelly':(1560,370,1620,410),'extband':(900,520,960,540)}
for k,(x0,y0,x1,y1) in regs.items():
    r=[]
    for g in (ga,gb):
        p=g[y0:y1,x0:x1]
        hp=p-cv2.GaussianBlur(p,(0,0),2)
        mid=cv2.GaussianBlur(p,(0,0),2)-cv2.GaussianBlur(p,(0,0),8)
        r.append((p.mean(),hp.std(),mid.std()))
    print(f'{k:12s} mean r {r[0][0]:6.1f} s {r[1][0]:6.1f} | hp r {r[0][1]:.2f} s {r[1][1]:.2f} | mid r {r[0][2]:.2f} s {r[1][2]:.2f}')
