# Compact encoding of the traced data: each CSV integer string -> base64 of zigzag LEB128 varints (values unchanged).
# pack.py FILE...  re-encodes existing data modules in place (idempotent: already-packed strings are left alone).
import re, sys, base64
def pack_ints(vals):
    out = bytearray()
    for v in vals:
        z = (v << 1) ^ (v >> 63) if v < 0 else v << 1
        z &= (1 << 64) - 1
        while True:
            b = z & 0x7f; z >>= 7
            if z: out.append(b | 0x80)
            else: out.append(b); break
    return base64.b64encode(bytes(out)).decode()
def pack_csv(s):
    return pack_ints([int(x) for x in s.split(',')])
def main_one(p):
    main([p])
def main(paths):
    for p in paths:
        t = open(p).read()
        n = [0]
        def rep(m):
            n[0] += 1; return '"' + pack_csv(m.group(1)) + '"'
        t2 = re.sub(r'"(-?\d+(?:,-?\d+)*)"', rep, t)
        t2 = t2.replace('// levels: [{v, r: [ring...]}] rings = delta-coded x2,y2 (half px); strokes: delta-coded x2,y2 (half px),',
                        '// levels: [{v, r: [ring...]}] rings = delta-coded x2,y2 (half px); strokes: delta-coded x2,y2 (half px), [packed:\n// base64 zigzag varints]')
        open(p, 'w').write(t2)
        print(p, n[0], 'strings', len(t), '->', len(t2))

if __name__ == '__main__':
    main(sys.argv[1:])
