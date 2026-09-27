import json,numpy as np,cv2,sys
from segm import L
from hpoly import hp
R=json.load(open('rough.json'))
H1=[e['poly'] for e in R['hips1']['extras'] if e.get('mode')=='bright']
CRS=[e['poly'] for e in R['crouch']['extras'] if e.get('mode')=='bright']
CL=[e['poly'] for e in R['closed']['extras'] if e.get('mode')=='bright']
sh=lambda P,dx,dy,g=0: [[x+dx,y+dy] for x,y in P]
def grow(P,k):
    P=np.array(P,float); c=P.mean(0); return (c+(P-c)*k).round().tolist()
B=lambda p: {"mode":"bright","poly":p}
T={
 'r44':{'frame':2586,'body':['crouch','hips1'],'bodygrow':30,'hp':(1066,551,1.02),'sc':[grow(sh(p,0,-25),1.3) for p in CRS]},
 'r48':{'frame':2587,'body':['crouch','hips1'],'bodygrow':30,'hp':(1066,519,1.02),'sc':[grow(sh(p,0,50),1.35) for p in H1]},
 'r52':{'frame':2588,'body':['crouch','hips1'],'bodygrow':30,'hp':(1066,491,1.0),'sc':[grow(sh(p,0,35),1.3) for p in H1]},
 'r56':{'frame':2589,'body':['hips1'],'bodygrow':24,'hp':(1074,445,1.0),'sc':[grow(sh(p,0,5),1.1) for p in H1]},
 't552':{'frame':2638,'body':['hips1','bigsc'],'bodygrow':24,'hp':(1079,441,1.0),'sc':[grow(CL[0],1.1),H1[1]]},
 't556':{'frame':2639,'body':['bigsc'],'bodygrow':24,'hp':(1082,441,1.0),'sc':[grow(CL[0],1.1),CL[1]]},
 'open1':{'frame':2641,'body':['bigsc'],'bodygrow':20,'hp':(1083,441,1.0),'sc':[grow(CL[0],1.12),CL[1]]},
 'open2':{'frame':2645,'body':['bigsc'],'bodygrow':20,'hp':(1083,441,1.0),'sc':[grow(CL[0],1.15),CL[1]]},
 't676':{'frame':2669,'body':['bigsc'],'bodygrow':24,'hp':(1083,443,1.0),'sc':[grow(CL[0],1.15),CL[1]]},
 'c308':{'frame':2577,'body':['crouch'],'bodygrow':30,'hp':(1066,587,1.02),'sc':[[[450,770],[965,760],[965,905],[450,905]],[[1170,760],[1620,760],[1620,905],[1170,905]]],'bg':[2685]},
 'h372':{'frame':2593,'body':['hips1'],'bodygrow':20,'hp':(1075,441,1.0),'sc':[grow(p,1.2) for p in H1],'bg':[2685]},
 't548':{'frame':2637,'body':['hips1'],'bodygrow':24,'hp':(1076,441,1.0),'sc':[grow(p,1.25) for p in H1],'bg':[2685]},
 't684':{'frame':2671,'body':['bigsc'],'bodygrow':24,'hp':(1083,442,1.0),'sc':[grow(CL[0],1.15),CL[1]]},
 'w692':{'frame':2673,'body':['raise'],'bodygrow':40,'hp':(1064,424,1.04),'sc':[]},
 'w696':{'frame':2674,'body':['raise'],'bodygrow':40,'hp':(1062,421,1.04),'sc':[]},
 'w700':{'frame':2675,'body':['raise'],'bodygrow':40,'hp':(1060,420,1.04),'sc':[]},
 't852':{'frame':2713,'body':['hips2'],'bodygrow':30,'hp':(1058,435,1.0),'sc':[]},
 't688':{'frame':2672,'body':['bigsc','raise'],'bodygrow':30,'hp':(1074,434,1.02),'sc':[[[480,520],[560,470],[700,440],[820,430],[900,440],[930,520],[860,560],[700,560],[560,560],[480,560]],[[1250,470],[1330,460],[1420,470],[1530,500],[1540,560],[1440,600],[1330,610],[1260,590]]]},
}
if __name__=='__main__':
    for k,c in T.items():
        bgf=c.get('bg',[2615,2685])
        cfg={'frame':c['frame'],'body':c['body'],'bodygrow':c['bodygrow'],'extras':[{'poly':hp(*c['hp']),'ring':12,'sure':8}]+[dict(B(p),bg=bgf) for p in c['sc']],
             'teps':1.0,'levels':[0.08,0.16,0.26,0.36,0.47,0.58,0.68,0.76,0.83,0.88,0.915,0.945],'minspeck':20,'tblur':0.7}
        R[k]=cfg
    json.dump(R,open('rough.json','w'),indent=1)
    for k in T:
        c=R[k]; im=L(c['frame']).astype(np.uint8)
        for e in c['extras']: cv2.polylines(im,[np.array(e['poly'],np.int32)],True,(0,0,255) if e.get('mode')!='bright' else (255,0,255),2)
        cv2.imwrite(f'rough_{k}.jpg',cv2.resize(im[150:946,400:1650],None,fx=0.7,fy=0.7))
