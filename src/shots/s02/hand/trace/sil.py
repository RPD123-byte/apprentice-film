# measure the designer's big silhouettes on the averaged stare (pre-grade), simplified to a few px
import numpy as np, cv2, json
A=np.load('stare_pre.npy')
def comp(mask, seed):
    n,lab=cv2.connectedComponents(mask.astype(np.uint8),connectivity=8)
    m=(lab==lab[seed[1],seed[0]]).astype(np.uint8)
    # fill holes
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    f=np.zeros_like(m); cv2.drawContours(f,cs,-1,1,-1); return f,max(cs,key=cv2.contourArea)
def simp(c,eps): return cv2.approxPolyDP(c,eps,True)[:,0,:].tolist()
res={}
# lit paper (face + hoodie): sigma 2, > 120
m,c=comp(cv2.GaussianBlur(A,(0,0),2)>120,(1000,500)); res['LIT']=simp(c,2.0)
# figure envelope: sigma 8 > 30
m2,c2=comp(cv2.GaussianBlur(A,(0,0),8)>30,(1000,500)); res['FIG']=simp(c2,3.0)
# beanie cuff: sigma 4 > 70 restricted to y<260, x 540..1520
B=cv2.GaussianBlur(A,(0,0),4); z=np.zeros_like(A,bool); z[0:300,540:1520]=True
m3,c3=comp((B>70)&z,(1000,40)); res['BEANIE']=simp(c3,2.5)
json.dump(res,open('sil.json','w'))
for k,v in res.items(): print(k,len(v))
out=cv2.cvtColor(A.astype(np.uint8),cv2.COLOR_GRAY2BGR)
for k,col in [('LIT',(0,0,255)),('FIG',(255,0,0)),('BEANIE',(0,255,0))]:
    cv2.polylines(out,[np.array(res[k],np.int32)],True,col,2)
cv2.imwrite('sil2.jpg',out,[cv2.IMWRITE_JPEG_QUALITY,85])
