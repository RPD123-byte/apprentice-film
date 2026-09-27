#!/usr/bin/env python3
"""Analyse an audio file (the source track, or our score) -- ANALYSIS ONLY, nothing here is ever mixed into the score.

Usage:
  tools/sound/analyze.py env   in.wav out.npz                 # 50 ms RMS envelope (dBFS) per channel + mid, and onset strength
  tools/sound/analyze.py spec  in.wav T0 T1 out.png [fmax]     # log-frequency spectrogram + envelope of a time range
  tools/sound/analyze.py onsets in.wav T0 T1 [delta]           # onset times (s) in a range
"""
import sys, numpy as np, soundfile as sf


def load(path, t0=None, t1=None):
    info = sf.info(path)
    sr = info.samplerate
    a = 0 if t0 is None else int(t0 * sr)
    b = info.frames if t1 is None else int(t1 * sr)
    y, sr = sf.read(path, start=a, stop=b, always_2d=True)
    return y, sr


def env_db(y, sr, win=0.05):
    n = int(win * sr)
    m = len(y) // n
    z = y[: m * n].reshape(m, n, -1)
    r = np.sqrt((z ** 2).mean(1) + 1e-12)
    return 20 * np.log10(r)


def spec(y, sr, nfft=4096, hop=512):
    import scipy.signal as ss
    x = y.mean(1)
    f, t, S = ss.stft(x, sr, nperseg=nfft, noverlap=nfft - hop, window="hann")
    return f, t, 20 * np.log10(np.abs(S) + 1e-9)


def main():
    cmd = sys.argv[1]
    if cmd == "env":
        y, sr = load(sys.argv[2])
        e = env_db(y, sr)
        mid = env_db(y.mean(1, keepdims=True), sr)[:, 0]
        np.savez(sys.argv[3], L=e[:, 0], R=e[:, 1], M=mid)
        print(len(mid), "frames")
    elif cmd == "spec":
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        path, t0, t1, out = sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
        fmax = float(sys.argv[6]) if len(sys.argv) > 6 else 16000
        y, sr = load(path, t0, t1)
        nfft = int(sys.argv[7]) if len(sys.argv) > 7 else (4096 if t1 - t0 > 20 else 2048)
        f, t, S = spec(y, sr, nfft=nfft, hop=256 if t1 - t0 > 20 else 128)
        fig, ax = plt.subplots(2, 1, figsize=(18, 9), sharex=True, gridspec_kw={"height_ratios": [3, 1]})
        k = (f > 20) & (f < fmax)
        vmax = S[k].max()
        ax[0].pcolormesh(t + t0, f[k], S[k], vmin=vmax - 90, vmax=vmax, shading="auto", cmap="magma")
        ax[0].set_yscale("log")
        ax[0].set_ylabel("Hz")
        e = env_db(y, sr, 0.02)
        te = t0 + np.arange(len(e)) * 0.02
        ax[1].plot(te, e[:, 0], lw=0.7, label="L")
        ax[1].plot(te, e[:, 1], lw=0.7, label="R")
        ax[1].set_ylim(-70, 0)
        try:
            import librosa
            x = y.mean(1).astype(np.float32)
            oe = librosa.onset.onset_strength(y=x, sr=sr, hop_length=256)
            to = t0 + np.arange(len(oe)) * 256 / sr
            ax[1].plot(to, -70 + 30 * oe / (oe.max() + 1e-9), lw=0.6, color="k", alpha=0.6)
        except Exception:
            pass
        ax[1].grid(alpha=0.3)
        ax[1].set_xticks(np.arange(np.ceil(t0 * 2) / 2, t1, 0.5 if t1 - t0 < 12 else 1.0))
        ax[1].tick_params(axis="x", labelsize=7)
        ax[0].set_title(f"{path}  {t0:.2f}-{t1:.2f}s")
        fig.tight_layout()
        fig.savefig(out, dpi=90)
    elif cmd == "onsets":
        import librosa
        path, t0, t1 = sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
        delta = float(sys.argv[5]) if len(sys.argv) > 5 else 0.07
        y, sr = load(path, t0, t1)
        x = y.mean(1).astype(np.float32)
        o = librosa.onset.onset_detect(y=x, sr=sr, hop_length=256, units="time", delta=delta, backtrack=False)
        env = librosa.onset.onset_strength(y=x, sr=sr, hop_length=256)
        fr = librosa.time_to_frames(o, sr=sr, hop_length=256)
        for tt, ff in zip(o, fr):
            print(f"{t0 + tt:8.3f}  strength {env[min(ff, len(env) - 1)]:.2f}")


if __name__ == "__main__":
    main()
