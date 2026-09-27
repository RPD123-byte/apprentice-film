# dense DIS flow between consecutive unique source frames (forward + backward), saved at 1/2 res for pose fits
import cv2, numpy as np, sys
SRC = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
OUT = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/flow'
import os; os.makedirs(OUT, exist_ok=True)
HOLDS = {1023, 1042, 1048, 1067, 1072, 1092, 1097, 1117, 1121, 1142}
frames = [i for i in range(1016, 1142) if i not in HOLDS]
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_ULTRAFAST)
dis.setFinestScale(1); dis.setPatchSize(12); dis.setPatchStride(4); dis.setGradientDescentIterations(25)
dis.setVariationalRefinementIterations(5); dis.setUseSpatialPropagation(True)
for a, b in zip(frames[:-1], frames[1:]):
    A = cv2.imread(f'{SRC}/f{a}.png', 0); B = cv2.imread(f'{SRC}/f{b}.png', 0)
    fw = dis.calc(A, B, None); bw = dis.calc(B, A, None)
    np.savez_compressed(f'{OUT}/fl_{a}_{b}.npz', fw=fw[::2, ::2].astype(np.float16), bw=bw[::2, ::2].astype(np.float16))
    print(a, b, file=sys.stderr)
