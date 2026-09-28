# zone polygon = (designer key outline mask, dilated D) ∩ box  -> JSON on stdout (frame px)
import re, sys, json, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import dec
s = open(sys.argv[1]).read(); x0, y0, x1, y1 = map(int, sys.argv[2].split(',')); D = int(sys.argv[3]) if len(sys.argv) > 3 else 3
m = re.search(r'export const \w+_OUTLINE = "((?:[^"\\]|\\.)*)";', s)
pts = np.array(dec(m.group(1).encode().decode('unicode_escape'))).reshape(-1, 2) / 2.0
M = np.zeros((946, 2206), np.uint8); cv2.fillPoly(M, [np.int32(np.round(pts))], 1)
M = cv2.dilate(M, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * D + 1, 2 * D + 1)))
B = np.zeros_like(M); B[y0:y1, x0:x1] = 1; M &= B
cs, _ = cv2.findContours(M, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); c = max(cs, key=cv2.contourArea)
print(json.dumps(cv2.approxPolyDP(c, 1.0, True).reshape(-1, 2).tolist()))
