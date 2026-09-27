# python mirror of s15's camera (author.js viewYP) + z-buffered id raster of world faces
import numpy as np, cv2
W, H = 2206, 946
K = (H / 2) / np.tan(np.radians(30))
def basis(yaw, pitch, roll):
    cy, sy, cp, sp = np.cos(yaw), np.sin(yaw), np.cos(pitch), np.sin(pitch)
    f = np.array([sy * cp, sp, cy * cp]); r = np.array([cy, 0, -sy]); u = np.array([-sy * sp, cp, -cy * sp])
    cr, sr = np.cos(roll), np.sin(roll)
    r2 = r * cr - u * sr; u2 = r * sr + u * cr
    return f, r2, u2
def to_cam(P, eye, yaw, pitch, roll):
    f, r, u = basis(yaw, pitch, roll); d = P - np.asarray(eye)
    return np.stack([d @ r, d @ u, d @ f], -1)   # x right, y up, z forward
class Scene:
    def __init__(self, faces):
        self.Q = np.array([f['q'] for f in faces], np.float64)   # (F,4,3)
        self.N = np.array([f['n'] for f in faces], np.float64)
        self.pic = np.array([f.get('style') == 1 for f in faces])
        self.kind = np.array([(5 if f.get('style') == 1 else 1 if (f['n'][1] > 0.5 and f.get('ink') == 0) else 4 if f['n'][1] > 0.5 else 2 if abs(f['n'][2]) > 0.7 else 3) for f in faces])
    def raster(self, eye, yaw, pitch, roll, S=4, near=0.03):
        w, h = W // S, H // S; k = K / S
        C = to_cam(self.Q.reshape(-1, 3), eye, yaw, pitch, roll).reshape(-1, 4, 3)
        ctr = self.Q.mean(1); vis = ((ctr - np.asarray(eye)) * self.N).sum(1) <= 0
        vis |= self.pic
        zb = np.full((h, w), np.inf, np.float32); ib = np.full((h, w), -1, np.int32)
        order = np.where(vis & (C[:, :, 2].max(1) > near))[0]
        for i in order:
            poly = C[i]
            if (poly[:, 2] < near).any():
                out = []
                for a in range(4):
                    A, B = poly[a], poly[(a + 1) % 4]
                    if A[2] >= near: out.append(A)
                    if (A[2] >= near) != (B[2] >= near):
                        s = (near - A[2]) / (B[2] - A[2]); out.append(A + (B - A) * s)
                if len(out) < 3: continue
                poly = np.array(out)
            sx = w / 2 + poly[:, 0] * k / poly[:, 2]; sy = h / 2 - poly[:, 1] * k / poly[:, 2]
            if np.abs(sx).max() > 4e4 or np.abs(sy).max() > 4e4: continue
            x0, x1 = max(0, int(np.floor(sx.min()))), min(w - 1, int(np.ceil(sx.max())))
            y0, y1 = max(0, int(np.floor(sy.min()))), min(h - 1, int(np.ceil(sy.max())))
            if x1 < x0 or y1 < y0: continue
            m = np.zeros((y1 - y0 + 1, x1 - x0 + 1), np.uint8)
            cv2.fillPoly(m, [np.round(np.c_[sx - x0, sy - y0]).astype(np.int32)], 1)
            A = np.c_[sx, sy, np.ones(len(sx))]; coef, *_ = np.linalg.lstsq(A, 1 / poly[:, 2], rcond=None)
            yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
            z = 1 / np.maximum(coef[0] * xx + coef[1] * yy + coef[2], 1e-6)
            sub = zb[y0:y1 + 1, x0:x1 + 1]; upd = (m > 0) & (z < sub)
            sub[upd] = z[upd]; ib[y0:y1 + 1, x0:x1 + 1][upd] = i
        return ib, zb
def edges(ib):
    e = np.zeros(ib.shape, bool); e[:, 1:] |= ib[:, 1:] != ib[:, :-1]; e[1:, :] |= ib[1:, :] != ib[:-1, :]; return e
