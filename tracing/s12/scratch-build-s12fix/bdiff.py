import cv2, numpy as np, sys
a=cv2.imread(sys.argv[2],0).astype(np.float32); b=cv2.imread(sys.argv[1],0).astype(np.float32)
sig=float(sys.argv[3]) if len(sys.argv)>3 else 12
A=cv2.GaussianBlur(a,(0,0),sig);B=cv2.GaussianBlur(b,(0,0),sig)
xs=list(range(700,1960,60)); ys=list(range(60,946,50))
print('render-src blurred (sigma %g)'%sig)
print('     '+''.join(f'{x:5d}' for x in xs))
for y in ys:
    print(f'{y:4d} '+''.join(f'{int(B[y,x]-A[y,x]):5d}' for x in xs))
m=(cv2.GaussianBlur(a,(0,0),3)>60)|(cv2.GaussianBlur(b,(0,0),3)>60)
print('MAE blurred in owl box: %.2f'%np.abs(A-B)[0:946,640:1960].mean(), ' owl-mask MAE %.2f'%np.abs(A-B)[m].mean())
sa=cv2.GaussianBlur(a,(0,0),3)>60; sb=cv2.GaussianBlur(b,(0,0),3)>60
print('silhouette IoU %.3f'%((sa&sb).sum()/(sa|sb).sum()))
