# build the clean pre-grade plate (luminance) of the static scene: 1175 everywhere, the owl@1175 area from 1153,
# the steam area black. Saves plate.npy (scratch only).
import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, cv2, numpy as np
A=tr.pre(1175); B=tr.pre(1153)
# owl@1175 mask: difference to 1153 inside the lower-left area, grown
d=np.abs(cv2.GaussianBlur(A,(0,0),2)-cv2.GaussianBlur(B,(0,0),2))
m=np.zeros(A.shape,np.uint8); m[520:946,100:760]=1
own=((d>0.08)&(m>0)).astype(np.uint8)
own=cv2.morphologyEx(own,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8))
own=cv2.dilate(own,np.ones((13,13),np.uint8))
P=A.copy(); P[own>0]=B[own>0]
# the 1153 owl (bright where 1175 is dark) must not come in with it
o53=((B-A>0.08)).astype(np.uint8); o53[:, 900:]=0; o53[700:,:]=0
o53=cv2.dilate(cv2.morphologyEx(o53,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8)),np.ones((9,9),np.uint8))
P[(own>0)&(o53>0)]=0
# steam: black above the mug
st=np.zeros(A.shape,bool); st[360:718,690:905]=True
P[st]=np.minimum(P[st],0.0)
np.save('plate.npy',P); np.save('owlmask1175.npy',own)
cv2.imwrite('plate.png',(np.clip(P,0,1)*255).astype(np.uint8))
print(P.min(),P.max())
