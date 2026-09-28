import numpy as np,cv2
fr=np.load('src_570_672.npy',mmap_mode='r')
ref=fr[625-570].astype(np.float32).mean(2)/255
x0,y0,x1,y1=1390,200,1720,470
tpl=ref[y0:y1,x0:x1]
k=651
im=fr[k-570].astype(np.float32).mean(2)/255
cc,Wm=cv2.findTransformECC(tpl,im[y0-40:y1+40,x0-40:x1+40].copy(),np.array([[1,0,40],[0,1,40]],np.float32),cv2.MOTION_EUCLIDEAN,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),None,5)
# full-frame affine: p_img = A p_ref + b  (ref coords -> image coords)
A=Wm[:,:2]; b=Wm[:,2]-40+np.array([x0,y0])-A@np.array([x0,y0])
M=np.hstack([A,b[:,None]]).astype(np.float32)
print(M)
np.save('head_M_2604.npy',M)
wref=cv2.warpAffine(ref,M,(2206,946),flags=cv2.INTER_LINEAR)
s=lambda x: cv2.GaussianBlur(x,(0,0),1.5)
e_move=s(np.abs(im-wref)); e_stay=s(np.abs(im-ref))
X0,Y0,X1,Y1=1350,150,1760,640
d=(e_stay-e_move)[Y0:Y1,X0:X1]
vis=np.clip(128+d*1200,0,255).astype(np.uint8)
cv2.imwrite('motseg.png',cv2.resize(vis,None,fx=1.5,fy=1.5))
np.save('motseg_d.npy',e_stay-e_move)
