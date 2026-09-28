# Warp source / render frames into lid page coordinates (SCREEN homography) to measure the lid's rim and bezel.
# usage: lidwarp.py k RENDERDIR OUT.jpg
import cv2, numpy as np, sys, json, subprocess
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
k = int(sys.argv[1]); d = sys.argv[2]; out = sys.argv[3]
t = k / 25
Hs = json.loads(subprocess.check_output(['node', '-e', f"import('/Users/computer/rootline/apprentice-film/src/shots/s27/data.js').then(m=>{{const r=m.SCREEN; let b=r[0]; for(const x of r) if(Math.abs(x[0]-{t})<Math.abs(b[0]-{t})) b=x; console.log(JSON.stringify(b))}})"]))
H = np.array(Hs[1:10]).reshape(3, 3)
S = 0.5; X0, Y0 = -160, -300
A = np.array([[S, 0, -X0 * S], [0, S, -Y0 * S], [0, 0, 1]])   # page -> out
M = A @ np.linalg.inv(H)                                     # frame -> out
size = (int((2330 - X0) * S), int((1260 - Y0) * S))
src = cv2.warpPerspective(cv2.imread(f'{REF}/src/{k:05d}.png'), M, size)
ren = cv2.warpPerspective(cv2.imread(f'{d}/frame-{k:05d}.png'), M, size)
np.save(out + '.npy', np.stack([src, ren]))
cv2.imwrite(out, np.vstack([src, ren]))
print('Hs t', Hs[0])
