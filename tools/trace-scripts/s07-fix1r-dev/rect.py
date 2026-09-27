# rect.py IMG OUT [k] : rectify the laptop screen quad of a frame into page units (1600x1000 * k)
import sys, cv2, numpy as np
img = cv2.imread(sys.argv[1]); k = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
Q = np.float32([[315, 246], [834, 168], [898, 519], [409, 648]])
P = np.float32([[0, 0], [1600, 0], [1600, 1000], [0, 1000]]) * k
M = cv2.getPerspectiveTransform(Q, P)
r = cv2.warpPerspective(img, M, (int(1600 * k), int(1000 * k)), flags=cv2.INTER_CUBIC)
cv2.imwrite(sys.argv[2], r)
