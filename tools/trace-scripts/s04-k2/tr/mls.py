import numpy as np, cv2
def mls_map(src, dst, W, H, step=16, alpha=1.0, reg=0.02):
    """affine MLS f with f(src)≈dst, evaluated on a grid; returns dense (mapx,mapy) giving f(p) for each pixel p"""
    src = np.asarray(src, np.float64).reshape(-1, 2); dst = np.asarray(dst, np.float64).reshape(-1, 2)
    gy, gx = np.mgrid[0:H + step:step, 0:W + step:step].astype(np.float64)
    V = np.stack([gx.ravel(), gy.ravel()], 1)
    d2 = ((V[:, None, :] - src[None, :, :]) ** 2).sum(2)
    w = 1 / (d2 + 1) ** alpha
    sw = w.sum(1, keepdims=True)
    ps = (w @ src) / sw; qs = (w @ dst) / sw
    U = src[None] - ps[:, None]; Z = dst[None] - qs[:, None]
    a11 = (w * U[..., 0] ** 2).sum(1); a12 = (w * U[..., 0] * U[..., 1]).sum(1); a22 = (w * U[..., 1] ** 2).sum(1)
    b11 = (w * U[..., 0] * Z[..., 0]).sum(1); b12 = (w * U[..., 0] * Z[..., 1]).sum(1)
    b21 = (w * U[..., 1] * Z[..., 0]).sum(1); b22 = (w * U[..., 1] * Z[..., 1]).sum(1)
    tr = (a11 + a22) * reg
    s = (b11 + b22) / (a11 + a22 + 1e-9); rr = (b12 - b21) / (a11 + a22 + 1e-9)
    a11 = a11 + tr; a22 = a22 + tr; b11 = b11 + tr * s; b22 = b22 + tr * s; b12 = b12 + tr * rr; b21 = b21 - tr * rr
    det = a11 * a22 - a12 * a12; det[det == 0] = 1e-9
    i11 = a22 / det; i12 = -a12 / det; i22 = a11 / det
    m11 = i11 * b11 + i12 * b21; m12 = i11 * b12 + i12 * b22; m21 = i12 * b11 + i22 * b21; m22 = i12 * b12 + i22 * b22
    ex = V[:, 0] - ps[:, 0]; ey = V[:, 1] - ps[:, 1]
    fx = ex * m11 + ey * m21 + qs[:, 0]; fy = ex * m12 + ey * m22 + qs[:, 1]
    fx = fx.reshape(gx.shape).astype(np.float32); fy = fy.reshape(gx.shape).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    mx = cv2.remap(fx, xx / step, yy / step, cv2.INTER_LINEAR)
    my = cv2.remap(fy, xx / step, yy / step, cv2.INTER_LINEAR)
    return mx, my
def warp_image(img, src, dst):
    """image drawn at src positions moved so src->dst (backward map via MLS dst->src)"""
    H, W = img.shape[:2]
    mx, my = mls_map(dst, src, W, H)
    return cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
