# tojs.py NAME in.json out.js  -> compact JS module: integer streams as base64 VLQ (zigzag, 5 data bits per char)
import json, sys
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
def vlq(nums):
    out = []
    for n in nums:
        z = (n << 1) ^ (n >> 31) if n >= 0 else ((-n) << 1) - 1
        while True:
            d = z & 31; z >>= 5
            out.append(B64[d | (32 if z else 0)])
            if not z: break
    return ''.join(out)
def xy_ints(flat, q=2):
    v = [int(round(a * q)) for a in flat]
    out = v[:2]
    for i in range(2, len(v)): out.append(v[i] - v[i - 2])
    return out
def enc_ring(flat): return vlq(xy_ints(flat))
def enc_stroke(flat):
    xs = flat[0::4]; ys = flat[1::4]; ws = flat[2::4]; vs = flat[3::4]
    xy = []
    for a, b in zip(xs, ys): xy += [a, b]
    n = len(ws)
    return vlq([n] + xy_ints(xy) + [int(round(w * 10)) for w in ws] + [int(round(v * 100)) for v in vs])
if __name__ == '__main__':
    name, inf, outf = sys.argv[1:4]
    T = json.load(open(inf))
    o = {'t': T['t'], 'box': T['box'], 'base': T['base'],
         'mask': [enc_ring(r) for r in T['mask']],
         'levels': [{'v': L['v'], 'p': ' '.join(enc_ring(r) for r in L['p'])} for L in T['levels']],
         'strokes': ' '.join(enc_stroke(s) for s in T['strokes'])}
    js = (f"// s25 traced drawing '{name}' (source frame {T['t']:.2f} s): control data only — outline rings, value iso-contours\n"
          f"// and ink centre-lines measured on that frame (no pixels). Format: see s25/owlTrace.js.\n"
          f"export const {name.upper()} = " + json.dumps(o, separators=(',', ':')) + ";\n")
    open(outf, 'w').write(js)
    print(outf, len(js), 'bytes')
