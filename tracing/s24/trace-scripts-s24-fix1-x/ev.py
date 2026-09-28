# usage: ev.py OUTDIR k1,k2,...   render the given 25fps frame indices (via compare.sh on the 30fps grid) and pair with
# the source frame k; writes OUTDIR/P_k.jpg (render | source), metric lines (sigma2 and sigma8 on quarter-size luminance)
import subprocess, sys, os, glob, re, cv2, numpy as np, math
root='/Users/computer/rootline/apprentice-film'
out=sys.argv[1]; ks=[int(v) for v in sys.argv[2].split(',')]
render = '--norender' not in sys.argv
def fk(k):
    # a 30fps frame whose time maps to k
    for f in range(int((96.8+0.04*k)*30)-2, int((96.8+0.04*k)*30)+3):
        if round((f/30-96.8)/0.04)==k: return f
fs={k:fk(k) for k in ks}
if render:
    times=','.join('%.4f'%(fs[k]/30+0.002) for k in ks)
    subprocess.run(['sh',root+'/tools/compare.sh',times,out],cwd=root)
frames=glob.glob(out+'/frame-*.png')
bytk={}
for p in frames:
    T=float(re.search(r'at-([\d.]+)s',p).group(1)); f=math.floor(T*30+1e-6); k=round((f/30-96.8)/0.04); bytk[k]=p
lines=[]
def lum(im): return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
for k in ks:
    if k not in bytk: print('missing',k); continue
    R=cv2.imread(bytk[k]); S=cv2.imread(root+'/snapshots/s24-rev1-src/f_%05d.png'%(k+20))
    r=cv2.resize(lum(R),(552,237),interpolation=cv2.INTER_AREA); s=cv2.resize(lum(S),(552,237),interpolation=cv2.INTER_AREA)
    e2=np.abs(cv2.GaussianBlur(r,(0,0),2)-cv2.GaussianBlur(s,(0,0),2)).mean()
    e8=np.abs(cv2.GaussianBlur(r,(0,0),8)-cv2.GaussianBlur(s,(0,0),8)).mean()
    lines.append('k%d e2 %.1f e8 %.1f meanR %.1f meanS %.1f'%(k,e2,e8,r.mean(),s.mean()))
    P=np.hstack([R,np.full((R.shape[0],8,3),(0,0,200),np.uint8),S])
    P=cv2.resize(P,(1600,int(P.shape[0]*1600/P.shape[1])),interpolation=cv2.INTER_AREA)
    cv2.putText(P,'R k%d'%k,(8,24),0,0.8,(0,0,255),2); cv2.putText(P,'S k%d'%k,(812,24),0,0.8,(0,0,255),2)
    cv2.imwrite(out+'/P_%02d.jpg'%k,P,[cv2.IMWRITE_JPEG_QUALITY,88])
    os.makedirs(out+'/r',exist_ok=True); 
    import shutil; shutil.copy(bytk[k],out+'/r/k%02d.png'%k)
open(out+'/metric.txt','a').write('\n'.join(lines)+'\n'); print('\n'.join(lines))
if lines: print('mean e2 %.2f e8 %.2f'%(np.mean([float(l.split()[2]) for l in lines]),np.mean([float(l.split()[4]) for l in lines])))
