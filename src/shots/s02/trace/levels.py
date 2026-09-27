# Shared by the s02 tracers: vectorize a stack of nested level masks (each level inside the previous) into shapes with
# holes, each shape given the mean paint value of its own band (its level minus the next). Levels are split into square
# tiles first (TILE px at the mask's resolution, overlapping by `ov` px right/down so each piece fully covers its
# neighbour's anti-aliased edge and the ground cannot bleed through the seam), so a shape's value is local: one big connected level spanning hair, skin and laptop would
# otherwise get one averaged value.
import cv2, numpy as np

def vectorize(P2, m, band, off=(0, 0), minarea=6, eps=0.8, tile=96, holemin=4, ov=4):
    res = []
    Hh, Ww = m.shape
    for ty in range(0, Hh, tile):
        for tx in range(0, Ww, tile):
            y0, x0 = ty, tx; y1, x1 = min(Hh, ty + tile + ov), min(Ww, tx + tile + ov)
            sub = np.ascontiguousarray(m[y0:y1, x0:x1])
            if not sub.any(): continue
            cs, hier = cv2.findContours(sub, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
            if hier is None: continue
            hier = hier[0]
            for i, c in enumerate(cs):
                if hier[i][3] != -1 or cv2.contourArea(c) < minarea: continue
                rings = [cv2.approxPolyDP(c, eps, True)[:, 0, :]]
                j = hier[i][2]
                while j != -1:
                    if cv2.contourArea(cs[j]) >= holemin: rings.append(cv2.approxPolyDP(cs[j], eps, True)[:, 0, :])
                    j = hier[j][0]
                if len(rings[0]) < 3: continue
                x, y, w, h = cv2.boundingRect(c)
                fill = np.zeros((h, w), np.uint8); cv2.drawContours(fill, [c - [x, y]], -1, 1, -1)
                inside = (fill > 0) & (sub[y:y + h, x:x + w] > 0)
                bsel = inside & (band[y0 + y:y0 + y + h, x0 + x:x0 + x + w] > 0)
                pix = P2[y0 + y:y0 + y + h, x0 + x:x0 + x + w][bsel if bsel.sum() > 2 else inside]
                if pix.size == 0: continue
                res.append({'v': round(float(np.mean(pix)), 3), 'r': [(q + [x0, y0] + np.array(off)).tolist() for q in rings if len(q) >= 3],
                            'bb': [x0 + x, y0 + y, x0 + x + w, y0 + y + h]})
    return res

def stack(P2, masks, **kw):
    out = []
    for k, m in enumerate(masks):
        band = m & (1 - masks[k + 1]) if k + 1 < len(masks) else m
        out.append(vectorize(P2, m, band, **kw))
    return out
