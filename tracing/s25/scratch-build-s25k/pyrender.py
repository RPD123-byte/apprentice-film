# approximate python re-render of a trace (tone + strokes) for quick parameter tests: pre-grade error vs source in mask
import cv2,numpy as np,json,sys
from grade import ungrade
from segm import L
def render(T, SC=4, tblur=0.45):
    x0,y0,x1,y1=T['box']; w,h=x1-x0,y1-y0
    img=np.full((h*SC,w*SC),T['base'],np.float32)
    for Lv in T['levels']:
        m=np.zeros((h*SC,w*SC),np.uint8)
        pts=[((np.array(r).reshape(-1,2)-[x0,y0])*SC*16).round().astype(np.int32) for r in Lv['p']]
        if pts: cv2.fillPoly(m,pts,1,lineType=cv2.LINE_8,shift=4)
        img[m>0]=Lv['v']
    img=cv2.resize(img,(w,h),interpolation=cv2.INTER_AREA)
    if tblur>0: img=cv2.GaussianBlur(img,(0,0),tblur)
    # strokes (simple): polyline with mean width & value
    for s in T['strokes']:
        q=np.array(s).reshape(-1,4)
        for i in range(1,len(q)):
            a=q[i-1];b=q[i]; wv=max(1,int(round((a[2]+b[2])/2*SC)))
        big=np.zeros((h*SC,w*SC),np.uint8)
    return img
if __name__=='__main__':
    T=json.load(open(sys.argv[1])); f=T['frame']
    S=L(f)[...,::-1]/255.0; P=ungrade(S.astype(np.float32),f/25).mean(2)
    x0,y0,x1,y1=T['box']; img=render(T)
    m=np.zeros(P.shape,np.uint8)
    for ring in T['mask']: cv2.fillPoly(m,[np.array(ring).reshape(-1,2).round().astype(np.int32)],1)
    m=cv2.erode(m,np.ones((5,5),np.uint8))[y0:y1,x0:x1]>0
    Pc=cv2.morphologyEx(P,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))[y0:y1,x0:x1]
    for s_ in [1,3]:
        a=cv2.GaussianBlur(img,(0,0),s_); b=cv2.GaussianBlur(Pc,(0,0),s_)
        print(f'tone vs closed-source sigma{s_}: MAE {np.abs(a-b)[m].mean()*255:.2f}')
