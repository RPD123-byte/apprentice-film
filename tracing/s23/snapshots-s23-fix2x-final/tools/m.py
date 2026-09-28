import cv2, numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23f2'
def src(k): return cv2.imread(f'{SP}/src/{k:05d}.png')
def gray(k): return cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(np.float32)
