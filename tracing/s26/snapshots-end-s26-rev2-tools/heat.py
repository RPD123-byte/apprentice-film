# end-s26-rev2: mean sigma-4 dE map per beat (new vs source), as a colour-mapped sheet with the source underneath
import cv2, numpy as np, sys
SP = "/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26r2"
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), 4), cv2.COLOR_BGR2LAB)
beats = [("A", 2763, 2788), ("C", 2790, 2817), ("D", 2818, 2842), ("E", 2843, 2853), ("F1", 2854, 2887), ("F2", 2888, 2937)]
tiles = []
for n, a, b in beats:
    acc = np.zeros((946, 2206), np.float32); k = 0
    for F in range(a, b + 1):
        R = cv2.imread(f"{SP}/new/c{F}.png"); S = cv2.imread(f"{SP}/src/{F}.png")
        acc += np.sqrt(((lab(R) - lab(S)) ** 2).sum(-1)); k += 1
    m = acc / k
    np.save(f"{SP}/heat_{n}.npy", m)
    S = cv2.imread(f"{SP}/src/{(a+b)//2}.png")
    col = cv2.applyColorMap(np.clip(m * 255 / 15, 0, 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
    t = cv2.addWeighted(col, 0.75, S, 0.25, 0)
    # grid every 200 px
    for x in range(0, 2206, 200): cv2.line(t, (x, 0), (x, 945), (80, 80, 80), 1); cv2.putText(t, str(x), (x + 3, 20), 0, 0.6, (200, 200, 200), 1)
    for y in range(0, 946, 200): cv2.line(t, (0, y), (2205, y), (80, 80, 80), 1); cv2.putText(t, str(y), (3, y + 18), 0, 0.6, (200, 200, 200), 1)
    cv2.putText(t, f"{n} {a}-{b} mean {m.mean():.2f} (scale 0-15)", (220, 60), 0, 1.4, (0, 255, 255), 3)
    tiles.append(cv2.resize(t, (1103, 473)))
rows = [np.hstack(tiles[i:i + 2]) for i in range(0, 6, 2)]
cv2.imwrite(f"{SP}/heat.jpg", np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88]); print("ok")
