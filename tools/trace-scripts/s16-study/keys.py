# Frame-measured owl keyframes -> owl-unit JS for src/shots/s16/owl.js (printed to stdout).
import math, json
def U(root, s, rot, p):
    c, sn = math.cos(-rot), math.sin(-rot)
    dx, dy = (p[0]-root[0])/s, (p[1]-root[1])/s
    return [round(dx*c-dy*sn), round(dx*sn+dy*c)]
def ang(d):  # toe direction (frame) -> canvas rotation of (0,1)
    return math.atan2(-d[0], d[1])
K = []
def key(t, name, root, s, rot, head=None, eyes=None, L=None, R=None, feet=(), extra="{}", back="R", draw=None, fmode="dangle"):
    K.append(dict(t=t, name=name, root=root, s=s, rot=rot, head=head, eyes=eyes, L=L, R=R, feet=feet, extra=extra, back=back, draw=draw, fmode=fmode))

# ---- impact and recoil (front-facing, eyes shut)
key(45.72, "IMPACT", (1212, 392), 1.0, 0.08, head=(1222, 252), eyes=((1175, 259), (1272, 267)),
    L=dict(S=(1150, 332), W=(1090, 286), tips=[(1045, 202), (1020, 245), (1023, 288), (1038, 332), (1067, 360)]),
    R=dict(S=(1282, 330), W=(1345, 296), tips=[(1428, 245), (1464, 281), (1456, 324), (1428, 353), (1384, 368)]),
    feet=[((1165, 452), (-0.4, -1), 32), ((1280, 478), (0.5, 1), 30)],
    extra='{ eyes: { state: "closed" }, beak: { open: 0.9 } }', back="LR")
key(45.76, "RECOIL1", (1152, 405), 1.0, 0.0, head=(1162, 268), eyes=((1116, 280), (1207, 280)),
    L=dict(S=(1070, 340), W=(985, 292), tips=[(865, 238), (869, 281), (894, 339), (937, 382), (988, 404)]),
    R=dict(S=(1242, 332), W=(1330, 282), tips=[(1428, 238), (1442, 281), (1420, 339), (1370, 375), (1310, 392)]),
    feet=[((1117, 482), (0, 1), 32), ((1235, 492), (0.2, 1), 30)],
    extra='{ eyes: { state: "closed" }, beak: { open: 0.3 } }', back="LR")
key(45.80, "RECOIL2", (1098, 442), 0.95, -0.05, head=(1102, 302), eyes=((1064, 315), (1140, 311)),
    L=dict(S=(1010, 380), W=(905, 300), tips=[(798, 259), (806, 302), (820, 348), (842, 392), (872, 424), (920, 440)]),
    R=dict(S=(1180, 372), W=(1262, 300), tips=[(1355, 243), (1372, 282), (1366, 322), (1338, 352), (1296, 372)]),
    feet=[((1072, 508), (-0.1, 1), 32), ((1182, 496), (0.8, 0.6), 30)],
    extra='{ eyes: { state: "closed" }, beak: { open: 0.15 } }', back="LR")
key(45.88, "SQUINT", (1030, 432), 0.95, -0.05, head=(1025, 298), eyes=((981, 311), (1068, 307)),
    L=dict(S=(940, 380), W=(835, 312), tips=[(715, 295), (724, 340), (745, 390), (780, 430), (830, 452)]),
    R=dict(S=(1112, 378), W=(1190, 300), tips=[(1275, 207), (1300, 245), (1304, 290), (1285, 330), (1250, 356)]),
    feet=[((1014, 504), (0, 1), 32), ((1118, 496), (0.8, 0.6), 30)],
    extra='{ eyes: { state: "half", look: [0, 0.2] } }', back="LR")
key(45.92, "OPEN", (1000, 428), 0.93, -0.18, head=(980, 287), eyes=((941, 304), (1022, 289)),
    L=dict(S=(905, 400), W=(800, 336), tips=[(663, 330), (668, 378), (694, 420), (736, 452), (790, 470)]),
    R=dict(S=(1080, 372), W=(1150, 290), tips=[(1250, 190), (1291, 207), (1300, 250), (1285, 300), (1250, 340)]),
    feet=[((983, 500), (0, 1), 32), ((1095, 482), (0.9, 0.4), 30)],
    extra='{ eyes: { state: "wide", look: [0.1, -0.1] } }', back="R", draw="glint")
# ---- flight (46.12 measured in detail; the other frames move the same drawing)
FLYW = dict(
    L=dict(S=(714, 444), W=(600, 413), tips=[(445, 362), (445, 419), (470, 475), (520, 519), (564, 550), (626, 556), (689, 531)]),
    R=dict(S=(860, 402), W=(866, 350), tips=[(886, 172), (932, 197), (961, 253), (970, 319), (945, 387), (914, 425)]))
key(46.12, "FLY", (801, 503), 0.9, -0.3, head=(760, 350), eyes=((727, 372), (802, 342)), L=FLYW["L"], R=FLYW["R"],
    feet=[((797, 588), (-0.05, 1), 38), ((915, 540), (0.9, 0.5), 36)], extra='{ eyes: { state: "wide", look: [0.1, -0.1] } }', back="R", draw="glint")
# ---- landing (46.32–46.44: front-facing on the desk corner, wings out)
key(46.32, "LAND1", (570, 772), 0.95, -0.28, head=(545, 612), eyes=((502, 636), (577, 603)),
    L=dict(S=(480, 720), W=(360, 700), tips=[(225, 631), (215, 690), (224, 745), (250, 790), (300, 815), (360, 830)]),
    R=dict(S=(620, 690), W=(640, 600), tips=[(666, 434), (705, 470), (722, 525), (715, 580), (690, 625)]),
    feet=[((612, 846), (0, 1), 34), ((718, 790), (0.2, -1), 32)], extra='{ eyes: { state: "wide", look: [0.1, -0.1] } }', back="R", draw="glint", fmode="perch")
key(46.36, "LAND2", (540, 792), 0.97, -0.22, head=(505, 660), eyes=((469, 687), (544, 659)),
    L=dict(S=(440, 760), W=(320, 740), tips=[(187, 690), (180, 740), (195, 790), (235, 830), (300, 850), (370, 860)]),
    R=dict(S=(590, 720), W=(600, 640), tips=[(619, 481), (655, 505), (675, 555), (672, 610), (650, 660)]),
    feet=[((612, 862), (0, 1), 34), ((698, 800), (0.4, -1), 32)], extra='{ eyes: { state: "wide", look: [0.05, -0.1] } }', back="R", draw="glint", fmode="perch")
key(46.40, "LAND3", (538, 790), 0.97, -0.22, head=(503, 652), eyes=((464, 678), (544, 650)),
    L=dict(S=(440, 765), W=(320, 760), tips=[(178, 753), (185, 800), (215, 840), (265, 868), (330, 880), (400, 880)]),
    R=dict(S=(600, 725), W=(630, 650), tips=[(703, 528), (722, 565), (730, 610), (715, 660), (690, 700)]),
    feet=[((612, 862), (0, 1), 34), ((698, 805), (0.4, -1), 32)], extra='{ eyes: { state: "wide", look: [0.05, -0.1] } }', back="R", draw="glint", fmode="perch")
key(46.44, "LAND4", (540, 800), 0.97, -0.25, head=(510, 660), eyes=((473, 686), (548, 653)),
    L=dict(S=(440, 780), W=(320, 790), tips=[(183, 789), (200, 830), (240, 865), (300, 885), (370, 890), (430, 885)]),
    R=dict(S=(610, 730), W=(660, 670), tips=[(745, 559), (752, 610), (745, 660), (720, 700), (690, 725)]),
    feet=[((614, 866), (0, 1), 34), ((698, 808), (0.4, -1), 32)], extra='{ eyes: { state: "wide", look: [0.05, -0.1] } }', back="R", draw="glint", fmode="perch")

out = []
for k in K:
    r, s, rot = k["root"], k["s"], k["rot"]
    u = lambda p: U(r, s, rot, p)
    parts = []
    if k["head"]:
        hx, hy = u(k["head"])
        roll = 0
        if k["eyes"]:
            (ax, ay), (bx, by) = k["eyes"]; roll = math.atan2(by - ay, bx - ax) - rot
        parts.append(f'head: {{ x: {hx}, y: {hy}, roll: {roll:.3f} }}')
    pose = "P(mergePose({ " + ", ".join(parts) + " }, " + k["extra"] + "))"
    def wing(w):
        return "{ S: %s, W: %s, tips: %s, fw: 0.38, cov: 0.42 }" % (json.dumps(u(w["S"])), json.dumps(u(w["W"])), json.dumps([u(p) for p in w["tips"]]))
    L = wing(k["L"]) if k["L"] else None
    R = wing(k["R"]) if k["R"] else None
    back = [w for w in ([L] if k["back"] == "LR" else []) + [R] if w]
    front = [L] if (L and k["back"] != "LR") else []
    feet = []
    for (a, d, size) in k["feet"]:
        ax, ay = u(a); th = ang(d) - rot
        feet.append(f'{{ x: {ax}, y: {ay}, rot: {th:.2f}, size: {size}, mode: "{k["fmode"]}", leg: 10, seed: {len(feet)*3+2} }}')
    out.append(f'const {k["name"]} = {{ pose: {pose}, back: [{", ".join(back)}], front: [{", ".join(front)}], feet: [{", ".join(feet)}], glint: {"true" if k["draw"]=="glint" else "false"} }};')
    out.append(f'// placement {k["name"]}: [{k["t"]}, {k["name"]}, {r[0]}, {r[1]}, {s}, {rot}]')
print("\n".join(out))
