import cv2,glob,re,sys,json,shutil,os
S=sys.argv[1]; OUT=sys.argv[2]; tag=sys.argv[3]
ts=json.load(open(S+'/ts.json'))
inv={}
for k,t in ts.items(): inv[f'{float(t):.3f}'.rstrip('0').rstrip('.')]=int(k)
for p in glob.glob(OUT+'/frame-*.png'):
    t=re.search(r'at-([\d.]+)s',p).group(1)
    tt=f'{float(t):.3f}'.rstrip('0').rstrip('.')
    k=inv.get(tt)
    if k is None: print('unmapped',t); continue
    im=cv2.imread(p)
    cv2.imwrite(f'{S}/rend/k{k:02d}.png' if k in (12,40,75) else f'{S}/rend/k{k:02d}.jpg', im, [cv2.IMWRITE_JPEG_QUALITY,96])
    if tag and k in (12,40,75): shutil.copy(p, f'{S}/det/k{k}_{tag}.png')
print('processed',OUT)
