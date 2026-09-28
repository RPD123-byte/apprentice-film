# end-s27-rev1: per-frame metrics render vs source and film.mp4 vs source. sigma4/sigma12 = mean abs RGB diff (0-255)
# after Gaussian blur; dE8 = CIE76 on sigma8-blurred Lab. Usage: python3 metrics.py WORKDIR frames.txt out.json
import cv2, numpy as np, json, sys, os
W = sys.argv[1]; frames = sorted(map(int, open(sys.argv[2]).read().split(',')))
def blur(a, s): return cv2.GaussianBlur(a, (0, 0), s)
def lab(a): return cv2.cvtColor((a / 255).astype(np.float32), cv2.COLOR_BGR2Lab)
def m(a, b):
    a = a.astype(np.float32); b = b.astype(np.float32)
    s4 = np.abs(blur(a, 4) - blur(b, 4)).mean(); s12 = np.abs(blur(a, 12) - blur(b, 12)).mean()
    de = np.sqrt(((lab(blur(a, 8)) - lab(blur(b, 8))) ** 2).sum(-1)).mean()
    return round(float(de), 3), round(float(s4), 2), round(float(s12), 2)
R = {}
for F in frames:
    s = cv2.imread(f'{W}/src/s{F}.png'); r = cv2.imread(f'{W}/render/r{F}.png'); f = cv2.imread(f'{W}/film/f{F}.png')
    if r is None: continue
    R[F] = {'t': round(F / 25, 2), 'now': m(r, s), 'film': m(f, s)}
json.dump(R, open(sys.argv[3], 'w'), indent=0)
STR = [('whip', 117.52, 117.90), ('hold', 117.92, 119.8), ('turn', 119.8, 124.6), ('hold2', 124.8, 126.3), ('owl', 126.32, 127.5),
       ('orbit', 127.6, 128.4), ('edge-on', 128.44, 128.8), ('end', 128.84, 129.29), ('ALL s27', 117.52, 129.29)]
for n, a, b in STR:
    ks = [F for F in R if a - 1e-6 <= F / 25 <= b + 1e-6]
    if not ks: continue
    now = np.mean([R[k]['now'] for k in ks], 0); fl = np.mean([R[k]['film'] for k in ks], 0)
    print(f'{n:8s} n={len(ks):3d}  now dE8 {now[0]:.2f} s4 {now[1]:.1f} s12 {now[2]:.1f}   film.mp4 dE8 {fl[0]:.2f} s4 {fl[1]:.1f} s12 {fl[2]:.1f}')
