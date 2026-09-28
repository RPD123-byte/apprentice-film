# SRC | NOW | BASE(film.mp4) triptychs (stacked vertically, labelled) for frame indices; plus sheets.
import cv2, numpy as np, sys, json
D='/Users/computer/rootline/apprentice-film/snapshots/'
def load(n):
    s=cv2.imread(f'{D}end-critic-src/src-{n}.png'); r=cv2.imread(f'{D}end-critic-render/{n}.png'); b=cv2.imread(f'{D}end-critic-src/base-{n}.png')
    return s,r,b
def lab(im,t):
    im=im.copy(); cv2.rectangle(im,(0,0),(260,34),(0,0,0),-1); cv2.putText(im,t,(6,26),cv2.FONT_HERSHEY_SIMPLEX,0.8,(255,255,255),2); return im
def tri(n,w=1103):
    s,r,b=load(n); h=int(946*w/2206)
    f=lambda im,t: lab(cv2.resize(im,(w,h),interpolation=cv2.INTER_AREA),t)
    return np.vstack([f(s,f'SRC {n/25:.2f}'),f(r,f'NOW {n/25:.2f}'),f(b,f'BASE {n/25:.2f}')])
if __name__=='__main__':
    mode=sys.argv[1]
    if mode=='one':
        for a in sys.argv[2].split(','):
            n=int(a); cv2.imwrite(f'{D}end-critic/tri/{n}.jpg',tri(n),[cv2.IMWRITE_JPEG_QUALITY,88])
    elif mode=='sheet':  # sheet out n1,n2,...  columns = times, rows SRC/NOW/BASE
        out=sys.argv[2]; ns=[int(a) for a in sys.argv[3].split(',')]; w=int(sys.argv[4]) if len(sys.argv)>4 else 520
        cols=[tri(n,w) for n in ns]; cv2.imwrite(out,np.hstack(cols),[cv2.IMWRITE_JPEG_QUALITY,88])
