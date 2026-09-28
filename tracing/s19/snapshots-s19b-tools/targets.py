import sys; sys.path.insert(0, '.')
from lab import src
from s19common import ungrade
import numpy as np, cv2
A = ungrade(np.median(np.stack([src(57.32, True), src(57.36, True)]).astype(np.float32), 0), 57.34)
B = ungrade(src(63.08, True).astype(np.float32), 63.08)
np.save('../s19b-study/ungr_lit.npy', A.astype(np.float32)); np.save('../s19b-study/ungr_6308.npy', B.astype(np.float32))
cv2.imwrite('../s19b-study/ungr_lit.png', (A * 255).astype(np.uint8)); cv2.imwrite('../s19b-study/ungr_6308.png', (B * 255).astype(np.uint8))
print(A.mean(), B.mean())
