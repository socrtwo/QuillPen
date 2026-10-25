# Architecture

Anne's Pen is a TypeScript web application. The Android release packages it with Capacitor, and the same build runs in a desktop browser.

```
src/
  main.ts                 entry: fonts, command registry, App + Shell, launch-file handling, back button
  app.ts                  App (document tabs, dispatch pipeline, exec(), settings, zoom, autosave) and DocTab
  prefs.ts                per-device preferences: QAT, custom tabs, keymap, macros, AutoCorrect, building blocks
  templates.ts            built-in templates
  editor/
    schema.ts             ProseMirror schema: paragraph with a `style` attribute, plus lists, tables, breaks,
                          sections, text boxes, generated blocks, fields, footnotes, math, controls, chips.
                          Marks cover character formatting, comments and revisions.
    settings.ts           DocSettings stored in doc.attrs.settings (page setup, headers/footers, comments,
                          sources, styles, theme, merge data, protection). Undoable and saved with the document.
    styles.ts             built-in styles, style sets, themes, basedOn resolution, CSS generation
    ops.ts                editing helpers used by commands (marks, paragraph attributes, lists, case, selection)
    setup.ts              plugin assembly, keymaps, smart Enter, key-name normalization
    autoformat.ts         AutoCorrect replacement list, smart quotes, Markdown shortcuts, capitalization
    fields.ts             field engine (DATE, PAGE, SEQ, REF, MERGEFIELD, = formulas…), header/footer tokens
    nodeviews.ts          images (resize/rotate), KaTeX math, content controls, generated blocks
    graphics.ts           SVG generators for shapes, diagrams and charts
    compare.ts            LCS-based document compare that emits tracked changes
    plugins/
      trackChanges.ts     suggesting mode: rewrites each transaction into insertion/deletion marks
      pagination.ts       Print Layout: measures blocks and line boxes, inserts page-gap widgets
                          (splits paragraphs, footnotes, headers, footers)
      decorations.ts      footnote numbering, find, focus mode, word completion, proofing, outline folding,
                          style coach, placeholder, active comment
  commands/
    registry.ts           Command interface and registry (the single source for QAT, tabs, keys, macros, search)
    *.ts                  command modules by area (file, edit, format, insert, draw, layout/design, references,
                          mailings, review, view, developer, table, picture, tools)
  ui/
    shell.ts              title bar, QAT, tabs/ribbon, status bar, ruler, context menu, mini toolbar, slash menu,
                          command palette, overlays (watermark, page borders, line numbers)
    ribbonLayout.ts       default tab and group arrangement (command ids only)
    customize.ts          Customize QAT / Tabs / Keyboard dialogs
    backstage.ts          File screen
    panes.ts              task panes (navigation, styles, find, comments, revisions, spelling, Reveal Codes…)
    dialog.ts             declarative dialog builder, menus, color pickers, toasts
  io/                     format converters: docx, odt/fodt, rtf, html, markdown, text, epub, native
                          XML/archive/markup readers (see docs/FORMATS.md): wordml2003, flatopc, sxw,
                          abiword, kword, pages (+ iwa), hwpx, fb2, docbook, rtfd (+ tiff), mhtml, latex,
                          rst, textile, asciidoc, org, troff; sniff-b (content detection), encoding
                          (text encoding detection, shared code pages), xml-read, runs, archive (gzip/tar)
    sniff.ts              content-based identification (rule table; registerSniffer() for format modules)
    cfb.ts                compound file (OLE2, MS-CFB) reader shared by every binary Office-era format
    formats-legacy.ts     import-only FormatDefs for the legacy and cross-category converters
    legacy/               historical word processors: Word 1/2/6/95/97 binary (word.ts), Word for DOS/Write/Mac,
                          WordPerfect, Works, Lotus (Ami Pro, Word Pro), Mac (MacWrite, WriteNow, ClarisWorks),
                          character-mode (WordStar, XyWrite, DCA-RFT, MultiMate), Hangul HWP 5; builder.ts turns
                          their runs into schema nodes; extract.ts feeds the recovery report's legacy text method
    convert/              spreadsheets → tables (sheets.ts), presentations → slide sections (slides.ts),
                          email → message documents (email.ts)
    recover/              damaged-document recovery (Word Recovery port): fileid (S2 identifier), inflate
                          (ImmortalInflate + CRC + resync), salvage (ZIP scan, XML fixes/healing, extractors),
                          doc97 (OLE2 + FIB + piece table), index (pipeline, package rebuild, report)
  ai/                     providers (registry, key formats), store (settings, Keystore/IDB keys), client
                          (OpenAI-compatible, Anthropic, Gemini, built-in, on-device; SSE; native HTTP fallback),
                          local (Transformers.js worker), oauth (OpenRouter PKCE), features (AI tab as data),
                          apply (word-level diff edits, Markdown blocks, comments, tracked AI edits)
  util/sanitize.ts        HTML/URL sanitizing for document- and clipboard-controlled content
  embed/                  Anne's Post's embedded editor (?embed=compose, docs/EMBED.md): embed (postMessage protocol),
                          emailHtml (inline-styled, script-free HTML), hidden (file commands left out), mode (wiring)
  ui/scrollcue.ts         "more below" cues for menus, dialogs, lists and panes (copy of the suite's scrollcue module)
  proof/                  spelling worker: bundled English with nspell + SCOWL en_US/en_GB/en_CA/en_AU ("any
                          variety" = US or GB accepts); downloaded languages with Hunspell (WebAssembly);
                          grammar rules (grammarMatches, pure and unit-tested)
  platform/native.ts      one bridge, three back ends: the Android QuillNative plugin, the desktop
                          preload (window.quillDesktop), and browser/iOS fallbacks (iOS saves to Files)
  proof/dictionaries.ts   downloadable dictionaries: catalog (dictionary-catalog.json), jsDelivr or
                          npm-tarball download, SHA-256 / SHA-512 checks, IndexedDB, language matching
  ui/dictWizard.ts        Spelling Dictionaries wizard
electron/                 desktop app: main.cjs (app:// protocol, CSP, sandboxed renderer, dialogs,
                          granted-file list, safeStorage keys, OAuth loopback, CORS-free HTTP) and preload.cjs
ios/                      Capacitor iOS project (Xcode); saved files go to the app's Documents folder
public/                   web app manifest, service worker (offline PWA), icons
android/                  Capacitor project + QuillNativePlugin.java (SAF open/save/write-back, print, share, intents,
                          Keystore secrets, clipboard, OAuth loopback via AiSupport.java)
```

## Key design decisions

- **Commands are data.** The ribbon, the Quick Access Bar, context menus, shortcuts, macros and search all refer to command ids, so every feature is customizable in every place. `npm run catalog` regenerates `docs/COMMANDS.md`.
- **Styles are an attribute, not node types.** Headings are paragraphs whose style is "Heading n". This keeps style application, outline levels, the table of contents and DOCX/ODT mapping uniform.
- **Spacing uses padding.** Paragraph space before/after renders as padding, so it adds up the way desktop word processors do and block heights can be summed exactly for pagination.
- **Settings live in the document.** Page setup, headers/footers, comments and sources are part of `doc.attrs.settings`. They undo and redo with the text and travel with the file.
- **Tracked changes are transaction post-processing.** User transactions are diffed with prosemirror-changeset. Deleted ranges are re-inserted with a deletion mark, and inserted ranges get an insertion mark.
- **Content decides the format.** sniff() scores every rule against the bytes; the extension only breaks ties. A file whose name disagrees opens by content with a note, and non-document files (spreadsheets, slides, email) go through a choice between the sister app and an import.
- **Legacy readers share one back end.** Each reader decodes its own records into character and paragraph property objects and hands them to DocBuilder, which builds marks, lists, tables, notes and page settings and runs the same normalization as the DOCX importer.
- **Recovery reuses the importers.** Salvaged and repaired parts are re-zipped into a valid package and opened with the normal DOCX/ODT converter, so recovery never needs its own document model.
- **AI is data plus one runner.** Each AI feature declares its input, output and prompt; one runner (commands/ai.ts) gathers input, streams the answer and applies it. Edits within a paragraph are word-level diffs, so formatting and inline objects survive.
- **Pagination is decoration-based.** No layout engine is reimplemented. The browser lays out a page-width column, and the pagination plugin measures it and inserts gap widgets, so editing stays native and fast.
