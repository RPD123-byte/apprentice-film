import cv2, numpy as np, sys, glob
d,idx,out=sys.argv[1],sys.argv[2],sys.argv[3]
fr=cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0]); rf=cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0])
Q=np.float32([[315,246],[834,168],[898,519],[409,648]]); D=np.float32([[0,0],[800,0],[800,500],[0,500]])
M=cv2.getPerspectiveTransform(Q,D)
a=cv2.warpPerspective(fr,M,(800,500)); b=cv2.warpPerspective(rf,M,(800,500))
for nm,im in (('render',a),('source',b)):
    m=im[20:480,20:780].reshape(-1,3).mean(0); print(nm,'BGR mean',m.round(1),'lum',cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)[20:480,20:780].mean().round(1))
cv2.imwrite(out,np.hstack([a,b]))
