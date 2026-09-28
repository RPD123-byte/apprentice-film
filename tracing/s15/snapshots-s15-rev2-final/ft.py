import sys, math
def T(n):
    x=1.2*n; f=x-math.floor(x)
    if abs(f)<1e-6 or abs(f-1)<1e-6: k=round(x)
    elif f>0.4+1e-6: k=math.ceil(x)
    else: k=math.floor(x)
    return k/30+0.0005
frames=[int(a) for a in sys.argv[1:]]
print(','.join(f'{T(n):.4f}' for n in frames))
