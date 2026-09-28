# Font licences

The film sets its type in seven font families, loaded by the `@font-face` rules in `index.html` ("Fraunces Soft" there is a cut of Fraunces).
Nine of the ten files here are under the SIL Open Font License 1.1 (OFL) and are committed with the repo.
Their copyright notices and the full licence text are at the end of this file, as the OFL requires.
The tenth file, **Satoshi**, is not open source and is **not in this repository**. Run
`scripts/fetch-fonts.sh` once after cloning to download it from its publisher (see [Satoshi](#satoshi-not-redistributable) below).

The provenance was checked on 2026-09-27 against each font's own `name` table (copyright, licence and
licence-URL records, IDs 0, 13 and 14) and against the files the upstream sources publish.

| File | Family | Copyright holder | Licence | Source | In this repo? |
|---|---|---|---|---|---|
| `Archivo-Var.woff2` | Archivo, variable (wght 100–900, wdth 62–125), Latin subset | The Archivo Project Authors (Omnibus-Type) | OFL-1.1 | [Google Fonts](https://fonts.google.com/specimen/Archivo); upstream [Omnibus-Type/Archivo](https://github.com/Omnibus-Type/Archivo) | Yes |
| `Fraunces-Variable.ttf` | Fraunces, variable (opsz, wght, SOFT, WONK), full character set | The Fraunces Project Authors (Undercase Type) | OFL-1.1 | [google/fonts `ofl/fraunces`](https://github.com/google/fonts/tree/main/ofl/fraunces); upstream [undercasetype/Fraunces](https://github.com/undercasetype/Fraunces) | Yes |
| `FrauncesSoft-Black.ttf` | Fraunces, static instance at opsz 144, wght 900, SOFT 100, WONK 0 | The Fraunces Project Authors (Undercase Type) | OFL-1.1 (a Modified Version) | Made for this film from `Fraunces-Variable.ttf` ([how](#frauncessoft-blackttf)) | Yes |
| `Geist-Var.woff2` | Geist, variable (wght 100–900), Latin subset | The Geist Project Authors (Vercel, with basement.studio) | OFL-1.1 | [Google Fonts](https://fonts.google.com/specimen/Geist); upstream [vercel/geist-font](https://github.com/vercel/geist-font) | Yes |
| `GeistMono-Var.woff2` | Geist Mono, variable (wght 100–900), Latin subset | The Geist Project Authors (Vercel, with basement.studio) | OFL-1.1 | [Google Fonts](https://fonts.google.com/specimen/Geist+Mono); upstream [vercel/geist-font](https://github.com/vercel/geist-font) | Yes |
| `Poppins-500.woff2` | Poppins Medium, Latin subset | The Poppins Project Authors (Indian Type Foundry) | OFL-1.1 | [Google Fonts](https://fonts.google.com/specimen/Poppins); upstream [itfoundry/Poppins](https://github.com/itfoundry/Poppins) | Yes |
| `Poppins-600.woff2` | Poppins SemiBold, Latin subset | The Poppins Project Authors (Indian Type Foundry) | OFL-1.1 | as above | Yes |
| `Poppins-700.woff2` | Poppins Bold, Latin subset | The Poppins Project Authors (Indian Type Foundry) | OFL-1.1 | as above | Yes |
| `Shrikhand.woff2` | Shrikhand Regular, Latin subset | Jonny Pinhorn | OFL-1.1 | [Google Fonts](https://fonts.google.com/specimen/Shrikhand); upstream [jonpinhorn/shrikhand](https://github.com/jonpinhorn/shrikhand) | Yes |
| `Satoshi-Variable.woff2` | Satoshi Variable (wght 300–900) | Indian Type Foundry (designer Deni Anggara) | ITF Free Font License (FFL) 2.0, proprietary | [Fontshare](https://www.fontshare.com/fonts/satoshi) | **No.** Run `scripts/fetch-fonts.sh` |

None of the OFL families declares a Reserved Font Name, so the subsets and the Fraunces instance may keep
their original names. `comparison/assets/fonts/Archivo-Var.woff2` is the same file as `Archivo-Var.woff2` here
(identical SHA-256), and this notice covers it too.

Poppins and Satoshi both come from the Indian Type Foundry, but under different licences: ITF released
Poppins under the OFL, while Satoshi is under ITF's own Free Font License.

## Where each file came from

These are the SHA-256 checksums of the files the film was rendered with, and the exact upstream files they match.

| File | SHA-256 | Matches |
|---|---|---|
| `Archivo-Var.woff2` | `4c98b9d490d1698ec95f2ff17a6c7d0e72691864c0c5d7bc2a2c161b45afe5ad` | Byte-identical to the Latin subset Google Fonts serves for `Archivo:wdth,wght@62..125,100..900` (`fonts.gstatic.com/s/archivo/v25/k3kQo8UDI-1M0wlSfdnoLmvDIaI.woff2`) |
| `Fraunces-Variable.ttf` | `177ff6c0f14e5550a3c624247cd1189611d4eb65d000b14944c63d967958abbb` | Byte-identical to `ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf` in [google/fonts](https://github.com/google/fonts), version 1.000 |
| `FrauncesSoft-Black.ttf` | `5899644c86c4354f6c9eacbf5015feeaccab055ae7061932807eeb2f8e48c9f5` | Reproduced byte for byte by the command [below](#frauncessoft-blackttf) |
| `Geist-Var.woff2` | `19f9c92546aa300c312235e3125af1b81394d8db9a4bc4a425cd5b641d2d54e1` | Google Fonts Latin subset of Geist 1.800 (`Geist:wght@100..900`). Same version and glyphs as today's `fonts.gstatic.com/s/geist/v5/…` file, but not byte-identical (Google serves slightly different builds to different browsers). |
| `GeistMono-Var.woff2` | `684ad5b531f81d43c1e8c7038262d5db7cdc1f68006e04d6c7769efa8d33c8cc` | Google Fonts Latin subset of Geist Mono 1.701 (`Geist+Mono:wght@100..900`). Same version and glyphs as `fonts.gstatic.com/s/geistmono/v6/…`, not byte-identical. |
| `Poppins-500.woff2` | `289e0afc8be731a86822349e54557296f145926496bd2138db1bac0db77f77a2` | Byte-identical to Google Fonts `fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLGT9Z1xlFd2JQEk.woff2` (Latin, 500) |
| `Poppins-600.woff2` | `872e862918591a9e824dc03ed92f05729435ffbb8ebbb10eff7eda26592b1798` | Byte-identical to Google Fonts `fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLEj6Z1xlFd2JQEk.woff2` (Latin, 600) |
| `Poppins-700.woff2` | `197a3cbd7290c242c5c765268cdd69a9a39867fdc80cd13071f243a81c56fb76` | Byte-identical to Google Fonts `fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7Z1xlFd2JQEk.woff2` (Latin, 700) |
| `Shrikhand.woff2` | `78a6223af12c516cd893a95b1325e3cd6b67a3dcae1d816c72a7fe56b5caa84e` | Byte-identical to Google Fonts `fonts.gstatic.com/s/shrikhand/v17/a8IbNovtLWfR7T7bMJwrA4KR8TtctQ.woff2` (Latin) |
| `Satoshi-Variable.woff2` | `e739aff9b4d02c264341d6d4872edcda28e79373aeda936f659566a1cd3eb47f` | Byte-identical to `Satoshi_Complete/Fonts/WEB/fonts/Satoshi-Variable.woff2` in Fontshare's official download. `scripts/fetch-fonts.sh` checks this hash. |

Google Fonts' `fonts.gstatic.com` paths change when a family is updated. The CSS API query
(`https://fonts.googleapis.com/css2?family=…`) is the stable way to find the current file.

## FrauncesSoft-Black.ttf

The "Fraunces Soft" face in `index.html` is a static instance of the variable Fraunces: 144 pt optical size,
Black weight (900), the SOFT axis at its maximum (100, rounded terminals) and WONK off. It was cut with
fontTools' instancer. With fontTools 4.56.0 this reproduces the committed file exactly:

```sh
python3 -c '
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
f = TTFont("assets/fonts/Fraunces-Variable.ttf", recalcTimestamp=False)
f = instancer.instantiateVariableFont(f, {"opsz": 144, "wght": 900, "SOFT": 100, "WONK": 0})
f["head"].modified = 3873061950   # 2026-09-24 02:32:30 UTC, the timestamp in the committed file
f.save("FrauncesSoft-Black.ttf")'
shasum -a 256 FrauncesSoft-Black.ttf   # 5899644c86c4354f6c9eacbf5015feeaccab055ae7061932807eeb2f8e48c9f5
```

Without the two timestamp lines, only the `head` table's date and checksum differ; the outlines are the same.
As a Modified Version of Fraunces it stays under the OFL. Its `name` table still carries the Fraunces
copyright and OFL records.

## Satoshi (not redistributable)

Satoshi is © Indian Type Foundry. It is free to use but it is not open source: it is licensed under the
[ITF Free Font License](https://www.fontshare.com/terms), version 2.0 (17 Aug 2026). The full text is
`License/FFL.txt` in the Fontshare download. Under that licence:

- **Section 02** forbids distributing or otherwise making the font files available to anyone else. It names
  repositories and publicly accessible servers explicitly. It also says each third party must get their own
  copy from Fontshare.
- **Sections 02 and 05** forbid modified versions without ITF's written consent, and count subsetting and format
  conversion as modifications. So a subset or converted copy cannot be committed either.
- **Section 01** does allow using the font in video and embedding it in your own works. Rendering the film with
  it and publishing the resulting video is fine.

So `assets/fonts/Satoshi-Variable.woff2` is git-ignored. Each person who renders the film downloads it themselves:

```sh
scripts/fetch-fonts.sh
```

The script downloads `https://api.fontshare.com/v2/fonts/download/satoshi` (the zip behind the Download button on
[fontshare.com/fonts/satoshi](https://www.fontshare.com/fonts/satoshi)). It extracts
`Fonts/WEB/fonts/Satoshi-Variable.woff2`, checks that it is a WOFF2 file with the pinned SHA-256 above, and installs
it here. If a verified copy is already there, it does nothing. Run `scripts/fetch-fonts.sh --help` for its options:
`--dest`, `--force`, and `--allow-update` (which accepts a newer Satoshi build if Fontshare has replaced the pinned one).
The render needs the font: `src/main.js` loads it before the first frame, and the end card in shot `s40` (`src/shots/s40/card.js`) is set in it.

## SIL Open Font License 1.1

The copyright notices of the OFL fonts in this directory. The first line of each is from the family's `OFL.txt`
as distributed with the file. Any other line is a notice embedded in the font's own `name` table, where it differs.

```
Archivo (Archivo-Var.woff2)
Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)

Fraunces (Fraunces-Variable.ttf, FrauncesSoft-Black.ttf)
Copyright 2018 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces)
Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces)

Geist (Geist-Var.woff2)
Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)
Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font)

Geist Mono (GeistMono-Var.woff2)
Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)

Poppins (Poppins-500.woff2, Poppins-600.woff2, Poppins-700.woff2)
Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins)

Shrikhand (Shrikhand.woff2)
Copyright (c) 2015 Jonny Pinhorn (jonpinhorn.typedesign@gmail.com)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```
