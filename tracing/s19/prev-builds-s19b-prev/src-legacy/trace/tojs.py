# Export a traced room (trace_room.py JSON) to src/shots/s19/roomdata.js as packed base64 (positions, widths
# and values only; no pixels). Layout per stroke layer: u16 count, then per stroke u16 n + n x (u16 x*8, u16 y*8,
# u8 w*10, u8 v*255). Base: u8 nlevels, per level u8 value*255, u16 nrings, per ring u16 n + n x (u16 x*8, u16 y*8).
import sys, json, struct, base64
d = json.load(open(sys.argv[1])); out = sys.argv[2]
def strokes(S):
    b = bytearray(struct.pack('<I', len(S)))
    for s in S:
        b += struct.pack('<H', len(s))
        for x, y, w, v in s:
            b += struct.pack('<HHBB', max(0, min(65535, round(x * 8))), max(0, min(65535, round(y * 8))), max(1, min(255, round(w * 10))), max(0, min(255, round(v * 255))))
    return base64.b64encode(bytes(b)).decode()
def base(B):
    b = bytearray(struct.pack('<B', len(B)))
    for v, rings in B:
        b += struct.pack('<BH', max(0, min(255, round(v * 255))), len(rings))
        for r in rings:
            b += struct.pack('<H', len(r))
            for x, y in r: b += struct.pack('<HH', max(0, min(65535, round(x * 8))), max(0, min(65535, round(y * 8))))
    return base64.b64encode(bytes(b)).decode()
def ring(r):
    b = bytearray(struct.pack('<H', len(r)))
    for x, y in r: b += struct.pack('<HH', max(0, min(65535, round(x * 8))), max(0, min(65535, round(y * 8))))
    return base64.b64encode(bytes(b)).decode()
def dpts(pts, q=2):
    # delta-coded points: first u16 x, u16 y (1/8 px), then int8 dx, dy in 1/q px; -128 escapes to a u16 pair
    b = bytearray(); px = py = None
    for x, y in pts:
        X, Y = round(x * 8), round(y * 8)
        if px is None: b += struct.pack('<HH', max(0, min(65535, X)), max(0, min(65535, Y)))
        else:
            dx, dy = round((X - px) * q / 8), round((Y - py) * q / 8)
            if -127 <= dx <= 127 and -127 <= dy <= 127: b += struct.pack('<bb', dx, dy); X, Y = px + dx * 8 / q, py + dy * 8 / q
            else: b += struct.pack('<bHH', -128, max(0, min(65535, X)), max(0, min(65535, Y)))
        px, py = X, Y
    return b
def base2(B):
    b = bytearray(struct.pack('<B', len(B)))
    for v, rings in B:
        b += struct.pack('<BH', max(0, min(255, round(v * 255))), len(rings))
        for r in rings: b += struct.pack('<H', len(r)) + dpts(r)
    return base64.b64encode(bytes(b)).decode()
def strokes2(S):
    b = bytearray(struct.pack('<I', len(S)))
    for st in S:
        b += struct.pack('<H', len(st)) + dpts([(p[0], p[1]) for p in st], q=4)
        for p in st: b += struct.pack('<BB', max(1, min(255, round(p[2] * 10))), max(0, min(255, round(p[3] * 255))))
    return base64.b64encode(bytes(b)).decode()
if len(sys.argv) > 3 and sys.argv[3] == 'owl':
    hdr = """// s19 owl drawings, MEASURED: the owl traced on EVERY source frame 57.40–63.08 (143 frames), in the room's stroke
// format: posterised outlines of the plumage's tone, dark ink strokes and white strokes (centre-lines with width and
// value) inside the owl's region, stored as the clip outline. Region, while the card stands (to 61.44): the owl's
// silhouette from the background difference against the owl-free 57.32/57.36 frame (dust removed, grown 3 px);
// 61.48–61.68: a GrabCut silhouette seeded by the painted rig's, the flat card paper it caught removed, grown 4 px;
// 61.72–63.08: the GrabCut silhouette grown 8 px. No pixels are stored. Tracer: src/shots/s19/trace/trace_owl.py
// (+ ridges.py, tojs.py); roomtrace.js redraws them. Packed: rings and stroke spines delta-coded (int8 steps of
// 1/2 px and 1/4 px; -128 escapes to an absolute u16 pair at 1/8 px).
"""
    L = []
    for k in sorted(d, key=float):
        lay = d[k]
        L.append(f'  "{k}": {{\n    clip: "{ring(lay["clip"])}",\n    base: "{base2(lay["base"])}",\n    dark: "{strokes2(lay["dark"])}",\n    bright: "{strokes2(lay["bright"])}",\n  }},')
    open(out, 'w').write(hdr + 'export const OWLKEYS = {\n' + '\n'.join(L) + '\n};\n')
    print('wrote', out, round(len(open(out).read()) / 1e6, 3), 'MB'); sys.exit(0)
L = []
for name in ('room', 'lit'):
    lay = d[name]
    L.append(f'  {name}: {{\n    base: "{base(lay["base"])}",\n    dark: "{strokes(lay["dark"])}",\n    bright: "{strokes(lay["bright"])}",\n  }},')
hdr = """// s19 room, MEASURED: the scratchboard strokes of the source's room traced from two source frames — 63.08 (card lifted:
// the speaker, plank, scissors and jack panel behind it) and 57.32/57.36 (card standing: the right side and the lit
// floor) — with the grade inverted (flicker, vignette, S-curve, halation) and the card's measured glow subtracted. Stroke centre-lines with width and value,
// and posterised outlines of the broad lit areas; no pixels are stored. Tracer: src/shots/s19/trace/ (plates.py,
// trace_room.py, ridges.py, tojs.py). roomtrace.js redraws it.
// room: the room with the floor dark (as after the card is lifted); lit: the floor lit by the standing card.
"""
open(out, 'w').write(hdr + 'export const ROOM = {\n' + '\n'.join(L) + '\n};\n')
print('wrote', out, round(len(open(out).read()) / 1e6, 3), 'MB')
