# s23 rebuild measuring helpers (read SOURCE frames only to measure)
import cv2, numpy as np, os
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s23r'
def src(k): return cv2.imread(f'{SP}/src/{k:05d}.png')
def gray(k): return cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(np.float32)
def median(ks):
    return np.median(np.stack([src(k) for k in ks]),0).astype(np.uint8)
