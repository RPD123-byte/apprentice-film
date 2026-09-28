# quick variant test of one layer config: t_layer.py NAME '{"kw overrides"}'  (python model only)
import sys, json, time; sys.argv=[sys.argv[0]]+sys.argv[1:]
name=sys.argv[1]; over=json.loads(sys.argv[2]) if len(sys.argv)>2 else {}
sys.argv=['x']; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s06/trace3')
import layers_r3 as LR, numpy as np, cv2
from region import build, report
M=LR.base_masks(); cfg=LR.layer_cfg(name,M)
opts=dict(LR.DEFAULT_OPTS); 
if 'soft' in cfg: opts['soft']=cfg['soft']
if 'soft' in over: opts['soft']=over.pop('soft')
kw=dict(LR.KW); kw['ink_opts']=opts
for k in ('solids','ground_mode','ground_r','light_mask','light_passes','passes','stroke_mask','solid_dark'):
    if k in cfg: kw[k]=cfg[k]
kw.update(over)
t=time.time(); res=build(LR.pre,cfg['region'],LR.bbox(cfg['region']),exclude=cfg['exclude'],log=lambda s:None,**kw)
r=report(name,res,log=lambda s:None); print(json.dumps(over), opts['soft'], 's0 %.2f s1.5 %.2f s5 %.2f'%(r[0],r[1.5],r[5]), '%.0fs'%(time.time()-t))
np.save('/Users/computer/rootline/apprentice-film/snapshots/s06-r3-t3/%s-variant.npy'%name, res['layer'])
