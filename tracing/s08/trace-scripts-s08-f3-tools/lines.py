import cv2,numpy as np,sys
def load(p): return cv2.imread(p).astype(float).mean(-1)
def dline(prof, off):
    # centroid of darkness around the minimum
    p=np.asarray(prof); i=int(np.argmin(p)); base=np.percentile(p,80)
    w=np.clip(base-p[max(0,i-4):i+5],0,None); xs=np.arange(max(0,i-4),i+5)[:len(w)]
    return off+(w*xs).sum()/max(w.sum(),1e-6)
def card_lines(im):
    out={}
    out['areaL']=np.median([dline(im[y,1460:1500],1460) for y in range(420,720,15)])
    out['areaR']=np.median([dline(im[y,1840:1880],1840) for y in range(420,720,15)])
    out['areaT']=np.median([dline(im[330:365,x],330) for x in range(1560,1800,15)])
    out['btn']=np.median([dline(im[680:720,x],680) for x in range(1520,1840,15) if abs(x-1650)>30])
    out['areaB']=np.median([dline(im[780:815,x],780) for x in range(1520,1840,15) if abs(x-1650)>30])
    out['div']=np.median([dline(im[y,1630:1675],1630) for y in range(735,770,3)])
    return out
if __name__=='__main__':
    for p in sys.argv[1:]:
        o=card_lines(load(p)); print(p.split('/')[-2:], ' '.join(f'{k} {v:.2f}' for k,v in o.items()))
