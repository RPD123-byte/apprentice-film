# compact polygon codec (matches src/shots/s27/codec.js): an int list [x0,y0,x1,y1,...] -> a string of delta-coded,
# zigzag, 5-bit varint chunks (chars 63..126), as in the polyline encoding.
def enc(a):
    out=[]; px=py=0
    for i in range(0,len(a),2):
        for v,p in ((a[i],px),(a[i+1],py)):
            d=v-p; z=(d<<1)^(d>>31) if d>=0 else ((-d)<<1)-1
            while z>=32: out.append(chr((32|(z&31))+63)); z>>=5
            out.append(chr(z+63))
        px,py=a[i],a[i+1]
    return ''.join(out)
def dec(s):
    vals=[]; z=sh=0
    for ch in s:
        b=ord(ch)-63; z|=(b&31)<<sh; sh+=5
        if b<32: vals.append((z>>1) if not (z&1) else -((z+1)>>1)); z=sh=0
    out=[]; px=py=0
    for i in range(0,len(vals),2): px+=vals[i]; py+=vals[i+1]; out+= [px,py]
    return out
def deep(x):
    """replace every flat int list (a polygon) in a nested structure by its string"""
    if isinstance(x,list) and x and all(isinstance(v,int) for v in x) and len(x)>=4: return enc(x)
    if isinstance(x,list): return [deep(v) for v in x]
    return x
if __name__=='__main__':
    import random
    for _ in range(200):
        a=[random.randint(-3000,5000) for _ in range(2*random.randint(2,30))]; assert dec(enc(a))==a
    print('ok')
