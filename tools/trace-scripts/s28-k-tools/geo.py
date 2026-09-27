# Python port of s28's camera, key meshes and lid table (src/shots/s28/*.js) for measuring.
import json, re, math, numpy as np, cv2, os
ROOT = '/Users/computer/rootline/apprentice-film'
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
W, H = 2206, 946

def _js(path, name):
    s = open(path).read()
    m = re.search(r'export const %s = ' % name, s)
    i = m.end()
    # find the matching end by json decoding
    dec = json.JSONDecoder()
    obj, _ = dec.raw_decode(s[i:])
    return obj

CAMJS = open(ROOT + '/src/shots/s28/cam.js').read()
F = 2650.890; CX = 1103; CY = 473
CAM = _js(ROOT + '/src/shots/s28/cam.js', 'CAM')
LIDQ = _js(ROOT + '/src/shots/s28/data.js', 'LIDQ')
DEPTH = _js(ROOT + '/src/shots/s28/depth.js', 'DEPTH')
RAD = math.pi / 180

def frameT(t):
    return math.ceil(t * 25 - 1e-6) / 25

def camParams(t):
    k = round((t - CAM[0][0]) * 25)
    if k <= 0: return CAM[0][1:]
    if k >= len(CAM) - 1: return [0, 0, 0]
    return CAM[k][1:]

def Ry(a):
    c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def Rx(a):
    c, s = math.cos(a), math.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])

def camFrom(th, phi, pit):
    th *= RAD; phi *= RAD; pit *= RAD
    Y = Ry(th)
    C = np.array([-(Y[0][2]), -(Y[1][2]), 1 - Y[2][2]])
    R = Rx(pit) @ Ry(-(th + phi))
    return R, C

def camAt(t):
    return camFrom(*camParams(t))

def project(cam, X):
    R, C = cam
    q = (X - C) @ R.T
    return np.stack([F * q[:, 0] / q[:, 2] + CX, F * q[:, 1] / q[:, 2] + CY], 1), q[:, 2]

def lidQuad(t):
    k = max(0, min(len(LIDQ) - 1, round((t - LIDQ[0][0]) * 25)))
    return np.array(LIDQ[k][1:]).reshape(4, 2)

def keyVerts(G, tkey):
    """grid vertices (u,v) of a depth grid and their world positions (key camera at tkey)."""
    R, C = camAt(frameT(tkey))
    u0, v0, st, nu, nv = G['u0'], G['v0'], G['step'], G['nu'], G['nv']
    s = np.array(G['s'])
    jj, ii = np.mgrid[0:nv, 0:nu]
    u = (u0 + ii * st).ravel().astype(float); v = (v0 + jj * st).ravel().astype(float)
    dc = np.stack([(u - CX) / F * s, (v - CY) / F * s, s], 1)
    X = C + dc @ R      # R^T dc
    return np.stack([u, v], 1), X

_cap = None
def frame(k):
    global _cap
    if _cap is None: _cap = cv2.VideoCapture(V)
    _cap.set(cv2.CAP_PROP_POS_FRAMES, k); ok, f = _cap.read()
    return f

def loadKey(name):
    s = open(ROOT + '/src/shots/s28/keys/%s.js' % name).read()
    return json.loads(s[s.index('{'):].rstrip().rstrip(';'))

def ringsMask(rings, shape=(H, W), off=(0, 0)):
    m = np.zeros(shape, np.uint8)
    pts = [np.int32(np.round(np.array(r) - np.array(off))) for r in rings]
    cv2.fillPoly(m, pts, 255)
    return m
