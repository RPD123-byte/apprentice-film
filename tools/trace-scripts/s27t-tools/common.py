# frame loader for the s27t tracing tools: source frames decoded by index (25 fps) into the session scratchpad
import cv2, numpy as np, os
FR = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref/src'
def fidx(t): return int(round(t * 25))
def load(t, gray=False):
    f = cv2.imread(f"{FR}/{fidx(t):05d}.png")
    return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) if gray else f
def times(t0, t1, step=0.04):
    n = int(round((t1 - t0) / step)); return [round(t0 + i * step, 2) for i in range(n + 1)]
