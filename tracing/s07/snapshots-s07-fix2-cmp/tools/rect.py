# rect.py : rectify laptop screen quad -> page units. functions for import; CLI: rect.py IMG OUT [k]
import sys, cv2, numpy as np
Q = np.float32([[315, 246], [834, 168], [898, 519], [409, 648]])
def rect(img, k=1.0):
  P = np.float32([[0, 0], [1600, 0], [1600, 1000], [0, 1000]]) * k
  M = cv2.getPerspectiveTransform(Q, P)
  return cv2.warpPerspective(img, M, (int(1600 * k), int(1000 * k)), flags=cv2.INTER_CUBIC)
if __name__ == '__main__':
  k = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
  cv2.imwrite(sys.argv[2], rect(cv2.imread(sys.argv[1]), k))
