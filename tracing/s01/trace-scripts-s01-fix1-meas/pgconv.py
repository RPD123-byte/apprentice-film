import cv2,numpy as np,sys
Q=np.float32([[855,62],[1288,62],[1278,281],[865,281]])
S=np.float32([[0,0],[1000,0],[1000,508],[0,508]])
Hinv=cv2.getPerspectiveTransform(Q,S)
def pg(x,y):
    p=Hinv@np.array([x,y,1.0]); return p[0]/p[2],p[1]/p[2]
H=np.linalg.inv(Hinv); H/=H[2,2]
if __name__=='__main__':
    print('H=',[[round(v,7) for v in r] for r in H.tolist()])
    groups={
    'L':{'logo':(863,70),'logo1':(886,82),'rule':(860,88),'Letters L top':(885,107),'Letters base':(1047,142),'cut x0 base':(889,195),'hand. x1':(1155,195),'body0':(893,225),'body x1':(1040,245),'btn0':(895,257),'btn1':(962,272),'a box':(1107,106),'a box1':(1178,186),'g box':(1185,106),'g box1':(1256,186),'R box':(1181,196),'R box1':(1250,270),'top tiles':(1107,88),'top tiles1':(1178,100),'a glyph0':(1130,120),'a glyph1':(1157,145),'g glyph0':(1200,122),'g glyph1':(1240,178),'R glyph0':(1190,205),'R glyph1':(1240,258)},
    'M':{'logo':(873,69),'logo1':(882,78),'head0':(892,104),'head1':(1253,126),'kb0':(940,148),'kb1':(1207,190),'btn0':(1018,214),'btn1':(1125,238),'small':(1052,262),'small1':(1090,262),'dots':(1160,76),'dot2':(1262,76)},
    'S':{'head0':(879,88),'head1':(1018,100),'head2 base':(1025,120),'ctr0':(1226,92),'ctr1':(1256,100),'key0':(1222,108),'key1':(1231,119),'face':(1070,146),'desk0':(1013,193),'desk1':(1147,193),'shoes':(1070,272),'rail':(872,72),'nav1':(1107,72),'nav4':(1236,72)},
    }
    for g,pts in groups.items():
        for k,(x,y) in pts.items():
            u,v=pg(x,y); print(f'{g} {k:14s} plate({x},{y}) -> ({u:6.1f},{v:6.1f})')
    off=165
    I={'edge top':(921,64),'edge bot':(930,278),'logo':(928,70),'logo1':(948,82),'rule':(930,88),'ISSUE14 0':(940,96),'ISSUE14 1':(1125,148),'QUIET0':(945,158),'QUIET1':(1150,210),'ISSUE0':(946,216),'ISSUE1':(1060,268),'under0':(945,273),'under1':(990,273),'divider top':(1160,90),'divider bot':(1150,280),'rc0':(1170,100),'rc1':(1250,160),'body0':(1170,170),'body1':(1245,275),'narrow':(1265,100)}
    for k,(x,y) in I.items():
        u,v=pg(x,y); print(f'I {k:14s} -> ({u-off:6.1f},{v:6.1f})')
