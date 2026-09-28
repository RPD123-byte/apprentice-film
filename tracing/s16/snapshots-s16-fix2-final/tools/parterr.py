# parterr.py DIR_A DIR_B frames... : sigma-2 error vs source inside owl parts (cups, headphone shape, bandage box)
import sys, json, re, cv2, numpy as np, h16
sys.path.insert(0,'.')
A,B=sys.argv[1],sys.argv[2]
D=json.load(open('../../s16-fix2-w/owl.json'))
src=open('/Users/computer/rootline/apprentice-film/src/shots/s16/owlparts.js').read()
PL={int(m.group(1)):list(map(float,m.group(2).split(','))) for m in re.finditer(r'(\d{4}): \[([\d., ]+)\]',src[src.index('PLASTER'):src.index('export const PL =')])}
for n in map(int,sys.argv[3:]):
    d=D[str(1145 if n==1146 else n)]
    s=cv2.GaussianBlur(h16.gray(h16.src(n)),(0,0),2)
    ra=cv2.GaussianBlur(h16.gray(cv2.imread(f'{A}/r{n}.png').astype(np.float32)),(0,0),2)
    rb=cv2.GaussianBlur(h16.gray(cv2.imread(f'{B}/r{n}.png').astype(np.float32)),(0,0),2)
    masks={}
    hp=np.zeros(s.shape,np.uint8)
    for r in d['HP']['rings']: cv2.fillPoly(hp,[np.array(r,np.float32).reshape(-1,2).round().astype(np.int32)],1)
    cups=np.zeros(s.shape,np.uint8)
    for c in d['HP']['cups']: cv2.ellipse(cups,(int(c[0]),int(c[1])),(int(c[2]),int(c[3])),c[4],0,360,1,-1)
    masks['cups']=cups; masks['hp-cups']=hp&(1-cups)
    sil=np.zeros(s.shape,np.uint8)
    for r in d['sil']: cv2.fillPoly(sil,[np.array(r,np.float32).reshape(-1,2).round().astype(np.int32)],1)
    masks['body']=sil&(1-hp)&(1-cups)
    if n in PL:
        xl,yl,xr,yr,h=PL[n]; m=np.zeros(s.shape,np.uint8); cv2.rectangle(m,(int(min(xl,xr))-4,int(min(yl,yr)-h)),(int(max(xl,xr))+4,int(max(yl,yr)+h)),1,-1); masks['plaster']=m
    out=[]
    for k,m in masks.items():
        mm=m>0; out.append(f'{k} {np.abs(ra-s)[mm].mean():.2f}->{np.abs(rb-s)[mm].mean():.2f} (bias {(rb-s)[mm].mean():+.1f})')
    print(n,' | '.join(out))
