import cv2,numpy as np,sys
def load(p): return cv2.imread(p).astype(float).mean(-1)
def cross(prof, lo_first=True):
    # subpixel position of the steepest transition (50% between local min and max) in a 1-D profile
    p=np.asarray(prof); i=np.argmax(np.abs(np.diff(p)))
    a,b=p[max(0,i-3):i+1].min() if p[i+1]>p[i] else p[max(0,i-3):i+1].max(), p[i+1:i+5].max() if p[i+1]>p[i] else p[i+1:i+5].min()
    m=(a+b)/2
    for j in range(max(0,i-3),min(len(p)-1,i+4)):
        if (p[j]-m)*(p[j+1]-m)<=0 and p[j]!=p[j+1]: return j+(m-p[j])/(p[j+1]-p[j])
    return i+0.5
def card_edges(im, L=(1440,1462), R=(1902,1924), T=(174,194), B=(822,840), ys=range(200,820,20), xs=range(1480,1890,20)):
    left=[L[0]+cross(im[y,L[0]:L[1]]) for y in ys if not (470<y<560)]
    right=[R[0]+cross(im[y,R[0]:R[1]]) for y in ys]
    top=[T[0]+cross(im[T[0]:T[1],x]) for x in xs]
    bot=[B[0]+cross(im[B[0]:B[1],x]) for x in xs]
    return np.median(left),np.median(right),np.median(top),np.median(bot)
if __name__=='__main__':
    for p in sys.argv[1:]:
        e=card_edges(load(p)); print(p.split('/')[-2:], 'L %.2f R %.2f T %.2f B %.2f  w %.2f h %.2f'%(*e,e[1]-e[0],e[3]-e[2]))
