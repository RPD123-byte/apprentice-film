import cv2, numpy as np, sys
im = cv2.imread('../f2r-meas/page-pre.png').astype(int)
def cls(p):
    b,g,r = p
    if r>200 and g>200: return 'C'   # cream
    if r>190 and g>150 and b<110: return 'Y'
    if r>150 and g<120 and b<100: return 'O'
    if r>130 and g<80 and b>90 and r > b+10: return 'P'  # pink/magenta
    if b>100 and r<170 and r<=b+10: return 'V'  # purple
    if r<70 and g<70 and b<80: return '.'
    return '?'
for spec in sys.argv[1:]:
    t, v, a, b = spec.split(',')
    v, a, b = int(v), int(a), int(b)
    s = ''
    for u in range(a, b):
        p = im[u, v] if t == 'col' else im[v, u]
        s += cls(p)
    print(spec, s)
