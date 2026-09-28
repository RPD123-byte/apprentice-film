# Compare a render frame with the ref: blurred MAE, per-cell mean table, and an error heatmap image.
# usage: cmp.py DIR [idx]
import cv2, numpy as np, sys, glob
d=sys.argv[1]; idx=sys.argv[2] if len(sys.argv)>2 else '*'
for fr in sorted(glob.glob(f'{d}/frame-{idx}-at-*.png')):
    rf=fr.replace('/frame-','/ref-')
    a=cv2.imread(fr,0).astype(np.float32); b=cv2.imread(rf,0).astype(np.float32)
    ab=cv2.GaussianBlur(a,(0,0),8); bb=cv2.GaussianBlur(b,(0,0),8)
    mae=np.abs(ab-bb).mean()
    print(fr.split('/')[-1], 'blurMAE=%.1f'%mae, 'mean ren %.1f ref %.1f'%(a.mean(),b.mean()))
    # 12x5 cell table of (ren-ref) blurred means
    H,W=a.shape; ny,nx=6,12
    for j in range(ny):
        row=[]
        for i in range(nx):
            y0,y1=j*H//ny,(j+1)*H//ny; x0,x1=i*W//nx,(i+1)*W//nx
            row.append('%4d/%-4d'%(ab[y0:y1,x0:x1].mean(),bb[y0:y1,x0:x1].mean()))
        print(' '.join(row))
    diff=np.clip((ab-bb)*2+128,0,255).astype(np.uint8)
    hm=cv2.applyColorMap(diff,cv2.COLORMAP_JET)
    small=lambda im: cv2.resize(im,(1103,473))
    top=np.hstack([small(cv2.cvtColor(a.astype(np.uint8),cv2.COLOR_GRAY2BGR)),small(cv2.cvtColor(b.astype(np.uint8),cv2.COLOR_GRAY2BGR))])
    bot=np.hstack([small(hm),small(cv2.cvtColor(np.clip(np.abs(ab-bb)*3,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR))])
    cv2.imwrite(fr.replace('.png','-err.jpg'),np.vstack([top,bot]),[cv2.IMWRITE_JPEG_QUALITY,85])
