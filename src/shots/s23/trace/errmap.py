import cv2, numpy as np, sys
d=sys.argv[1]; ks=list(map(int,sys.argv[2].split(',')))
rows=[]
for k in ks:
    r=cv2.imread('%s/r%05d.png'%(d,k)).astype(np.float32); s=cv2.imread('src/%05d.png'%k).astype(np.float32)
    g=lambda a: cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY),(0,0),8)
    e=np.abs(g(r)-g(s))
    # region breakdown: screen top band (header), page below, outside screen
    reg={'outside':np.ones(e.shape,bool),'header':np.zeros(e.shape,bool),'page':np.zeros(e.shape,bool)}
    reg['header'][128:370,144:2023]=True; reg['page'][370:,144:2023]=True
    reg['outside'][128:,144:2023]=False
    tot=e.sum()
    print(k,'MAE %.2f'%e.mean(),' '.join('%s %.0f%% (%.1f)'%(n,100*e[m].sum()/tot,e[m].mean()) for n,m in reg.items()))
    rows.append(cv2.applyColorMap(np.clip(e*8,0,255).astype(np.uint8),cv2.COLORMAP_JET))
cv2.imwrite('errmap.jpg',cv2.resize(np.vstack(rows),None,fx=0.3,fy=0.3))
