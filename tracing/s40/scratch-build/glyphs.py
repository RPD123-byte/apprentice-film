import cv2, numpy as np, json
from skimage.measure import label, regionprops
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
face=np.load(SP+'/face.npy')
lab=label(face)
letters={'r':(507,325),'a':(636,324),'p':(784,322),'p2':(943,322),'o':(1121,323),'r2':(1275,331),'t':(1411,297)}
out={}
for name,(bx,by) in letters.items():
    # find component whose bbox starts at bx,by
    comp=None
    for rp in regionprops(lab):
        if abs(rp.bbox[1]-bx)<=1 and abs(rp.bbox[0]-by)<=1 and rp.area>5000: comp=rp.label
    m=(lab==comp).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    # smooth the mask edge a little then offset outward by 3px (keyline centre)
    mm=cv2.GaussianBlur(m.astype(np.float32),(0,0),1.5)>0.5
    mm=cv2.dilate(mm.astype(np.uint8),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    cs,hier=cv2.findContours(mm,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    polys=[]
    for c in cs:
        if cv2.contourArea(c)<60: continue
        ap=cv2.approxPolyDP(c,1.0,True)[:,0,:]
        polys.append(ap.tolist())
    out[name]=polys
    print(name,[len(p) for p in polys], 'area',m.sum())
json.dump(out,open(SP+'/glyphs.json','w'))
