# track the same world features separately in render frames and in the true source frames; compare camera offsets
import cv2, glob, re, sys, math, numpy as np
cap=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
def src(f):
    cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,S=cap.read(); return S
rows={}
for d in sys.argv[1:]:
    for p in glob.glob(d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1)); q=math.floor(t*30+1e-6)/30; f=math.floor(q*25+0.5)
        if 152<=f<=477: rows.setdefault(f,p)
P=1200
def g(im): 
    x=cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),(0,0),2.5)
    return cv2.copyMakeBorder(x,P,P,P,P,cv2.BORDER_CONSTANT,value=0)
fR={f:p for f,p in rows.items()}
def tpl(im,x0,y0,x1,y1): return cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),(0,0),2.5)[y0:y1,x0:x1],x0,y0
def ref_of(t_f): return cv2.imread(fR[t_f])
T={'face':((263,),(800,0,1450,800)),'box':((375,),(850,340,1800,946))}
tr={}
for k,((f0,),box) in T.items():
    tr[k]=(tpl(cv2.imread(fR[f0]),*box), tpl(src(f0),*box))
for f in sorted(rows):
    if f<262: continue
    R=g(cv2.imread(rows[f])); S=g(src(f)); out=[]
    for k,((tR,x0,y0),(tS,_,_)) in tr.items():
        rr=cv2.matchTemplate(R,tR,cv2.TM_CCOEFF_NORMED); _,vr,_,lr=cv2.minMaxLoc(rr)
        rs=cv2.matchTemplate(S,tS,cv2.TM_CCOEFF_NORMED); _,vs,_,ls=cv2.minMaxLoc(rs)
        dR=(lr[0]-P-x0,lr[1]-P-y0); dS=(ls[0]-P-x0,ls[1]-P-y0)
        out.append(f"{k}: R({dR[0]:+5d},{dR[1]:+5d})/{vr:.2f} S({dS[0]:+5d},{dS[1]:+5d})/{vs:.2f} d=({dR[0]-dS[0]:+4d},{dR[1]-dS[1]:+4d})")
    print(f"f{f} {f/25:5.2f} "+'  '.join(out))
