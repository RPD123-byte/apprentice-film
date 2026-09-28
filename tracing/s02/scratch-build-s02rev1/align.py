# align.py dir... : for each render frame, true source frame; blurred MAE; best offset render->source (template of centre)
import cv2, glob, re, sys, math, numpy as np
cap=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
rows={}
for d in sys.argv[1:]:
    for p in glob.glob(d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1)); q=math.floor(t*30+1e-6)/30; f=math.floor(q*25+0.5)
        if 151<=f<=477: rows.setdefault(f,p)
def prep(im,s):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
    g=cv2.GaussianBlur(g,(0,0),s); return g
for f in sorted(rows):
    cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,S=cap.read(); R=cv2.imread(rows[f])
    ga=prep(R,8); gb=prep(S,8); mae=np.abs(ga-gb).mean()
    a=prep(R,3); b=prep(S,3)
    M=150; tpl=a[M:946-M, M+200:2206-M-200]
    res=cv2.matchTemplate(b,tpl,cv2.TM_CCOEFF_NORMED); _,v,_,loc=cv2.minMaxLoc(res)
    dx=loc[0]-(M+200); dy=loc[1]-M
    print(f"f{f} t={f/25:5.2f} MAE8={mae:5.1f} mean {ga.mean():5.1f}/{gb.mean():5.1f}  offset(src-render)=({dx:+4d},{dy:+4d}) score={v:.2f}")
