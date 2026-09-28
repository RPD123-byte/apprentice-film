import json, sys, subprocess
from extract2 import run
DEF = {"T1": 125, "grey": 14, "gminA": 4, "gminL": 4, "gap2": 2}
STAND = [('pop', 2576), ('c308B', 2577), ('crouchB', 2585), ('r44B', 2586), ('r48B', 2587), ('r52B', 2588), ('r56B', 2589), ('h372B', 2593),
         ('hips1', 2615), ('t548', 2637), ('t552', 2638), ('t556', 2639), ('open1', 2641), ('open2', 2645), ('closed', 2665), ('t676', 2669),
         ('t684', 2671), ('t688', 2672), ('w692', 2673), ('w696', 2674), ('w700', 2675), ('raise', 2685), ('t852', 2713), ('hips2', 2735)]
CHAOS = [('dive', 2521), ('vs2', 2540), ('vs3', 2543), ('dash84', 2546), ('hov', 2553), ('hov2', 2562), ('eTR', 2528), ('eSt', 2522), ('eFl', 2530),
         ('b2566', 2566), ('b2567', 2567), ('b2568', 2568), ('b2569', 2569), ('b2570', 2570), ('b2571', 2571), ('b2572', 2572), ('b2573', 2573), ('b2574', 2574),
         ('rem48', 2512), ('rem52', 2513)]
OPT = {n: {'plate': 'chaos-p30.png'} for n, _ in CHAOS if not n.startswith('rem')}
if __name__ == '__main__':
    sel = sys.argv[1:] or [n for n, _ in STAND]
    if sel == ['chaos']: sel = [n for n, _ in CHAOS]
    for n, f in STAND + CHAOS:
        if n in sel: run(n, f, n, dict(DEF, **OPT.get(n, {})))
