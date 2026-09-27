# degrade.py — inverse of the film's shared finish (src/lib/post.js) for the s12 layer, so tracers threshold / sample
# the source in the layer's PRE-finish values. The finish lifts thin dark ink on a bright ground a lot (halation: a
# screen blend of the blurred highlights), then applies a filmic S-curve, the vignette and the exposure flicker.
# Forward model (per pixel, grey):
#   hi  = clamp((box4(f) - 120/255) / (135/255)) * box4(f)       at 1/4 resolution
#   hb  = 0.6 * blur(hi, 5) + 0.4 * blur(hi, 16)                  (quarter-res sigmas)
#   f1  = 1 - (1 - f) * (1 - halo * hb);  f2 = 0.65 f1 + 0.35 f1^2 (3 - 2 f1);  F = f2 * vignette * flicker
# Inverse: F -> f2 -> f1 (S-curve inverted numerically) -> f, with hb estimated from the source itself.
import cv2, numpy as np

def _hb(f):
  H, W = f.shape; qw, qh = round(W / 4), round(H / 4)
  s = cv2.resize(f, (qw, qh), interpolation=cv2.INTER_AREA)
  hi = np.clip((s - 120 / 255) / (135 / 255), 0, 1) * s
  b5 = cv2.GaussianBlur(hi, (0, 0), 5); b16 = cv2.GaussianBlur(hi, (0, 0), 16)
  return cv2.resize(0.6 * b5 + 0.4 * b16, (W, H), interpolation=cv2.INTER_LINEAR)

_X = np.linspace(0, 1, 2049); _S = 0.65 * _X + 0.35 * _X * _X * (3 - 2 * _X)

def degrade(g0, halo=0.38, t=34.0):
  """g0: source frame (0..255 grey, finished). Returns the estimated pre-finish layer, 0..255."""
  H, W = g0.shape
  F = g0.astype(np.float32) / 255
  yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
  qx = ((xx + 0.5) / W - 0.5) * 2; qy = ((yy + 0.5) / H - 0.5) * 2
  r = np.clip((qx * qx + qy * qy) / 2, 0, 1)
  vig = 1 - 0.38 * r ** 1.15
  fl = 1 + 0.018 * np.sin(t * 2 * np.pi * 0.9) + 0.012 * np.sin(t * 2 * np.pi * 2.3 + 1.0)
  f2 = np.clip(F / (vig * fl), 0, 1)
  f1 = np.interp(f2, _S, _X)
  hb = _hb(f1)                                   # highlights estimated from the (de-curved) source
  f = 1 - (1 - f1) / np.maximum(1e-3, 1 - halo * hb)
  return (np.clip(f, 0, 1) * 255).astype(np.float32)
