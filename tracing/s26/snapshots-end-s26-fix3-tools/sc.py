# end-s26-rev2 (review scratch): blurred CIE76 dE (sigma 4 / 12) and blurred abs diff of render frames vs source frames by index.
import cv2, numpy as np, sys, json, os
def lab(im, s):
    b = cv2.GaussianBlur(im.astype(np.float32) / 255.0, (0, 0), s)
    return cv2.cvtColor(b, cv2.COLOR_BGR2LAB)
def de(a, b, s, mask=None):
    d = np.sqrt(((lab(a, s) - lab(b, s)) ** 2).sum(-1))
    return float(d[mask].mean() if mask is not None else d.mean())
def ad(a, b, s):
    return float(np.abs(cv2.GaussianBlur(a.astype(np.float32), (0, 0), s) - cv2.GaussianBlur(b.astype(np.float32), (0, 0), s)).mean())
def load(p):
    im = cv2.imread(p)
    if im is None: return None
    if im.shape[:2] != (946, 2206): im = cv2.resize(im, (2206, 946), interpolation=cv2.INTER_AREA)
    return im
if __name__ == "__main__":
    src, pairs = sys.argv[1], sys.argv[2:]  # pairs: label=dir/pattern{F}
    out = {}
    Fs = [int(x) for x in os.environ["FS"].split(",")]
    for F in Fs:
        S = load(src.format(F=F)); row = {}
        for p in pairs:
            lbl, pat = p.split("=", 1); R = load(pat.format(F=F))
            if R is None: continue
            row[lbl] = [round(de(R, S, 4), 2), round(de(R, S, 12), 2), round(ad(R, S, 4), 2)]
        out[F] = row
        print(F, row, flush=True)
    json.dump(out, open(os.environ.get("OUT", "/dev/null"), "w"))
