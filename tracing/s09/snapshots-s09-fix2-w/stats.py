import cv2, numpy as np, glob, re, sys
d=sys.argv[1]
REG={'whole':(0,0,2206,946),'crownL':(0,0,180,250),'crownR':(180,0,390,250),'cuffL':(0,290,220,510),'cuffR':(250,290,470,510),'cuffBot':(0,515,300,555),
'hairUp':(0,560,700,760),'hairLow':(300,760,560,946),'neck':(170,812,268,946),'cheek':(0,720,165,946),'shirt':(320,890,560,946),'lock':(85,665,160,730),
'slabUpper':(700,770,820,840),'slabTex':(650,800,850,940),'crease':(870,860,950,946),'slabRlow':(930,915,1060,946),'slabR':(1150,880,1300,946),
'owlFace':(700,150,1160,650),'owlBody':(900,550,1500,850),'wing':(1500,500,1950,850),'talL':(1065,855,1190,935),'talR':(1285,890,1450,946),
'roomMid':(1700,230,1930,520),'roomLow':(1760,650,2030,946),'plant':(1970,170,2080,420),'bag':(1950,525,2045,645),'knobs':(1660,425,1750,495),'cables':(1760,220,1870,400),
'speaker':(2040,370,2206,946),'tweeter':(2135,460,2206,590),'woofer':(2060,620,2206,940)}
def hf(a): return np.abs(a-cv2.GaussianBlur(a,(0,0),1.5)).mean()
rows={}
for f in sorted(glob.glob(d+'/frame-*.png')):
    t=re.search(r'at-([\d.]+)s',f).group(1)
    r=cv2.imread(f,0).astype(float); s=cv2.imread(f.replace('frame-','ref-'),0).astype(float)
    R6,S6=cv2.GaussianBlur(r,(0,0),6),cv2.GaussianBlur(s,(0,0),6)
    for k,(x0,y0,x1,y1) in REG.items():
        a,b=r[y0:y1,x0:x1],s[y0:y1,x0:x1]
        rows.setdefault(k,[]).append((t,np.abs(R6-S6)[y0:y1,x0:x1].mean(),a.mean()-b.mean(),hf(a),hf(b),np.percentile(a,90),np.percentile(b,90),np.percentile(a,10),np.percentile(b,10)))
sel=sys.argv[2].split(',') if len(sys.argv)>2 else None
print('%-10s %6s %6s %6s %6s %6s %5s %5s %5s %5s'%('region','t','MAE6','dMean','HFr','HFs','p90r','p90s','p10r','p10s'))
for k,v in rows.items():
    for (t,*x) in v:
        if sel and t not in sel: continue
        print('%-10s %6s %6.1f %+6.1f %6.1f %6.1f %5.0f %5.0f %5.0f %5.0f'%(k,t,*x))
