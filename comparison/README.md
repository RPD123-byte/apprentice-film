# comparison — the stacked comparison video

A separate HyperFrames project (`index.html`, 1920×1656, 25 fps, 140.8 s) that stacks two videos: the code render on
top ("Opus 5.5 Recreation") and the original film underneath ("Original Seedance"), each with a label that starts
large and glides into its corner, and the recreation's synthesized soundtrack.

It reads two files from `media/`, which is git-ignored and made by `scripts/link-media.sh` (relative symlinks):

- `media/recreation.mp4` → `../../renders/film.mp4` (the output of `npm run render`; `RECREATION=…` picks another render)
- `media/original.mp4` → your copy of the original film, given as `APPRENTICE_SOURCE` (not part of this repository)

From the repository root:

```sh
APPRENTICE_SOURCE=/path/to/original.mp4 npm run compare
# -> comparison/renders/opus-5.5-vs-original-seedance.mp4
```

`npm run compare` renders the film first if `renders/film.mp4` is missing, links `media/`, then runs this project's
`npm run render`. `npm run check` here lints it (the media links must exist).

The label font, `assets/fonts/Archivo-Var.woff2`, is the same file as `../assets/fonts/Archivo-Var.woff2` (OFL-1.1); see
[`../assets/fonts/LICENSES.md`](../assets/fonts/LICENSES.md).
