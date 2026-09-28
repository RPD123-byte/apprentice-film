# rect.py : rectify the laptop page (PAGE_QUAD) of source frames (mean of a range) and a render into 1600x1000 page units
import sys,cv2,numpy as np
sys.path.insert(0,__file__.rsplit('/',1)[0]); from src import frame
PQ=np.float32([[320.7,246.0],[834.7,168.7],[900.9,521.2],[411.9,644.8]])
PU=np.float32([[0,0],[1600,0],[1600,1000],[0,1000]])
Hm=cv2.getPerspectiveTransform(PQ,PU)
def rect(img): return cv2.warpPerspective(img,Hm,(1600,1000),flags=cv2.INTER_CUBIC)
if __name__=='__main__':
    k0,k1=int(sys.argv[1]),int(sys.argv[2]); rp=sys.argv[3]; out=sys.argv[4]
    S=np.mean([frame(k).astype(np.float32) for k in range(k0,k1+1)],0)
    R=cv2.imread(rp).astype(np.float32)
    rs,rr=rect(S),rect(R)
    np.save(out+'_src.npy',rs.astype(np.float32)); np.save(out+'_ren.npy',rr.astype(np.float32))
    im=np.vstack([rr,np.full((8,1600,3),255,np.float32),rs]).astype(np.uint8)
    cv2.imwrite(out+'.jpg',cv2.resize(im,None,fx=0.75,fy=0.75,interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,90])
    d=cv2.GaussianBlur(cv2.cvtColor(rr,cv2.COLOR_BGR2GRAY),(0,0),4)-cv2.GaussianBlur(cv2.cvtColor(rs,cv2.COLOR_BGR2GRAY),(0,0),4)
    for y in range(0,1000,100): print(' '.join('%+5.1f'%np.abs(d[y:y+100,x:x+100]).mean() for x in range(0,1600,100)))
