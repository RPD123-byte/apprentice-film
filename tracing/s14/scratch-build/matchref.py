import cv2, glob, re, sys, numpy as np
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
src={int(re.search(r'n(\d+)',p).group(1)):cv2.resize(cv2.imread(p,0),(551,236)).astype(np.float32) for p in glob.glob(S+'/n*.png')}
for d in sys.argv[1:]:
  for p in sorted(glob.glob(d+'/ref-*.png')):
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    r=cv2.resize(cv2.imread(p,0),(551,236)).astype(np.float32)
    errs=sorted((np.abs(r-v).mean(),k) for k,v in src.items())
    print(f'{t:.3f} t*25={t*25:.2f} best n={errs[0][1]} ({errs[0][1]/25:.2f}s) err={errs[0][0]:.2f} 2nd n={errs[1][1]} {errs[1][0]:.2f}')
