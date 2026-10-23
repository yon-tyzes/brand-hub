# Third-party licenses

The engine code is MIT licensed (see `LICENSE`). The engine ships its interface fonts, and the demo brand in `brands/demo/` includes third-party files. Instances that copy the demo brand keep these licenses with the files.

## Interface fonts

| Files | Project | License | Notice |
|---|---|---|---|
| `src/theme/fonts/mona-sans/` | [Mona Sans](https://github.com/github/mona-sans) | SIL Open Font License 1.1 | `src/theme/fonts/mona-sans/OFL.txt` |
| `src/theme/fonts/martian-mono/` | [Martian Mono](https://github.com/evilmartians/mono) | SIL Open Font License 1.1 | `src/theme/fonts/martian-mono/OFL.txt` |

The interface font files are the Latin subsets published by Fontsource (`@fontsource-variable/mona-sans` 5.3.0, variable weight axis, and `@fontsource/martian-mono` 5.3.0, weight 400), unchanged.

## Demo brand

| Files | Project | License | Notice |
|---|---|---|---|
| `brands/demo/files/icons/*.svg` | [Bootstrap Icons](https://icons.getbootstrap.com/) 1.13.2 | MIT | Below |
| `brands/demo/files/fonts/inter/` | [Inter](https://github.com/rsms/inter) | SIL Open Font License 1.1 | `brands/demo/files/fonts/inter/OFL.txt` |
| `brands/demo/files/fonts/fraunces/` | [Fraunces](https://github.com/undercasetype/Fraunces) | SIL Open Font License 1.1 | `brands/demo/files/fonts/fraunces/OFL.txt` |

The icon SVGs are unchanged apart from removing the `class` attribute and adding `aria-hidden="true"`. The font files are the Latin subsets published by Fontsource.

The demo brand's name, logo, colors, rules, and changelog are fictional and part of this repository under its MIT license.

## Bootstrap Icons

```
The MIT License (MIT)

Copyright (c) 2019-2024 The Bootstrap Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
