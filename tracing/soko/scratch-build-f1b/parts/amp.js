// a big pale box of records leaning at the left, the white amp in front of it with a black lid and a headphone
// band looped over it, thick black cables across (measured at 3x, 50 s)
function ampGroup(g) {
  // records box: a narrow darker left face, a bright front
  face(g, [[368, 708], [390, 708], [390, 845], [370, 845]], [0.55, 0.6, 0.45, 0.4], "v", { per: 3.4, seed: 820 });
  brush(g, [[390, 708], [447, 708], [447, 845], [390, 845]], (v) => { v.fillStyle = lg(v, 390, 0, 447, 0, [[0, 0.95], [0.7, 0.9], [1, 0.7]]); v.fillRect(388, 706, 62, 142); }, PI / 2, { len: 24, w: 2, gap: 1.6, seed: 821, jit: 0.06, base: 0.8 });
  ink(g, [[368, 708], [447, 708], [447, 845], [370, 845]], 1.5, BLK, { closed: true, seed: 822 });
  ink(g, [[390, 708], [390, 845]], 1.2, grey(0.3, 0.8), { seed: 823 });
  // amp: black lid with a pale top plate and a label; pale front with a logo and a slot; a line; the grained lower body
  fillPoly(g, [[437, 718], [590, 718], [592, 738], [440, 738]], grey(0.05));
  stripes(g, [[480, 709], [563, 709], [566, 720], [478, 721]], { dir: "h", per: 2.6, cov: 0.7, lum: 0.9, seed: 824 });
  fillPoly(g, [[500, 727], [517, 727], [517, 736], [500, 736]], grey(0.7));
  face(g, [[440, 738], [467, 738], [467, 847], [443, 847]], [0.6, 0.72, 0.6, 0.45], "v", { per: 3, seed: 825 });
  brush(g, [[467, 738], [590, 738], [590, 847], [467, 847]], (v) => { v.fillStyle = lg(v, 467, 738, 590, 847, [[0, 0.97], [0.6, 0.9], [1, 0.72]]); v.fillRect(465, 736, 128, 114); }, PI / 2, { len: 20, w: 2, gap: 1.5, seed: 826, jit: 0.08, base: 0.82 });
  ink(g, [[440, 738], [590, 738], [590, 847], [443, 847]], 1.5, BLK, { closed: true, seed: 827 });
  ink(g, [[467, 738], [467, 847]], 1.1, grey(0.35, 0.8), { seed: 828 });
  ink(g, [[443, 777], [590, 776]], 1.2, grey(0.3, 0.8), { seed: 829 });
  ink(g, [[474, 767], [480, 756], [486, 767]], 1.5, grey(0.2, 0.9), { seed: 830 }); ink(g, [[476, 763], [484, 763]], 1.1, grey(0.2, 0.9), { seed: 831 });
  fillPoly(g, [[560, 756], [583, 755], [583, 760], [560, 761]], grey(0.15));
  // the headphone band looped over the amp: a padded lit arc and a dark cup
  cable(g, [[532, 712], [538, 684], [556, 668], [584, 666], [606, 676], [616, 700], [620, 740], [612, 790], [602, 812]], 7, 832, 0.85);
  soft(g, E(540, 690, 9, 14, 0.3), grey(0.08)); ring(g, 540, 690, 8, 1.4, grey(0.5));
  // thick black cables across the boxes
  cable(g, [[372, 840], [410, 806], [456, 752], [490, 712], [512, 688]], 5.5, 834, 0.6);
  cable(g, [[470, 852], [520, 838], [570, 826], [620, 820], [690, 812]], 4.5, 836, 0.5);
}
