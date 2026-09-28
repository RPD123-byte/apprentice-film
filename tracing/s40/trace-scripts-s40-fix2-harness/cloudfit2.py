import json,cv2,numpy as np
pre=np.load('pre138.npy'); lay=np.load('lay.npy'); ok=np.load('ok.npy')
D=json.load(open('data.json')); layers=D['CLOUDS_BACK']+D['CLOUDS_FRONT']
cream=np.array([253,237,209])/255; shade=np.array([194,171,146])/255
d=cream-shade
A=((cream-pre)@d)/(d@d)
H,W=lay.shape
yy,xx=np.mgrid[0:H,0:W]
res={}
fitimg=np.full((H,W),np.nan,np.float32)
for i in range(len(layers)):
    m=ok&(lay==i)
    n=m.sum()
    if n<200: print(i,'too few',n); continue
    X=(xx[m]-1103)/1103.0; Y=(yy[m]-473)/473.0; a=A[m]
    deg=3 if n>20000 else 2
    cols=[X**p*Y**q for p in range(deg+1) for q in range(deg+1-p)]
    M=np.stack(cols,1)
    c,*_=np.linalg.lstsq(M,a,rcond=None)
    pr=M@c
    print(i,'n',n,'deg',deg,'a mean %.3f std %.3f resid std %.3f'%(a.mean(),a.std(),(a-pr).std()))
    res[i]={'deg':deg,'c':[round(float(v),4) for v in c]}
    mm=(lay==i)
    Xa=(xx[mm]-1103)/1103.0; Ya=(yy[mm]-473)/473.0
    fitimg[mm]=np.stack([Xa**p*Ya**q for p in range(deg+1) for q in range(deg+1-p)],1)@c
json.dump(res,open('cloudfit.json','w'))
np.save('Amap.npy',A); np.save('fitimg.npy',fitimg)
