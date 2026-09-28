import sys, math
# frame numbers -> times that the 30fps-flooring runtime maps onto exactly that 25fps source frame
ns=[int(x) for x in sys.argv[1].split(',')]
out=[]
for n in ns:
    k=math.ceil(1.2*n-1e-9)
    t=k/30
    s=math.ceil(t*10000)/10000
    out.append('%.4f'%s)
print(','.join(out))
