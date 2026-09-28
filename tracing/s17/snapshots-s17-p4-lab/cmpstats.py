import cv2,glob,re,numpy as np,sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s17-p4-lab')
from owlm import om
def mae(a,b,sig=6,box=None):
    if box: x0,y0,x1,y1=box; a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
    A=cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),sig); B=cv2.GaussianBlur(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),sig); return float(np.abs(A-B).mean())
d=sys.argv[1]
for f in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); r=cv2.imread(f); s=cv2.imread(f.replace('frame-','ref-'))
    print(f't={t:.2f} full={mae(r,s):.2f} owlbox={mae(r,s,6,(330,280,930,610)):.2f} om1.5={om(r,s,round(t*25)/25,1.5):.2f}')
