import cv2, glob, re, sys, numpy as np, os
root='/Users/computer/rootline/apprentice-film/snapshots/'
src=root+'s02-fix1h-src/%04d.png'
out=root+'s02-rev2-work/'
rows=[]
for d in sys.argv[1:] or ['s02-rev2-a','s02-rev2-b']:
    for p in sorted(glob.glob(root+d+'/frame-*.png')):
        t=float(re.search(r'at-([\d.]+)s',p).group(1))
        f=int(round((t-0.001)*25))  # hyperframes grid floor(t*30)/30 -> frame
        tt=int(t*30)/30; f=int(tt*25+0.5)
        r=cv2.imread(p); s=cv2.imread(src%f)
        if s is None: continue
        g=lambda im: cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
        mae=np.abs(g(r)-g(s)).mean()
        # also vs f-1, f+1
        alt=[]
        for k in (-1,1):
            s2=cv2.imread(src%(f+k)); alt.append(np.abs(g(r)-g(s2)).mean() if s2 is not None else -1)
        gr=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY); gs=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY)
        rows.append((f,t,mae,alt[0],alt[1],gr.mean(),gs.mean(),(gr<20).mean(),(gs<20).mean()))
        pair=np.hstack([cv2.resize(r,(1103,473)),cv2.resize(s,(1103,473))])
        cv2.putText(pair,'f%d render'%f,(10,30),0,0.9,(0,0,255),2); cv2.putText(pair,'source',(1113,30),0,0.9,(0,0,255),2)
        cv2.imwrite(out+'p%03d.jpg'%f,pair,[cv2.IMWRITE_JPEG_QUALITY,88])
print('f t mae mae(f-1) mae(f+1) meanR meanS blackR blackS')
for r in sorted(rows): print('%d %.3f %.2f %.2f %.2f %.1f %.1f %.2f %.2f'%r)
