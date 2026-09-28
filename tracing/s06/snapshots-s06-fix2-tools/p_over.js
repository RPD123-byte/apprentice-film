// dump the `over` layer (nape, hair without the isle, beanie) and the smile face as PNGs with alpha
import { drawR3, decodeR3 } from '/src/shots/s06/face3.js';
import { L as HAIR } from '/src/shots/s06/data/r3_hair.js';
import { L as NAPE } from '/src/shots/s06/data/r3_nape.js';
import { L as BEANIE } from '/src/shots/s06/data/r3_beanie.js';
import { L as HAND } from '/src/shots/s06/data/r3_hand.js';
import { L as PENCIL } from '/src/shots/s06/data/r3_pencil.js';
import { L as LAPTOP } from '/src/shots/s06/data/r3_laptop.js';
import { L as FACE_S } from '/src/shots/s06/data/r3_face_s.js';
import { L as FACE } from '/src/shots/s06/data/r3_face.js';
import { L as BROW_S } from '/src/shots/s06/data/r3_brow_s.js';
export default async function () {
  const mk = () => { const c = document.createElement('canvas'); c.width = 2206; c.height = 946; return [c, c.getContext('2d')]; };
  decodeR3(HAIR);
  const hw = { ...HAIR, clipRings: HAIR.clipRings.filter((_, i) => i !== 1) };
  const [o, g] = mk(); g.translate(0.5, 0.5);
  drawR3(g, NAPE); drawR3(g, hw); drawR3(g, BEANIE); drawR3(g, HAND); drawR3(g, PENCIL); drawR3(g, LAPTOP);
  const [f, h] = mk(); h.translate(0.5, 0.5); drawR3(h, FACE_S); drawR3(h, BROW_S);
  const [n, q] = mk(); q.translate(0.5, 0.5); drawR3(q, FACE);
  return { over: o.toDataURL(), faceS: f.toDataURL(), face: n.toDataURL(), rings: HAIR.clipRings.map(r => r.length) };
}
