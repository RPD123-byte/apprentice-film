#!/usr/bin/env python3
# rect.py IMG OUT [--raw]: rectify the laptop screen (the page quad) of a frame to page units (800x500 = half scale)
import sys, cv2, numpy as np
Q=np.float32([[320.7,246.0],[834.7,168.7],[900.9,521.2],[411.9,644.8]])
img=cv2.imread(sys.argv[1])
M=cv2.getPerspectiveTransform(Q,np.float32([[0,0],[800,0],[800,500],[0,500]]))
out=cv2.warpPerspective(img,M,(800,500),flags=cv2.INTER_CUBIC)
cv2.imwrite(sys.argv[2],out,[cv2.IMWRITE_JPEG_QUALITY,92])
