import cv2, numpy as np, json, sys
sys.argv += []
exec(open('fit_hl.py').read().split('G = {}')[0].replace("FONT = sys.argv[1] if len(sys.argv) > 1 else 'Shrikhand.ttf'", "FONT = FONTX"), {**globals(), 'FONTX': None}) if False else None
from PIL import Image, ImageDraw, ImageFont
M = cv2.imread('face-mask.png', 0)
outs = []
for fn in sys.argv[1:]:
    J = json.load(open(fn)); FONT = J['font']; k = J['skew']
    S0 = 400; F = ImageFont.truetype(FONT, S0)
    H, W = M.shape; X0, Y0 = 630, 80
    acc = np.zeros((H, W), np.float32)
    for ch, p, iou in J['glyphs']:
        im = Image.new('L', (S0 * 2, S0 * 2), 0); d = ImageDraw.Draw(im); pad = 200; oy = S0 * 1.3
        d.text((pad, oy), ch, font=F, fill=255, anchor='ls'); g = np.asarray(im, np.float32) / 255
        tx, ty, s, th = p[:4]; sx = p[4]; kk = p[5] if len(p) > 5 else k
        sc = s / S0; c, sn = np.cos(th), np.sin(th)
        Mx = np.array([[c, -sn], [sn, c]]) @ (np.array([[sx, kk], [0, 1]]) * sc)
        T = np.array([tx - X0, ty - Y0]) - Mx @ np.array([pad, oy])
        acc = np.maximum(acc, cv2.warpAffine(g, np.hstack([Mx, T[:, None]]).astype(np.float32), (W, H)))
    vis = np.dstack([M * 0.6, (acc * 255), M * 0.6]).astype(np.uint8)
    outs.append(vis)
cv2.imwrite('hl-preview.png', np.vstack(outs))
