import cv2,numpy as np,glob,re,sys
S='s15-rev2-work/src/f%04d.png'
def fs(d): return sorted(glob.glob(d+'/frame-*.png'), key=lambda p:int(re.search(r'frame-(\d+)-',p).group(1)))
dl=[int(x) for x in open('s15-rev2-work/dl.txt').read().split()]; ml=[int(x) for x in open('s15-rev2-work/ml.txt').read().split()]
D=fs('s15-rev2-dense'); M=fs('s15-rev2-motion')
def get(n): return cv2.imread(D[dl.index(n)]) if n in dl else cv2.imread(M[ml.index(n)])
n,x0,y0,x1,y1,name=int(sys.argv[1]),*map(int,sys.argv[2:6]),sys.argv[6]
r=get(n)[y0:y1,x0:x1]; s=cv2.imread(S%n)[y0:y1,x0:x1]
vert = (x1-x0) > 1.3*(y1-y0)
im=np.vstack([r,np.full((6,r.shape[1],3),(0,0,255),np.uint8),s]) if vert else np.hstack([r,np.full((r.shape[0],6,3),(0,0,255),np.uint8),s])
cv2.imwrite('s15-rev2-work/'+name,im,[cv2.IMWRITE_JPEG_QUALITY,90])
