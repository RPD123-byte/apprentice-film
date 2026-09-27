# regmean.py DIR IDX : mean luminance per traced polygon (render vs source)
import cv2, numpy as np, re, sys, glob, json
d,idx=sys.argv[1],sys.argv[2]
fr=cv2.cvtColor(cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0]),cv2.COLOR_BGR2GRAY).astype(float)
rf=cv2.cvtColor(cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0]),cv2.COLOR_BGR2GRAY).astype(float)
src=open('/Users/computer/rootline/apprentice-film/src/shots/s05/trace.js').read()
extra={
 'lcarton_face':[[0,105],[222,107],[229,320],[0,318]],
 'lcarton_low':[[0,320],[229,320],[236,470],[0,470]],
 'topmid':[[700,0],[897,0],[897,160],[700,165]],
 'owl_head':[[1480,280],[1680,280],[1680,450],[1480,450]],
 'owl_body':[[1480,460],[1730,460],[1730,690],[1480,690]],
 'beanie_L':[[1300,20],[1500,20],[1500,200],[1300,100]],
 'beanie_R':[[1600,20],[1880,20],[1880,250],[1600,230]],
 'hair_back':[[1720,300],[1900,300],[1900,520],[1720,560]],
 'shirt_back':[[1600,700],[2050,700],[2050,940],[1600,940]],
 'arm':[[1230,660],[1450,660],[1400,760],[1230,760]],
 'desk_left':[[0,850],[250,760],[300,946],[0,946]],
 'desk_mid':[[450,800],[650,880],[600,946],[350,946]],
 'desk_right':[[1000,520],[1400,500],[1450,640],[1200,690]],
 'kbd':[[470,695],[930,565],[990,600],[600,770]],
 'dark_right':[[2100,0],[2206,0],[2206,380],[2100,380]],
 'spkC_front':[[1150,210],[1310,210],[1310,500],[1150,500]],
 'spkL_front':[[70,410],[190,345],[230,720],[110,790]],
}
polys={}
for m in re.finditer(r'export const (\w+) = (\[\[.*?\]\]);', src, re.S):
    try: polys[m.group(1)]=json.loads(m.group(2))
    except: pass
polys.update(extra)
for k,P in polys.items():
    if k.startswith('L_'): continue
    mask=np.zeros(fr.shape,np.uint8); cv2.fillPoly(mask,[np.int32(P)],1)
    if mask.sum()<50: continue
    a=fr[mask>0]; b=rf[mask>0]
    print(f"{k:14s} render {a.mean():6.1f} (sd {a.std():5.1f})  source {b.mean():6.1f} (sd {b.std():5.1f})  diff {a.mean()-b.mean():+6.1f}")
