import cv2, numpy as np, os
FR='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/fr'
def fidx(t): return int(round(t*25))
def load(t, gray=False):
    f=cv2.imread(f"{FR}/f{fidx(t):05d}.png")
    return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY) if gray else f
def times(t0,t1,step=0.04):
    n=int(round((t1-t0)/step)); return [round(t0+i*step,2) for i in range(n+1)]
