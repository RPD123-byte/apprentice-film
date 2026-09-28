# sharp.py [rdir] : per-frame sharpness of the source (and render if given): mean |grad| and Laplacian std / image std
import sys, cv2, numpy as np, os
rdir=sys.argv[1] if len(sys.argv)>1 else None
k0=int(sys.argv[2]) if len(sys.argv)>2 else 262; k1=int(sys.argv[3]) if len(sys.argv)>3 else 477
def m(im):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
    g=cv2.GaussianBlur(g,(0,0),0.8)  # kill grain a bit
    gx=cv2.Sobel(g,cv2.CV_32F,1,0,ksize=3)/8; gy=cv2.Sobel(g,cv2.CV_32F,0,1,ksize=3)/8
    lap=cv2.Laplacian(g,cv2.CV_32F)
    return np.abs(gx).mean()+np.abs(gy).mean(), lap.std()/(g.std()+1e-6), np.abs(gx).mean()/(np.abs(gy).mean()+1e-6)
for k in range(k0,k1+1):
    S=cv2.imread(f'src/f{k:03d}.png'); a=m(S)
    line=f'{k} {k/25:.2f} src grad {a[0]:5.2f} lap/std {a[1]:.3f} gx/gy {a[2]:.2f}'
    if rdir and os.path.exists(f'{rdir}/r{k:03d}.png'):
        b=m(cv2.imread(f'{rdir}/r{k:03d}.png')); line+=f' | ren grad {b[0]:5.2f} lap/std {b[1]:.3f} gx/gy {b[2]:.2f}  ratio {b[0]/a[0]:.2f} {b[1]/a[1]:.2f}'
    print(line)
