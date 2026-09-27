import re, subprocess, sys, numpy as np, cv2
p='/Users/computer/rootline/apprentice-film/src/shots/s08.js'
S=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/f764.png').astype(np.float32)
for v in sys.argv[1:]:
    dx,dy=v.split()
    s=open(p).read(); s=re.sub(r'rim: \{ dx: -3.3, dy: -1.4, color: "rgba\(10,11,8,0.8\)"[^}]*\}( \})?',f'rim: {{ dx: -3.3, dy: -1.4, color: "rgba(10,11,8,0.8)", nub: {{ dx: {dx}, dy: {dy} }} }}',s); open(p,'w').write(s)
    subprocess.run(['node','snapshots/s08-f3-tools/r.mjs','snapshots/s08-f3-nub','764'],capture_output=True)
    R=cv2.imread('snapshots/s08-f3-nub/r764.png').astype(np.float32)
    a=cv2.GaussianBlur(R,(0,0),1.0)[470:548,1390:1456]; b=cv2.GaussianBlur(S,(0,0),1.0)[470:548,1390:1456]
    print(v,': nub MAE %.2f'%np.abs(a-b).mean(),flush=True)
