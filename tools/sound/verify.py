#!/usr/bin/env python3
"""Compare the rendered score against the source track (ANALYSIS ONLY -- nothing is copied into the score).

  python3 tools/sound/verify.py [score.wav] [outdir]
    -> outdir/env_*.png (loudness envelopes, source vs score, 20 s per row)
       outdir/spec_<section>.png (spectrograms, source above / score below)
       outdir/report.txt (per-0.5 s level error, per-section error, onset timing match)
Defaults: audio/score.wav, snapshots/audio-work/verify. The source audio is read from snapshots/audio-work/src.wav,
which is extracted from $APPRENTICE_SOURCE on first use (ffmpeg -i <film.mp4> -vn -acodec pcm_f32le -ar 48000 ...)."""
import os, sys
import numpy as np, soundfile as sf, scipy.signal as ss
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import cues

args = [a for a in sys.argv[1:] if not a.startswith("--")]
SCORE = args[0] if args else os.path.join(ROOT, "audio", "score.wav")
OUT = args[1] if len(args) > 1 else os.path.join(ROOT, "snapshots", "audio-work", "verify")
from srcaudio import source_wav
SRC = source_wav(ROOT)  # snapshots/audio-work/src.wav, extracted from $APPRENTICE_SOURCE if missing
os.makedirs(OUT, exist_ok=True)
QUICK = "--quick" in sys.argv

a, sr = sf.read(SRC, always_2d=True)
b, sr2 = sf.read(SCORE, always_2d=True)
assert sr == sr2 == 48000
n = min(len(a), len(b))
a, b = a[:n].mean(1), b[:n].mean(1)
print(f"source {len(a) / sr:.3f} s, score {n / sr:.3f} s")


def env(x, win):
    w = int(win * sr)
    m = len(x) // w
    return 10 * np.log10((x[:m * w].reshape(m, w) ** 2).mean(1) + 1e-12)


ea, eb = env(a, 0.05), env(b, 0.05)
ha, hb = env(a, 0.5), env(b, 0.5)
active = ha > -60                                     # ignore the silent tail
d = hb - ha
lines = []
lines.append(f"0.5 s windows: {active.sum()}  |err| mean {np.abs(d[active]).mean():.2f} dB, median {np.median(np.abs(d[active])):.2f} dB")
for th in (2, 3, 4, 6):
    lines.append(f"  within {th} dB: {100 * np.mean(np.abs(d[active]) <= th):.1f} %")
lines.append(f"  overall loudness: source {10 * np.log10(np.mean(a ** 2)):.2f} dBFS rms, score {10 * np.log10(np.mean(b ** 2)):.2f} dBFS rms")
lines.append("")
lines.append("per section (mean of 0.5 s errors, score - source, dB; |err| mean; worst window):")
for sid, t0, t1, title, _ in cues.SECTIONS:
    i0, i1 = int(t0 / 0.5), int(np.ceil(t1 / 0.5))
    dd = d[i0:i1][active[i0:i1]]
    if len(dd) == 0:
        continue
    k = np.argmax(np.abs(d[i0:i1]))
    lines.append(f"  {sid} {t0:6.2f}-{t1:6.2f}  bias {dd.mean():+5.1f}  |err| {np.abs(dd).mean():4.1f}  worst {d[i0 + k]:+5.1f} @ {(i0 + k) * 0.5:.1f}s")
lines.append("")
lines.append("worst 0.5 s windows:")
order = np.argsort(-np.abs(np.where(active, d, 0)))[:25]
for k in sorted(order):
    lines.append(f"  {k * 0.5:6.1f}s  source {ha[k]:6.1f}  score {hb[k]:6.1f}  err {d[k]:+5.1f}")

# onset timing: strong source onsets vs score onsets
import librosa
def onsets(x):
    o = librosa.onset.onset_strength(y=x.astype(np.float32), sr=sr, hop_length=256)
    fr = librosa.onset.onset_detect(onset_envelope=o, sr=sr, hop_length=256, delta=0.08, backtrack=False)
    return fr * 256 / sr, o[fr]
oa, sa = onsets(a)
ob, sb = onsets(b)
strong = oa[sa > np.percentile(sa, 40)]
dt = np.array([np.min(np.abs(ob - t)) for t in strong])
lines.append("")
lines.append(f"onsets: source {len(oa)} (strong {len(strong)}), score {len(ob)}")
for th in (0.02, 0.04, 0.08):
    lines.append(f"  strong source onsets with a score onset within {int(th * 1000)} ms: {100 * np.mean(dt <= th):.1f} %")
miss = strong[dt > 0.04]
lines.append("  unmatched strong source onsets (>40 ms): " + " ".join(f"{t:.2f}" for t in miss[:80]))
extra = np.array([t for t in ob if np.min(np.abs(oa - t)) > 0.06])
lines.append(f"  score onsets with no source onset within 60 ms: {len(extra)}: " + " ".join(f"{t:.2f}" for t in extra[:60]))
rep = "\n".join(lines)
open(os.path.join(OUT, "report.txt"), "w").write(rep + "\n")
print(rep)

# envelope plots, 20 s per row
te = np.arange(len(ea)) * 0.05
fig, axs = plt.subplots(8, 1, figsize=(22, 26))
for r in range(8):
    ax = axs[r]
    t0, t1 = r * 17.6, (r + 1) * 17.6
    k = (te >= t0) & (te < t1)
    ax.plot(te[k], ea[k], color="#555", lw=0.8, label="source")
    ax.plot(te[k], eb[k], color="#d33", lw=0.8, alpha=0.85, label="score")
    th = np.arange(len(ha)) * 0.5 + 0.25
    kk = (th >= t0) & (th < t1)
    ax.step(th[kk], ha[kk], where="mid", color="#000", lw=1.4)
    ax.step(th[kk], hb[kk], where="mid", color="#f60", lw=1.4)
    for sid, s0, s1, *_ in cues.SECTIONS:
        if t0 <= s0 < t1:
            ax.axvline(s0, color="#39f", lw=0.6)
            ax.text(s0 + 0.05, -8, sid, fontsize=8, color="#39f")
    ax.set_xlim(t0, t1)
    ax.set_ylim(-70, 0)
    ax.set_xticks(np.arange(np.ceil(t0), t1, 1.0))
    ax.grid(alpha=0.25)
    if r == 0:
        ax.legend(loc="lower right")
fig.tight_layout()
fig.savefig(os.path.join(OUT, "env.png"), dpi=60)
plt.close(fig)

if not QUICK:
    # whole-film overview: source spectrogram / score spectrogram / envelopes
    fig, axs = plt.subplots(3, 1, figsize=(26, 13), sharex=True, gridspec_kw={"height_ratios": [2, 2, 1]})
    for ax, x, lab in ((axs[0], a, "source"), (axs[1], b, "score (synthesized)")):
        f, t, S = ss.stft(x[::2], sr // 2, nperseg=4096, noverlap=4096 - 1024)
        k = (f > 25) & (f < 12000)
        ax.pcolormesh(t, f[k], 20 * np.log10(np.abs(S[k]) + 1e-9), vmin=-115, vmax=-25, shading="auto", cmap="magma")
        ax.set_yscale("log"); ax.set_title(lab)
    axs[2].plot(np.arange(len(ha)) * 0.5 + 0.25, ha, color="#000", lw=1.2, label="source (0.5 s rms)")
    axs[2].plot(np.arange(len(hb)) * 0.5 + 0.25, hb, color="#e50", lw=1.2, label="score")
    for sid, s0, *_ in cues.SECTIONS:
        axs[2].axvline(s0, color="#39f", lw=0.5)
        axs[2].text(s0 + 0.2, -12, sid, fontsize=7, color="#39f")
    axs[2].set_ylim(-65, -5); axs[2].legend(loc="lower left"); axs[2].grid(alpha=0.3)
    axs[2].set_xticks(np.arange(0, 141, 5))
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "overview.png"), dpi=60); plt.close(fig)

    def spec(x, t0, t1):
        y = x[int(t0 * sr):int(t1 * sr)]
        f, t, S = ss.stft(y, sr, nperseg=2048, noverlap=2048 - 256)
        return f, t + t0, 20 * np.log10(np.abs(S) + 1e-9)
    for sid, t0, t1, title, _ in cues.SECTIONS:
        t0p, t1p = max(0, t0 - 0.3), min(n / sr, t1 + 0.3)
        fig, axs = plt.subplots(2, 1, figsize=(18, 9), sharex=True)
        for ax, x, lab in ((axs[0], a, "source"), (axs[1], b, "score")):
            f, t, S = spec(x, t0p, t1p)
            k = (f > 25) & (f < 18000)
            ax.pcolormesh(t, f[k], S[k], vmin=-110, vmax=-20, shading="auto", cmap="magma")
            ax.set_yscale("log")
            ax.set_title(f"{lab}: {sid} {title}", fontsize=10)
        axs[1].set_xticks(np.arange(np.ceil(t0p * 2) / 2, t1p, 0.5 if t1p - t0p < 12 else 1.0))
        axs[1].tick_params(axis="x", labelsize=7)
        fig.tight_layout()
        fig.savefig(os.path.join(OUT, f"spec_{sid}.png"), dpi=70)
        plt.close(fig)
