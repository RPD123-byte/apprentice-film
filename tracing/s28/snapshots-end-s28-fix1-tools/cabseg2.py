# end-s28-fix1: room (cabinet, thermos, wall) right of the hoodie, x 1440-1690, y 420-750: ink-bounded flood from the box's
# right edge (the hoodie's outline stops it), holes filled, then closed over the room's own ink.
import cv2, numpy as np, sys
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
X0,Y0,X1,Y1=1440,420,1690,750
OPEN=13
def seg_img(f, thr=95, hole=900):
    crop=np.ascontiguousarray(f[Y0:Y1,X0:X1])
    L=cv2.GaussianBlur(cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),0.8)
    bg=cv2.GaussianBlur(cv2.dilate(L,np.ones((9,9))),(0,0),2)
    ink=((L<thr)|((bg-L)>45)).astype(np.uint8)
    ink=cv2.dilate(ink,np.ones((2,2),np.uint8))
    free=(1-ink).astype(np.uint8)
    k,lab=cv2.connectedComponents(free,connectivity=4)
    keep=set(np.unique(lab[:, -3:]).tolist())-{0}
    room=np.isin(lab,list(keep)).astype(np.uint8)
    # the room's own ink (grille, thermos lines): close, then fill small enclosed holes
    room=cv2.morphologyEx(room,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    # the figure: what is not room and connects to the box's left edge; everything else (enclosed) is room
    # (thin ink lines of the cabinet touching his outline must not join him: seeds are the thick part only, grown back
    # by 6 px inside the non-room area)
    inv=(1-room).astype(np.uint8)
    b,g,r=[cv2.GaussianBlur(crop[...,i].astype(np.float32),(0,0),2) for i in range(3)]
    core=cv2.morphologyEx(inv&(r-g<19).astype(np.uint8),cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(OPEN,OPEN)))
    k2,l2=cv2.connectedComponents(core,connectivity=4)
    core=np.isin(l2,list(set(np.unique(l2[:, :6]).tolist())-{0})).astype(np.uint8)
    fig=cv2.dilate(core,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(OPEN+2,OPEN+2)))&inv
    room=(1-fig).astype(np.uint8)
    return crop,room
def seg(n,**kw): return seg_img(cv2.imread(f'{SP}/src/{n}.png'),**kw)
if __name__=='__main__':
    tiles=[]
    for n in [int(a) for a in sys.argv[1].split(',')]:
        crop,nf=seg(n)
        v=cv2.resize(crop,None,fx=1.5,fy=1.5,interpolation=cv2.INTER_CUBIC)
        cs,_=cv2.findContours(nf,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(v,[np.int32(c*1.5) for c in cs],-1,(255,0,255),1)
        cv2.putText(v,str(n/25),(5,20),0,0.6,(0,0,255),2)
        tiles.append(v)
    cv2.imwrite(sys.argv[2],np.hstack(tiles))
