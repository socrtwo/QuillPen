# Clean-room, trademark and licensing notes

This file records how Anne's Pen provides a complete word-processing command set while avoiding other vendors' trademarks and copyrights. It is a summary of the project's practice, not legal advice.

## What is reproduced, and why it is safe

- **Functionality and command names.** Word-processing operations (Bold, Insert Table, Track Changes, Mail Merge, and so on) are functional ideas. Their names are ordinary descriptive words used across the industry. Functionality is not protected by copyright, and descriptive terms are not trademarks for those functions.
- **Tab and group organization.** Grouping commands under tabs such as Home, Insert and Layout is a common, functional arrangement used by many suites. Anne's Pen's grouping, ordering, labels and descriptions were written for this project.
- **File formats.** .docx (ECMA-376 / ISO/IEC 29500 Office Open XML), .odt (ISO/IEC 26300 OpenDocument), RTF, HTML, Markdown and EPUB are public specifications. The converters were written from those specifications and tested against open-source tools.

## What is deliberately not reproduced

- No vendor logos, icons, splash screens, color schemes or trade dress. Icons are Google's Material Symbols (Apache 2.0). The app icon and visual design are original.
- No vendor product names in the app's own name or UI. Trademarked feature names are replaced with generic terms:

| Vendor term | Anne's Pen term |
|---|---|
| WordArt | Decorative Text |
| SmartArt | Diagram |
| Quick Parts / AutoText | Building Blocks (Snippets) |
| Tell Me / Search | Search Commands |
| Ribbon | Tabs / ribbon used generically |
| Smart Lookup / Researcher / Editor / Copilot | not used |
| Copilot, Gemini in Docs, Writing Tools, Magic Write, Zia, Spices, Sparks, Story Bible, Lorebook (AI feature brands) | generic labels on the AI tab: Draft with AI, Rewrite, Change Tone, Summarize, Story Notes, Add Detail… |

- No copied help text, tooltips, templates, sample documents, clip art or dictionaries. Templates and placeholder text are original. The spelling dictionaries are the SCOWL en_US, en_GB (-ise), en_CA and en_AU Hunspell dictionaries (MIT and BSD-style licenses). The SCOWL en_ZA dictionary is LGPL-2.1, so it is not bundled; South African English uses en_GB.
- No proprietary fonts are bundled. Documents that name Calibri, Cambria, Times New Roman, Arial, Courier New, Georgia or Garamond render with metric-compatible open fonts: Carlito, Caladea, Tinos, Arimo, Cousine, Gelasio and EB Garamond (SIL OFL / Apache 2.0). A locally installed original is preferred when one is present.
- References to other products ("inspired by WordPerfect Reveal Codes") are nominative use describing where an idea came from. They do not imply endorsement.
- **AI providers** are named only to say which service a key belongs to and where to obtain it (nominative use). Anne's Pen does not use their logos and is not affiliated with them. Each provider's own terms govern its API; Anne's Pen only sends requests that the user starts, using the user's own key.
- **Damaged-document recovery** is a port of [Word Recovery](https://github.com/socrtwo/wordrecovery-SF) and its S2 File Identifier and ImmortalInflate components (Universal-File-Repair-Tool), by the same author (socrtwo), used with permission.

## Third-party components

| Component | License |
|---|---|
| ProseMirror (model, state, view, transform, commands, history, keymap, inputrules, schema-list, dropcursor, gapcursor, tables, changeset) | MIT |
| JSZip | MIT (dual MIT/GPLv3; used under MIT) |
| KaTeX | MIT |
| nspell | MIT |
| dictionary-en, dictionary-en-gb, dictionary-en-ca, dictionary-en-au (SCOWL) | MIT and BSD-style |
| Material Symbols | Apache 2.0 |
| Capacitor | MIT |
| Fonts: Carlito, Caladea, Gelasio, EB Garamond, Courier Prime, Libre Baskerville, Lato, Merriweather, Open Sans | SIL Open Font License 1.1 |
| Fonts: Tinos, Arimo, Cousine | Apache 2.0 |
| Word Recovery engine, S2 File Identifier, ImmortalInflate (ported) | by socrtwo, used with the author's permission |
| hunspell-asm (Hunspell compiled to WebAssembly, for downloaded dictionaries) | MIT; Hunspell itself is tri-licensed MPL 1.1 / GPL 2 / LGPL 2.1 and used under MPL 1.1, unmodified (source: https://github.com/hunspell/hunspell) |
| Electron (desktop apps only; includes Chromium) | MIT; Chromium's licenses ship with each desktop build as `LICENSES.chromium.html` |
| Transformers.js 4.2.0 (loaded from cdn.jsdelivr.net only when the on-device model is used; not bundled) | Apache 2.0 |

The build writes the full license text of every bundled npm package (including the dependencies of dependencies) to `third-party-notices.txt`; the app shows it in **Help ▸ Third-Party Notices**. The Android app also contains AndroidX libraries (Apache 2.0).

**Spelling dictionaries for other languages** (Review ▸ Spelling Dictionaries) are not shipped with QuillPen. They are downloaded only at the user's request, from the npm packages of the wooorm/dictionaries project, and kept on the user's device. Each one keeps its own license (GPL, LGPL, MPL, BSD, MIT, Apache, CC BY-SA and others), and the wizard shows it before download. The catalog in `src/proof/dictionary-catalog.json` contains only names, versions, licenses and checksums.

On-device models are downloaded by the user from the Hugging Face Hub, not shipped with the app. Their licenses are Qwen2.5 0.5B Instruct (Apache 2.0), SmolLM2 360M Instruct (Apache 2.0), Gemma 3 270M (Gemma Terms of Use) and Llama 3.2 1B Instruct (Llama 3.2 Community License).

Online services that are called only when the user invokes the matching command: Datamuse (thesaurus), Free Dictionary API (definitions), Google Translate (opened in the browser), and the AI provider the user configured (AI commands only).
