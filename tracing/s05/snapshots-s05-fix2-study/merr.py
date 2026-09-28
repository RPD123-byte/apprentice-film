#!/usr/bin/env python3
# merr.py DIR: for every kNNN.png in DIR, blurred (sigma 2) MAE vs source frame NNN, whole / outside screen / regions
import sys, glob, re, cv2, numpy as np
REG={'head':(1150,0,1950,520),'owl':(1420,220,1780,700),'hands':(560,600,1250,800),'desk':(0,450,1550,946),'back':(1600,450,2206,946),'room':(0,0,1150,480),'screen':(300,160,910,660)}
for p in sorted(glob.glob(sys.argv[1]+'/k*.png')):
    k=int(re.search(r'k(\d+)',p).group(1)); r=cv2.imread(p).astype(np.float32).mean(2); s=cv2.imread(f'src/{k}.png').astype(np.float32).mean(2)
    e=np.abs(cv2.GaussianBlur(r,(0,0),2)-cv2.GaussianBlur(s,(0,0),2))
    ns=np.ones_like(e,bool); x0,y0,x1,y1=REG['screen']; ns[y0:y1,x0:x1]=False
    print(f'k{k} t{k/25:.2f} all {e.mean():5.2f} nonscr {e[ns].mean():5.2f} | '+' '.join(f'{n} {e[y0:y1,x0:x1].mean():5.1f}' for n,(x0,y0,x1,y1) in REG.items()))
