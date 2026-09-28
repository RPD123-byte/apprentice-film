import json, sys
from extract3 import run
Z = json.load(open('../s25-meas/zones.json'))
HP = [[925, 380], [945, 300], [1000, 266], [1080, 260], [1160, 268], [1228, 318], [1268, 380], [1270, 522], [1180, 530], [1100, 548], [1000, 548], [925, 522]]
# the cap between the headband and the head: page, not owl (the head layer draws the head and headphones over it)
CAP = [[925, 380], [945, 300], [1000, 266], [1080, 260], [1160, 268], [1228, 318], [1268, 380], [1270, 470], [925, 470]]
STAND = [('c308B', 2577), ('crouchB', 2585), ('r44B', 2586), ('r48B', 2587), ('r52B', 2588), ('r56B', 2589), ('h372B', 2593),
         ('hips1', 2615), ('t548', 2637), ('t552', 2638), ('t556', 2639), ('open1', 2641), ('open2', 2645), ('closed', 2665), ('t676', 2669),
         ('t684', 2671), ('t688', 2672), ('w692', 2673), ('w696', 2674), ('w700', 2675), ('raise', 2685), ('t852', 2713), ('hips2', 2735)]
CHAOS = [('pop', 2576), ('dive', 2521), ('vs2', 2540), ('vs3', 2543), ('dash84', 2546), ('hov', 2553), ('hov2', 2562), ('eTR', 2528), ('eSt', 2522), ('eFl', 2530),
         ('rem48', 2512), ('rem52', 2513)]
DEF = dict(minA=400)
if __name__ == '__main__':
    sel = sys.argv[1:]
    for n, f in STAND:
        if not sel or n in sel or sel == ['stand']: run(n, f, n, dict(DEF, nolines=[HP], headspace=True))
    for n, f in CHAOS:
        if n in sel or sel == ['chaos']:
            o = dict(DEF, minA=250, minLen=12, leps=1.5)
            if not n.startswith('rem') and n != 'pop': o['plate'] = 'chaos-p30.png'
            run(n, f, n, o)
