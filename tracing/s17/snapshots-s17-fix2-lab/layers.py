import sys,cv2,numpy as np,base64
sys.path.insert(0,'.')
from lab import *
L=Lab()
t=float(sys.argv[1]); 
full=["mass","farHP","wing:0","tail","body","foot:0","foot:1","head","nearHP","wing:1","keyline"]
outs=[]
for drop in [None]+full:
    url=L.js('''([t,drop]) => { const P = window.S17.OWL.owlFrame(t); const base = P.order || []; 
      const q = { ...P, res: 3 };
      const ord = ["mass", ...base, "keyline"].filter((n) => n !== drop); q.order = ord.filter((n)=>n!=="mass"&&n!=="keyline");
      if (drop === "mass") { q.silTrace = null; q.massPoly = null; }
      const c = document.createElement("canvas"); const Ly = window.S17.owlS17Layer(q, c);
      const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; const g = o.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0,0,o.width,o.height); g.drawImage(c,0,0);
      return [o.toDataURL(), Ly.x, Ly.y]; }''',[t,drop])
    b=base64.b64decode(url[0].split(',',1)[1]); f=cv2.imdecode(np.frombuffer(b,np.uint8),1)
    cv2.putText(f,str(drop),(5,25),cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,0,255),2)
    outs.append(f); print(drop, url[1], url[2], f.shape)
h=max(o.shape[0] for o in outs); w=max(o.shape[1] for o in outs)
outs=[cv2.copyMakeBorder(o,0,h-o.shape[0],0,w-o.shape[1],cv2.BORDER_CONSTANT) for o in outs]
rows=[np.hstack(outs[i:i+4]+[np.zeros_like(outs[0])]*(4-len(outs[i:i+4]))) for i in range(0,len(outs),4)]
im=np.vstack(rows); cv2.imwrite(sys.argv[2],cv2.resize(im,None,fx=0.35,fy=0.35,interpolation=cv2.INTER_AREA))
L.close()
