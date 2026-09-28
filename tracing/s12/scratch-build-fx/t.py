import numpy as np
d=np.load('../flow2/fl_1025_1026.npz'); print(d.files, d['fw'].shape, d['fw'].dtype)
import glob; print(sorted(glob.glob('../flow2/*'))[-5:])
