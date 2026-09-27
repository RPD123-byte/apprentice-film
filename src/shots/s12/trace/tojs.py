import json, sys
res=json.load(open(sys.argv[1])); out=sys.argv[2]
lines=[]
for r in res:
  flat=[]
  for x,y,w,v in r: flat+= [round(x*2)/2, round(y*2)/2, round(w,1), round(v,2)]
  lines.append('['+','.join(('%g'%f) for f in flat)+']')
hdr="""// Ink strokes of the s12 hero owl: centre-lines of the dark feather strokes MEASURED on the source frame at 34.0 s
// (skeleton of the locally-dark pixels inside the lit silhouette, smoothed, RDP-simplified). Each stroke is a flat
// list x, y, w, v per point: frame px, full stroke width px, ink value 0..1 (darkest pixel at that point).
// Positions/widths only — no source pixels are stored; hero.js redraws every stroke with the kit's taper engine.
// Regenerate: see fidelity/s12.md (tracer script). Parts drawn separately (eyes, beak, plaster, headphones, feet)
// were masked out before tracing.
export const STROKES = [
"""
open(out,'w').write(hdr+',\n'.join(lines)+'\n];\n')
print(len(lines))
