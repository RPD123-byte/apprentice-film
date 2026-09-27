# cels/*.json -> src/shots/s23/cels.js (compact strings; see celdraw.js for the decoder)
import json, glob, os, sys, re
ALPH="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
def vint(v):
    out=''
    while v>=32: out+=ALPH[32+(v&31)]; v>>=5
    return out+ALPH[v]
zz=lambda v: (v<<1) if v>=0 else ((-v<<1)-1)
def ring(r):
    s=vint(zz(r[0]))+vint(zz(r[1]))
    for i in range(2,len(r),2): s+=vint(zz(r[i]-r[i-2]))+vint(zz(r[i+1]-r[i-1]))
    return s
def enc(cel):
    if cel is None: return ''
    lv=[]
    for f in cel['fills']:
        a=f.get('a',1.0)
        col='%02x%02x%02x'%tuple(f['c']) if a>=0.999 else '*%02x%02x%02x%02x'%(tuple(f['c'])+(int(round(a*255)),))
        lv.append(col+'~'.join(ring(r) for r in f['r']))
    out='%d,%d,%d,%d#'%tuple(cel['bbox'])+'!'.join(lv)
    if cel.get('lines'):
        ls=[]
        for s in cel['lines']:
            p=[int(round(v*2)) for v in s['p']]; w=[int(round(v*4)) for v in s['w']]
            q=vint(zz(p[0]))+vint(zz(p[1]))+vint(w[0])
            for i in range(1,len(w)): q+=vint(zz(p[2*i]-p[2*i-2]))+vint(zz(p[2*i+1]-p[2*i-1]))+vint(w[i])
            ls.append('%02x%02x%02x'%tuple(s['c'])+q)
        out+='#'+'!'.join(ls)
    return out
def main(celdir,out,holds=None):
    H=json.load(open(holds)) if holds else {}
    ents=[]
    tot=0
    for k in range(2101,2427):
        if str(k) in H: ents.append('%d:%d'%(k,H[str(k)])); continue
        p='%s/%05d.json'%(celdir,k)
        e=enc(json.load(open(p))); tot+=len(e)
        ents.append('%d:"%s"'%(k,e))
    hdr=('// s23 foreground cels, one per source frame (25 fps index k = round(t*25)): vector traces of everything that is\n'
         '// not the page, the strip or the banner (the owl, flames, rings, papers, scissors, streaks) -- posterised level\n'
         '// outlines (nested regions, one flat pre-grade colour each), measured on the source frames by the s23 tracer.\n'
         '// Outlines and colours only: no pixels. A number instead of a string = the same drawing as that frame.\n'
         '// Format (decoded by celdraw.js): "x0,y0,x1,y1#" + levels joined by "!"; level = RRGGBB + rings joined by "~";\n'
         '// (a level starting with "*" is *RRGGBBAA: a translucent level of light or shadow, 96.0-97.08)\n'
         '// ring = zigzag varints (base-64, 5 bits + continuation) of half-pixel x,y then deltas. An optional third "#"\n'
         '// section holds bright cut-line strokes joined by "!": RRGGBB + per point x,y (as rings) and width (quarter px).\n')
    open(out,'w').write(hdr+'export const CELS = {\n'+',\n'.join(ents)+'\n};\n')
    print('chars',tot,'file',os.path.getsize(out))
if __name__=='__main__': main(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else None)
