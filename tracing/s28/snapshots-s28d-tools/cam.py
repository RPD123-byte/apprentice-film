# The measured s28 camera (orbit), mirrored from src/shots/s28/cam.js (a measurement table: KLT tracks, joint fit).
import numpy as np, re, os
_js = open(os.path.join(os.path.dirname(__file__), '../../src/shots/s28/cam.js')).read()
F, CX, CY = 2650.890, 1103, 473
CAM = np.array(eval(re.search(r'export const CAM = (\[\[.*?\]\]);', _js, re.S).group(1)))
RAD = np.pi / 180

def params(t):
    k = int(round((t - CAM[0, 0]) * 25))
    if k <= 0: return CAM[0, 1:]
    if k >= len(CAM) - 1: return np.zeros(3)
    return CAM[k, 1:]

def Ry(a):
    c, s = np.cos(a), np.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def Rx(a):
    c, s = np.cos(a), np.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])

def cam(t=None, th=None, phi=None, pit=None):
    if t is not None: th, phi, pit = params(t)
    th, phi, pit = th * RAD, phi * RAD, pit * RAD
    Y = Ry(th)
    C = np.array([-Y[0, 2], -Y[1, 2], 1 - Y[2, 2]])
    R = Rx(pit) @ Ry(-(th + phi))
    return R, C

K = np.array([[F, 0, CX], [0, F, CY], [0, 0, 1.0]])

def project(t, X):
    R, C = cam(t)
    X = np.atleast_2d(X)
    q = (R @ (X - C).T).T
    return np.c_[F * q[:, 0] / q[:, 2] + CX, F * q[:, 1] / q[:, 2] + CY, q[:, 2]]

def hit(t, uv, plane):
    R, C = cam(t)
    n, d = plane
    uv = np.atleast_2d(uv)
    dc = np.c_[(uv[:, 0] - CX) / F, (uv[:, 1] - CY) / F, np.ones(len(uv))]
    dw = (R.T @ dc.T).T
    s = (d - n @ C) / (dw @ n)
    return C + dw * s[:, None]

def vplane(x, z, dx, dz):
    l = np.hypot(dx, dz); n = np.array([-dz / l, 0, dx / l]); return (n, n[0] * x + n[2] * z)

BACK = vplane(-0.515, 1.83, -0.802, -0.598)
RIGHT = vplane(0.663, 1.769, -0.202, 0.979)
_dn = np.hypot(np.hypot(0.0036, 1), 0.1086)
DESK = (np.array([-0.0036 / _dn, 1 / _dn, -0.1086 / _dn]), 0.025 / _dn)

def H_plane(t0, t1, plane):
    """homography mapping frame(t0) pixels on `plane` to frame(t1) pixels."""
    pts = np.array([[200, 200], [2000, 200], [2000, 800], [200, 800]], float)
    X = hit(t0, pts, plane)
    q = project(t1, X)[:, :2]
    import cv2
    return cv2.getPerspectiveTransform(pts.astype(np.float32), q.astype(np.float32))
