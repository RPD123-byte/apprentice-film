import cv2,numpy as np,sys
from scipy.signal import find_peaks
def stats(path, ang, reg):
    S=cv2.cvtColor(cv2.imread(path),cv2.COLOR_BGR2GRAY).astype(float)
    x0,y0,x1,y1=reg; a=np.radians(ang)
    t=np.array([np.cos(a),np.sin(a)]); n=np.array([-np.sin(a),np.cos(a)])
    peaks=[];widths=[];vals=[];lens=[]
    cx,cy=(x0+x1)/2,(y0+y1)/2
    for off in np.linspace(-120,120,7):
        c=np.array([cx,cy])+t*off
        s=np.arange(-150,150,1.0)
        pts=c[None,:]+s[:,None]*n[None,:]
        xs=np.clip(pts[:,0].astype(int),0,2205); ys=np.clip(pts[:,1].astype(int),0,945)
        prof=S[ys,xs]
        p,pr=find_peaks(prof,height=40,prominence=25,width=1)
        peaks.append(len(p)/3.0); widths+=list(pr['widths']); vals+=list(pr['peak_heights'])
    # along-line run lengths above 50
    for off in np.linspace(-100,100,9):
        c=np.array([cx,cy])+n*off
        s=np.arange(-400,400,1.0); pts=c[None,:]+s[:,None]*t[None,:]
        xs=np.clip(pts[:,0].astype(int),0,2205); ys=np.clip(pts[:,1].astype(int),0,945)
        prof=S[ys,xs]>50
        run=0
        for v in prof:
            if v: run+=1
            elif run: lens.append(run); run=0
    return np.mean(peaks), np.percentile(widths,[25,50,75,90]), np.percentile(vals,[25,50,75,90]), np.percentile(lens,[50,75,90]) if lens else None
for p,ang,reg in [(sys.argv[i],float(sys.argv[i+1]),tuple(map(int,sys.argv[i+2].split(',')))) for i in range(1,len(sys.argv),3)]:
    d,w,v,l=stats(p,ang,reg)
    print(p.split('/')[-1],'lines/100px %.2f'%d,'w',np.round(w,1),'val',np.round(v),'runlen',l)
