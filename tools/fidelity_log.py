#!/usr/bin/env python3
"""Assemble FIDELITY.md from the per-shot logs in fidelity/<id>.md (first table row + known gaps).

Usage: python3 tools/fidelity_log.py            -> rewrites FIDELITY.md
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLAN = re.findall(r'\["(s\d+)",\s*([\d.]+),\s*([\d.]+),\s*"([^"]*)"\]', (ROOT / "src/shots/index.js").read_text())

HEAD = """# Fidelity log

Everything on screen is drawn by code. The original film is used only as a reference for measurements and side-by-side
comparison; none of its frames or footage appear in the render. The soundtrack is synthesized in code (see docs/audio.md).

Per-shot status: **close** = composition, timing, motion and look match closely · **approx** = same shot and staging,
drawing visibly simplified · **simplified** = reduced staging or detail · **cut** = not built.

Per-shot detail (measurements, what was tried, every known gap) lives in `fidelity/<id>.md`.

Method (from each shot's own log and what its code imports): **drawn** = authored drawing code, the source used only
for measurements (positions, timing, values) · **traced** = the imagery is largely built from geometry traced off source
frames (vector traces, rotoscoped keys, contour fits), then redrawn in code · **mixed** = authored drawing combined with
traced geometry for some layers.

| # | Time (s) | Shot | Status | Method | Notes |
|---|---|---|---|---|---|
"""

METHOD = {
    "s02": "drawn", "s05": "drawn", "s13": "drawn", "s19": "drawn", "s20": "drawn", "s21": "drawn", "s23": "drawn",
    "s25": "drawn", "s27": "drawn", "s28": "drawn",
    "s04": "traced", "s06": "traced", "s07": "traced", "s08": "traced", "s12": "traced", "s16": "traced", "s18": "traced",
    "s22": "traced",
    "s01": "mixed", "s09": "mixed", "s14": "mixed", "s15": "mixed", "s17": "mixed", "s24": "mixed", "s26": "mixed",
    "s40": "mixed",
}


def row_for(sid, a, b, title):
    p = ROOT / "fidelity" / f"{sid}.md"
    if not p.exists():
        return f"| {sid} | {float(a):.2f}–{float(b):.2f} | {title} | cut | – | no fidelity log |", 'cut'
    txt = p.read_text()
    for line in txt.splitlines():
        if line.startswith("|") and re.match(rf"\|\s*{sid}\s*\|", line):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            status = next((c for c in cells[3:4] + cells
                           if re.match(r"(close|approx|simplified|cut)\b", c.lower())), "?")
            notes = cells[-1] if len(cells) >= 5 else ""
            notes = re.sub(r"\s+", " ", notes)
            key = (re.match(r"[a-z]+", status.lower()) or [status])[0]
            return f"| {sid} | {float(a):.2f}–{float(b):.2f} | {title} | {status} | {METHOD.get(sid, '?')} | {notes} |", key
    return f"| {sid} | {float(a):.2f}–{float(b):.2f} | {title} | ? | {METHOD.get(sid, '?')} | (no table row in fidelity/{sid}.md) |", '?'


rows, tally = [], {}
for sid, a, b, title in PLAN:
    r, st = row_for(sid, a, b, title)
    rows.append(r)
    tally[st] = tally.get(st, 0) + 1
    tally.setdefault('_sec_' + st, 0)
    tally['_sec_' + st] += float(b) - float(a)

summary = ", ".join(f"{k}: {v} shots / {tally['_sec_' + k]:.1f} s" for k, v in tally.items() if not k.startswith('_'))
(ROOT / "FIDELITY.md").write_text(HEAD + "\n".join(rows) + f"\n\n**Totals** — {summary}.\n")
print(summary)
