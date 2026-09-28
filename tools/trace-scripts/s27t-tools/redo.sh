#!/bin/sh
# The exact data edits of the s27t pass, in order, starting from the archived traced keys (git: src/shots/s27/keys,
# dkeys as of the traced build). Measurement -> vector data only. Needs the decoded source frames (see README.txt).
cd /Users/computer/rootline/apprentice-film
T=tools/trace-scripts/s27t-tools; K=src/shots/s27/keys; D=src/shots/s27/dkeys

# designer keys: the cabinet-line spur in three outlines
python3 $T/fix_spurs.py

# room keys 121.2 / 121.6 / 122.0: the designer's traced remnants (beanie and arm edges) out, desk/wall refilled,
# the desk's back edge redrawn where the remnant had cut it
python3 $T/keysurg.py remove $K/k_121_2.js '[[-12,583],[70,605],[125,650],[162,681],[-12,733]]' --clip --src '[[-12,400],[400,400],[400,628],[-12,728]]'
python3 $T/keysurg.py remove $K/k_121_2.js '[[-12,735],[162,683],[176,760],[170,822],[122,872],[50,907],[-12,920]]' --clip --src '[[-12,738],[400,618],[500,618],[500,946],[-12,946]]' --line -8,733,167,680,3.2,#382828
python3 $T/keysurg.py remove $K/k_121_6.js '[[165,618],[212,618],[224,663],[165,680]]' --clip --src '[[80,480],[420,480],[420,626],[80,718]]'
python3 $T/keysurg.py remove $K/k_121_6.js '[[165,686],[224,668],[254,700],[260,796],[233,810],[200,762],[170,722]]' --clip --src '[[80,722],[420,634],[520,634],[520,946],[80,946]]' --line 150,690,258,656,3.2,#3b2b29
python3 $T/keysurg.py remove $K/k_122_0.js '[[322,634],[366,634],[394,690],[397,770],[372,778],[350,702],[322,662]]' --clip --src '[[240,636],[620,636],[620,946],[240,946]]'

# designer keys 127.88–128.68: the near sleeve the outline had cut off, traced from the source and appended
python3 $T/sleeve.py 127.88 $D/d_127_88.js '[[995,548],[1026,568],[1045,608],[1050,660],[1045,700],[1028,716],[995,724]]'
python3 $T/sleeve.py 128.2 $D/d_128_2.js '[[997,550],[1033,568],[1066,608],[1089,662],[1084,688],[1057,712],[1020,724],[997,726]]'
python3 $T/sleeve.py 128.44 $D/d_128_44.js '[[1030,552],[1070,568],[1100,595],[1122,625],[1128,658],[1125,680],[1112,696],[1084,713],[1050,727],[1010,733],[1010,560]]'
python3 $T/sleeve.py 128.68 $D/d_128_68.js '[[1062,543],[1112,565],[1142,595],[1160,627],[1166,660],[1163,690],[1149,703],[1110,716],[1067,733],[1030,742],[1030,560]]'

# designer keys 128.92 / 129.12: traced cabinet chunks moved to the room keys
python3 $T/keymove.py d2r $K/k_128_92.js $D/d_128_92.js '[[1118,536],[1232,536],[1232,574],[1165,574],[1140,556],[1122,545]]'
python3 $T/keymove.py d2r $K/k_129_12.js $D/d_129_12.js '[[1150,540],[1265,540],[1285,600],[1280,662],[1258,662],[1250,625],[1235,600],[1210,575],[1185,556],[1160,545]]'

# room keys 128.2–128.92: the traced copy of the sleeve (now carried by the designer keys) out
python3 $T/keysurg.py remove $K/k_128_2.js "$(python3 $T/zone_from_dkey.py $D/d_128_2.js 1000,560,1200,720 3)" --clip --src '[[1095,540],[1300,540],[1300,700],[1095,700]]'
python3 $T/keysurg.py remove $K/k_128_44.js "$(python3 $T/zone_from_dkey.py $D/d_128_44.js 1030,560,1200,730 3)" --clip --src '[[1135,540],[1320,540],[1320,715],[1135,715]]'
python3 $T/keysurg.py remove $K/k_128_68.js "$(python3 $T/zone_from_dkey.py $D/d_128_68.js 1050,560,1230,740 3)" --clip --src '[[1175,540],[1340,540],[1340,735],[1175,735]]'
python3 $T/keysurg.py remove $K/k_128_92.js "$(python3 $T/zone_from_dkey.py $D/d_128_92.js 1100,560,1260,760 3)" --clip --src '[[1225,540],[1360,540],[1360,750],[1225,750]]'

# per-view designer mesh corrections (needs the keys above) and the deck gain (needs a render without it: set
# DECK_GAIN to neutral, render 118.0–129.28 every 0.2 s with rt.sh, then run deckgain.py on that render)
python3 $T/desfix.py
# python3 $T/deckgain.py snapshots/s27t-g0 "$(python3 -c "print(','.join(str(round((118.0+0.2*i)*25)) for i in range(57))+',3232')")"
