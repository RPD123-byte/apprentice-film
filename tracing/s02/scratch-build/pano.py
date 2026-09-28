# stitch a study panorama of the source world (measurement only, never used in the render)
import cv2,numpy as np,re,sys
SP=sys.argv[1]; out=sys.argv[2]; sc=float(sys.argv[3])
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def rd(fn):
    o={}
    for L in open(fn):
        m=re.match(r'(\d+) t=\S+ s=\S+ (?:rot=\S+ )?tx=\s*(\S+) ty=\s*(\S+)',L)
        if m: o[int(m.group(1))]=np.array([float(m.group(2)),float(m.group(3))])
    return o
p1=rd(SP+'/pan1.txt')
# world origin = stare frame; world x range 0..4437, y -1905..946
X0,Y0=-50,-2000; WW,HH=4600,3000
acc=np.zeros((int(HH*sc),int(WW*sc),3),np.float32); wsum=np.zeros((int(HH*sc),int(WW*sc),1),np.float32)
frames=[(f,p1[f]) for f in sorted(p1) if f%2==0]+[(250,np.array([0.,0.]))]
for f,o in frames:
    c.set(1,f); ok,im=c.read(); im=im.astype(np.float32)
    # frame = world + o  -> world = frame - o
    M=np.float32([[sc,0,(-o[0]-X0)*sc],[0,sc,(-o[1]-Y0)*sc]])
    w=cv2.warpAffine(im,M,(acc.shape[1],acc.shape[0]))
    m=cv2.warpAffine(np.ones(im.shape[:2],np.float32),M,(acc.shape[1],acc.shape[0]))[...,None]
    # later frames (brighter lit? ) just overwrite where they exist
    acc=acc*(1-m)+w*m; wsum=np.maximum(wsum,m)
cv2.imwrite(out,np.clip(acc,0,255).astype(np.uint8))
print('done',acc.shape)
