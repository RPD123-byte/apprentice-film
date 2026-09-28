import re, subprocess, sys, numpy as np, cv2
p='/Users/computer/rootline/apprentice-film/src/shots/s08.js'
S=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/f764.png').astype(np.float32)
def err():
    R=cv2.imread('snapshots/s08-f3-star/r764.png').astype(np.float32)
    a=cv2.GaussianBlur(R,(0,0),1.0); b=cv2.GaussianBlur(S,(0,0),1.0)
    return [np.abs(a[cy-h:cy+h,cx-h:cx+h]-b[cy-h:cy+h,cx-h:cx+h]).mean() for (cx,cy,h) in [(637,238,40),(860,212,36),(1007,65,52)]]
for v in sys.argv[1:]:
    w,c,k=v.split()
    s=open(p).read(); s=re.sub(r'const STAR_P = \{[^}]*\};',f'const STAR_P = {{ w: {w}, c: {c}, k: {k}, dy: 0 }};',s); open(p,'w').write(s)
    subprocess.run(['node','snapshots/s08-f3-tools/r.mjs','snapshots/s08-f3-star','764'],capture_output=True)
    e=err(); print(v,':',' '.join('%.2f'%x for x in e),' sum %.2f'%sum(e),flush=True)
