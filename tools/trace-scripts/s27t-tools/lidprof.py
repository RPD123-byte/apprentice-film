# Lid rim/bezel profiles in page coordinates (scale 1), averaged over source frames ks (SCREEN homography).
import cv2, numpy as np, sys, json, subprocess
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
ks = [int(x) for x in sys.argv[1].split(',')]; which = sys.argv[2] if len(sys.argv) > 2 else 'src'
SCR = json.loads(subprocess.check_output(['node', '-e', "import('/Users/computer/rootline/apprentice-film/src/shots/s27/data.js').then(m=>console.log(JSON.stringify(m.SCREEN)))"]))
X0, Y0, X1, Y1 = -160, -300, 2330, 1260
acc = None
for k in ks:
    t = k / 25; row = min(SCR, key=lambda r: abs(r[0] - t)); H = np.array(row[1:10]).reshape(3, 3)
    M = np.array([[1, 0, -X0], [0, 1, -Y0], [0, 0, 1]]) @ np.linalg.inv(H)
    f = f'{REF}/src/{k:05d}.png' if which == 'src' else f'{which}/frame-{k:05d}.png'
    w = cv2.warpPerspective(cv2.imread(f), M, (X1 - X0, Y1 - Y0)).astype(float)
    acc = w if acc is None else acc + w
A = acc / len(ks)
L = A.mean(2)
def show(name, prof, coord0, step=4):
    print(name); print(' '.join('%d:%d' % (coord0 + j, prof[j]) for j in range(0, len(prof), step)))
show('top (x 300..1900), page y -260..-100', L[-260 - Y0:-100 - Y0, 300 - X0:1900 - X0].mean(1), -260)
show('bottom (x 300..1900), page y 1000..1200', L[1000 - Y0:1200 - Y0, 300 - X0:1900 - X0].mean(1), 1000)
show('left (y 100..800), page x -120..40', L[100 - Y0:800 - Y0, -120 - X0:40 - X0].mean(0), -120)
show('right (y 100..800), page x 2150..2300', L[100 - Y0:800 - Y0, 2150 - X0:2300 - X0].mean(0), 2150)
