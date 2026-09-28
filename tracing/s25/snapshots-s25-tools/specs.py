# pose specs for extract.py (frame px of the key frame)
POSES = {}
# the shared head (104.60): the main bright region above the neck, face ink inside it
POSES['head'] = dict(frame=2615, T=140, view=(860, 280, 1260, 600), parts=[
    dict(name='head', seeds=[(1060, 420)], close=9,
         clip=[(900, 300), (1250, 300), (1250, 525), (1190, 545), (1100, 565), (1020, 562), (960, 545), (900, 520)],
         ink=dict(T=150, grey=28, k=9, inset=3, minA=8, minLen=6, eps=0.5)),
])
# hips, scissors in the hands (104.60)
GREY = dict(T=140, grey=20, k=7, inset=3, minA=8, minLen=6, eps=0.6)
METAL = dict(T=160, grey=24, k=5, inset=1, minA=5, minLen=4, eps=0.5)
POSES['hips1'] = dict(frame=2615, T=140, view=(620, 300, 1480, 930), scis=[('h1L', 'body'), ('h1R', 'body')], parts=[
    dict(name='lwing', seeds=[(900, 600), (917, 705)], close=9, style='wing', ink=GREY),
    dict(name='rfeath', seeds=[(1265, 775), (1215, 800)], close=5, style='wing', ink=GREY),
    dict(name='body', seeds=[(1060, 680)], close=9, style='plume', ink=dict(GREY, inkclip=[(930, 555), (1330, 555), (1330, 840), (930, 840)])),
    dict(name='footL', seeds=[(1030, 860)], close=3, style='foot', ink=GREY),
    dict(name='footR', seeds=[(1200, 866)], close=3, style='foot', ink=GREY),
])
