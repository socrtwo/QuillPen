# File formats

Anne's Pen identifies every file by its **content**, not its name (`src/io/sniff.ts`): magic numbers,
compound-file (OLE2) stream names, ZIP entry names and `mimetype` entries, XML root elements and
namespaces, RTF/HTML/MIME headers, and text heuristics (byte-order marks, UTF-16 without a BOM,
UTF-8 validity, markup). The extension only breaks ties between equally likely formats. When the
content and the name disagree, the file opens by content and a short note says so, for example
"Opened as a WordPerfect 5.x document; the file name says .doc." A file with no extension opens the
same way.

Spreadsheets, presentations and email are not word-processing documents. Opening one asks whether
to hand it to the sister app that edits it natively (Anne's Grid, Anne's Stage or Anne's Post: on Android
through a view intent limited to that app's package, on the desktop through the system's registered
handler, on the web through a link), or to import it into a document: one table per sheet, one
section per slide, or a message with its header block, body and attachment list.

Fidelity tiers used below:

- **full**: everything the format can express survives (within what the editor models).
- **high**: text, character and paragraph formatting, styles, lists, tables and the common page
  features; rarely used features are approximated or dropped.
- **basic**: text, paragraphs and the main character formatting (bold, italic, underline, size).
- **text**: text and paragraph breaks only.

## Legacy and binary formats

All readers are clean-room implementations written from the publishers' format descriptions
(Microsoft's binary file format specifications and Open Specifications, WordPerfect Corporation's
developer documentation, Hancom's HWP 5.0 specification, Apple's MacWrite description, IBM's DCA
documentation). When a file's structure cannot be parsed, the recovery report adds a
format-aware text extraction ("Legacy word processor text") next to the generic methods.

| Program | Versions | Era | Extensions | Detection signature | Import fidelity | Known limitations |
| --- | --- | --- | --- | --- | --- | --- |
| Microsoft Word for Windows | 97, 2000, XP, 2003 | 1997-2007 | .doc .dot .wbk | OLE2 `WordDocument` stream, FIB magic A5EC, nFib ≥ 193 | high | Text boxes, shapes other than pictures, revision marks, comments and fields other than PAGE/hyperlinks are not imported; column layouts become one column. Encrypted files are refused with a message. |
| Microsoft Word for Windows | 6.0, 95 | 1993-1997 | .doc .dot | OLE2 `WordDocument`, nFib 101-105 | high | As for 97-2003; numbering comes from the ANLD outline information. East Asian (DBCS) text is decoded with the font character sets. |
| Microsoft Word for Windows | 1.x, 2.0 | 1989-1993 | .doc | FIB magic A59B / A5DB | basic | Character formatting and paragraph text; the style sheet is not read, so heading styles appear as their direct formatting only. |
| Microsoft Word for DOS | 3-6 | 1984-1993 | .doc | BE31 0000 AB00 header with a style-sheet or printer name | high | Styles from separate .STY files are not available; footnotes are not imported. |
| Microsoft Windows Write | 3.0, 3.1 | 1985-1995 | .wri | BE31/BE32 0000 AB00 header | high | OLE objects and metafile pictures are skipped (bitmaps import). |
| Microsoft Word for Macintosh | 1, 3, 4, 5 | 1985-1993 | (none) .doc .mcw | FE32 / FE34 / FE37 big-endian magic | text | Formatting is not read. |
| Kingsoft WPS Writer | 2002-current | 2002- | .wps .wpt | OLE2 `WordDocument` (Word-compatible) | high | Opens through the Word reader; the newer WPS formats are DOCX and open as such. |
| WordPerfect | 4.2 and earlier | 1986-1989 | .wp .doc .wpd | No header; bracketed function codes 0xC0-0xFE | basic | Bold and underline; other functions are skipped. |
| WordPerfect | 5.0, 5.1, 5.2 | 1988-1993 | .wp .wp5 .wpd .doc | `FF 57 50 43`, product 1, file type 0x0A, major version 0 | high | Tables and columns become paragraphs; fonts are reported by the printer setup and are not mapped. |
| WordPerfect | 6.0-X9, Office 20xx | 1993- | .wpd .wp6 .wpt | `FF 57 50 43`, product 1, file type 0x0A, major version 2 (also inside an OLE2 `PerfectOffice_MAIN` stream) | high | Tables and columns become paragraphs; styles are applied as direct formatting. Password-protected files are refused. |
| WordPerfect for Macintosh | 2.x, 3.x | 1990-1996 | (none) .wpd | `FF 57 50 43`, file type 0x2C | basic | Bold, italic and underline; other codes are skipped. |
| Microsoft Works | 4.5-9, Works Suite | 1997-2009 | .wps | OLE2 `CONTENTS` stream starting `CHNKWKS` / `CHNKINK` | text | Text, paragraphs and the default font; the chunk formatting tables are not read. |
| Microsoft Works | 3, 4 for Windows | 1993-1996 | .wps | OLE2 `MN0` stream | basic | Bold, italic, underline and size from the formatting pages. |
| Microsoft Works for DOS | 1-3 | 1987-1993 | .wps | `01 FE` header | text | |
| Lotus Word Pro | 96-9.8 | 1996-2014 | .lwp | `WordPro` at offset 0 | text | Paragraph text records only; formatting, frames, and compressed object streams are not decoded (some documents show only part of their text). |
| Lotus Ami Pro | 1.0-3.1 | 1988-1996 | .sam | `[ver]` section header (text) | high | Styles map to headings and lists by name; frames and drawings are skipped. |
| MacWrite | 2.2, 4.5, 5.0 | 1984-1989 | (none) .mcw | Version word 3 or 6 and the paragraph information array | text | Plain and nibble-compressed paragraphs; formatting runs are not read. |
| MacWrite II / Pro | 1.0-1.5 | 1989-1995 | (none) .mwp | Header pattern (weak; extension helps) | text | Best effort: text runs from the data fork. |
| WriteNow | 2-4 | 1986-1996 | (none) .wn | `WriteNow` (version 4) | text | Best effort; font and style names may appear as text. |
| ClarisWorks / AppleWorks | 1-6 | 1991-2004 | .cwk (none) | `BOBO` at offset 4 | text | Word-processing text; spreadsheet, database and drawing parts are not imported. |
| WordStar | 3.x-4.x, 5-7 | 1979-1992 | .ws .ws4-.ws7 .wsd (any) | WordStar 5-7 header `1D 7D`; otherwise high-bit word ends, soft returns `8D 0A`, dot commands | basic | Bold/italic/underline/super/subscript toggles, dot commands for page breaks, headers, footers, left margin and justification. |
| XyWrite | III, III+, 4 | 1982-1993 | .xy .xyw (any) | `«MD..»`, `«PG»` command pairs in CP437 text | basic | Modes, centering, flush right, page breaks, running heads and footnotes. |
| IBM DisplayWrite / DCA-RFT | 3-5 | 1985-1993 | .rft .dca | Structured field introducer `xx xx D3`, EBCDIC text | basic | Underline and bold control sequences; tables and fonts are not read. |
| MultiMate | 3.x, Advantage | 1982-1990 | .dox (any) | 0xAF paragraph marks (weak; extension helps) | text | |
| Hangul (Hancom Office) | 2002 and later (HWP 5) | 2002- | .hwp .hwt | OLE2 `FileHeader` stream `HWP Document File` | high | Text, character shapes (bold, italic, underline, strike, super/subscript, font, size, colour), paragraph shapes, tables with spans, page size and margins. Distribution (copy-protected) and password-protected documents are refused. |
| Hangul 97 | HWP 3 | 1997-2002 | .hwp | `HWP Document File V3` | — | Recognized; not imported (a different, older format). |

### Spreadsheets, presentations and email (imported as documents)

| Program | Versions | Extensions | Detection signature | Import | Known limitations |
| --- | --- | --- | --- | --- | --- |
| Microsoft Excel | 2007-current | .xlsx .xlsm .xltx | ZIP with `xl/workbook.xml` | One table per sheet, values as displayed (numbers, text, booleans, dates) | Formulas show their cached values; cell formatting, charts and merged cells are not kept. 5,000 rows × 64 columns per sheet. |
| Microsoft Excel | 2.x-2003 (BIFF2-BIFF8), Works spreadsheets | .xls .xlt .xlr | OLE2 `Workbook` / `Book`, or a BIFF2-4 BOF record | As above | As above. Password-protected workbooks are refused. |
| Excel binary workbook | 2007-current | .xlsb | ZIP with `xl/workbook.bin` | Recognized | Not importable; open in QuillGrid. |
| OpenDocument spreadsheet | 1.0-1.3 | .ods .ots .fods | `mimetype` / `office:mimetype` | One table per sheet | As for Excel. |
| CSV / TSV | RFC 4180 | .csv .tsv .tab (any) | Consistent delimiter counts in text | One table (`,` `;` `|` or tab detected) | |
| dBASE / FoxPro | III-7 | .dbf | Version byte, date and header length | One table with field names | Memo fields are not read. |
| Lotus 1-2-3 | 1A-97 | .wk1 .wks .wk3 .wk4 .123 | BOF record (00 00, version) | Values of all sheets | Formulas show their cached values. |
| Quattro Pro, Apple Numbers, Gnumeric, SYLK, DIF, Excel 2003 XML, StarCalc | various | .qpw .wb1-3 .wq1-2 .numbers .gnumeric .slk .dif .xml .sdc .sxc | Container and header signatures | Recognized | Open in QuillGrid. |
| Microsoft PowerPoint | 2007-current | .pptx .pptm .ppsx .potx | ZIP with `ppt/presentation.xml` | One section per slide: title as Heading 1, text with bullet levels, tables, pictures, speaker notes | Slide layout, theme and animations are not kept. |
| OpenDocument presentation | 1.0-1.3 | .odp .otp .fodp | `mimetype` | As above | As above. |
| Microsoft PowerPoint | 97-2003 | .ppt .pps .pot | OLE2 `PowerPoint Document` | Titles and body text per slide | Pictures and tables are not read. PowerPoint 2-4 files are recognized but not imported. |
| Apple Keynote, Corel Presentations, Lotus Freelance, StarImpress | various | .key .shw .prz .sdd .sxi | Container signatures (Freelance: extension only) | Recognized | Open in QuillStage. |
| Internet email | RFC 822/5322, MIME | .eml .msg (text) .nws | RFC 5322 header block | Header block (subject, from, to, cc, date), HTML or text body with inline pictures, attachment list (pictures shown) | Encrypted or signed (S/MIME, PGP) bodies show as attachments. |
| Apple Mail | 2-current | .emlx | Byte count line, then RFC 5322 | As above | |
| mbox mailboxes | all | .mbox .mbx (none) | `From ` separator lines | Each message in its own section (up to 500) | |
| Microsoft Outlook message | 97-current | .msg .oft | OLE2 `__substg1.0_*` property streams | As for email; HTML, plain or compressed RTF body | |
| TNEF (winmail.dat) | | .dat | `78 9F 3E 22` | Subject, sender, date, body and attachment names | |
| Outlook data files, Outlook Express folders | | .pst .ost .dbx | `!BDN`, `CF AD 12 FE` | Recognized | Open in QuillPost. |

## XML, archive and text formats

These formats are recognized by content (`src/io/sniff-b.ts`: XML root element and namespace, ZIP
`mimetype` entry or central-directory names, MIME headers, markup signatures), so a file opens with
the right reader whatever it is called; for the light markups, whose signatures are weak, the
extension decides when the content is ambiguous. Every reader is a clean-room implementation from
the publishers' specifications (ECMA-376 and ISO/IEC 29500, OASIS OpenDocument, the OpenOffice.org
1.x XML file format, the AbiWord, KWord and FictionBook schemas, KS X 6101 (OWPML), DocBook 4 and 5,
RFC 2557, the TIFF 6.0 specification, and the language references of LaTeX, reStructuredText,
Textile, AsciiDoc, Org and troff). Apple's IWA (Pages 5 and later) is undocumented; its reader
follows the publicly described container (Snappy-compressed protobuf archives) and was checked
against Pages files whose text is known.

Text without a declared encoding (plain text, Markdown and the other markups, HTML without a
charset) is decoded after detection: byte-order marks (UTF-8, UTF-16, UTF-32), BOM-less UTF-16,
strict UTF-8, then the East Asian multi-byte encodings (Shift_JIS, EUC-JP, GBK/GB18030, Big5,
EUC-KR) and the single-byte code pages (Windows-1250 to 1258, ISO-8859-x, KOI8-R, Mac OS Roman, and
the DOS code pages 437, 850 and 866), each scored on how plausible the decoded text is.

| Program | Versions | Era | Extensions | Detection signature | Import fidelity | Known limitations |
| --- | --- | --- | --- | --- | --- | --- |
| Microsoft Word (Office Open XML) | 2007-current, Transitional and Strict | 2006- | .docx .docm .dotx .dotm | ZIP with `word/document.xml` | full | Text boxes anchored in drawing canvases are placed at their anchor paragraph; Where a file offers alternate content (SmartArt, charts, equations) the fallback is used. EMF/WMF pictures are kept in the document but browsers cannot draw them, so they show as empty frames. |
| Microsoft Word 2003 XML | 2003, 2007 ("Word XML Document") | 2003-2010 | .xml .wml | `<w:wordDocument>` root in the `schemas.microsoft.com/office/word/2003/wordml` namespace | high | Converted to Office Open XML in memory and read by the DOCX reader: styles, numbering, footnotes and endnotes, comments, tracked changes, headers and footers, sections, embedded pictures (`w:binData`), hyperlinks, shading. VML shapes other than pictures are dropped. |
| Microsoft Word Flat OPC | 2007-current | 2007- | .xml | `<pkg:package>` root with a `/word/document.xml` part | full | As for DOCX (the package parts are rebuilt into a ZIP). |
| OpenDocument text | 1.0-1.3 | 2005- | .odt .ott .fodt | `mimetype` `application/vnd.oasis.opendocument.text`; flat XML `office:document` with that `office:mimetype` | full | Text frames become text boxes (width, wrap side, fill, border); cell borders kept. Drawing shapes other than frames and pictures are dropped. |
| OpenOffice.org / StarOffice Writer XML | OpenOffice.org 1.x, StarOffice 6-7 | 2002-2005 | .sxw .stw .sxg | `mimetype` `application/vnd.sun.xml.writer` (also `-template`, `-global`); single `office:document` with the `openoffice.org/2000/office` namespace | high | Translated to OpenDocument and read by the ODT reader: styles, lists, tables, frames, pictures, notes, annotations, tracked changes, page layout, headers and footers. Master documents (.sxg) import their own text only, not the linked sub-documents. |
| Rich Text Format | 1.0-1.9.1 (Word, WordPad, LibreOffice, TextEdit) | 1987- | .rtf | `{\rtf` | high | Comments, tracked changes (author and date), list tables (with or without `\*`), custom paragraph styles, shapes with text (text boxes) and pictures (`\shppict`, `\pict`), paragraph and cell borders, merged cells. Drawing objects other than text boxes and pictures are dropped; OLE objects show their result picture. |
| TextEdit RTFD | Mac OS X-current | 2001- | .rtfd (bundle saved as a ZIP or folder upload) | ZIP with `TXT.rtf` and attachments | high | Attached pictures are inserted where `\NeXTGraphic` names them; TIFF attachments are converted (baseline TIFF: uncompressed, PackBits, LZW). Other attachment types are listed by name. |
| Web page (HTML, XHTML) | HTML 3.2-5, XHTML 1.x | 1995- | .html .htm .xhtml .xht | `<!DOCTYPE html`, `<html`, common tags | high | Document style sheets with simple selectors (tag, class, id) are applied, so LibreOffice, Word ("Web Page") and Google Docs exports keep their formatting and paragraph styles; `@page` size and margins, LibreOffice and Word header/footer divisions, footnotes. Complex selectors, floats and positioning are ignored. |
| Web archive (MHTML) | IE 5-11, Word "Single File Web Page", Chrome, Opera | 1999- | .mht .mhtml | MIME `multipart/related` with an HTML part | high | As for HTML; pictures and style sheets come from the archive (Content-Location and cid: references, base64 and quoted-printable). |
| AbiWord | 1.x-3.x | 1998- | .abw .zabw .awt | `<abiword` root (also gzip-compressed) | high | Styles, lists, tables with spans and borders, pictures, footnotes and endnotes, annotations, tracked revisions, headers and footers, page size and margins, metadata. Positioned frames other than text and pictures are dropped. |
| KWord / Calligra Words | KWord 1.x (KOffice 1.x) | 1999-2010 | .kwd .kwt | ZIP (or tar.gz) with `maindoc.xml` whose root is `<DOC ... editor="KWord">`; `mimetype` `application/x-kword` | high | Paper, styles, lists (counters), tables (frame groups), pictures, footnotes, headers and footers, metadata. Later Calligra Words files are OpenDocument and open as such. |
| Apple Pages | '09 (4.x) | 2009-2013 | .pages | ZIP with `index.xml` in the `apple.com/namespaces/sl` namespace (also gzip-compressed index) | high | Paragraph and character styles with inheritance, lists, tables, pictures, headers and footers, footnotes, comments, page size and margins. Shapes and text boxes become paragraphs at their anchor. |
| Apple Pages | 5.0-current (IWA) | 2013- | .pages (package folder saved as a ZIP) | ZIP with `Index/Document.iwa` (or a nested `Index.zip`) | basic | Body text with paragraph styles (headings, alignment, spacing), character runs (bold, italic, underline, strike, font, size, colour), lists, tables (text and numbers) and pictures. Headers, footers, footnotes and comments are not read (IWA is undocumented). Password-protected documents show their preview picture (`preview.jpg`) and a note that the text is encrypted. |
| Hangul (HWPX / OWPML) | Hancom Office 2010-current | 2010- | .hwpx .hwpt | `mimetype` `application/hwp+zip`, `Contents/section0.xml` | high | Character and paragraph shapes, numbering and bullets, styles, tables with spans and fills, pictures, headers, footers, footnotes, hyperlinks, page size and margins. Drawing objects other than pictures are dropped. |
| FictionBook | 2.0-2.1 | 2004- | .fb2 .fbz | `<FictionBook>` root (also inside a ZIP) | high | Title information (title, author, annotation, cover), sections as headings, epigraphs, poems, citations, tables, pictures, notes bodies as footnotes. |
| DocBook | 4.x (SGML-free XML) and 5.x | 1999- | .dbk .docbook .xml | `<book>`, `<article>` and friends in the `docbook.org/ns/docbook` namespace or with a DocBook DOCTYPE | high | Sections, admonitions and sidebars (as text boxes), lists, variable lists, CALS and HTML tables with spans, program listings, figures with embedded pictures, equations (TeX alternatives), footnotes, links and cross-references. Pictures referenced by path are not available (only the file is opened). |
| EPUB | 2.0, 3.x | 2007- | .epub | `mimetype` `application/epub+zip` | high | Chapters in spine order with pictures, footnotes and links between chapters; title, author and language from the package. The book's own style sheets are not applied; fixed-layout positioning is not kept. |
| Markdown | CommonMark, GitHub, pandoc | 2004- | .md .markdown .mdown .mkd | Markdown block syntax in text | high | Tables, task lists, footnotes, math, fenced code. Raw HTML blocks are imported as HTML. |
| LaTeX | LaTeX 2e | 1994- | .tex .latex .ltx | `\documentclass`, `\begin{document}` | high | Title block, sectioning, lists (with enumitem labels), tabular with `\multicolumn`/`\multirow`, figures, footnotes, verbatim and listings, math (kept as LaTeX), page geometry, accents and symbols, simple `\newcommand` macros. Packages are not executed; unknown commands keep their arguments as text. Pictures loaded from separate files are not available. |
| reStructuredText | Docutils 0.x | 2002- | .rst .rest | Section underlines, directives (`.. name::`) | high | Sections, lists, field and option lists, grid, simple and list tables, admonitions, code, math, footnotes, links. Extension directives and roles are shown as text. |
| Textile | 2.x | 2003- | .textile | Block signatures (`h1.`, `p.`, `bq.`, `bc.`) | high | Headings, paragraphs with alignment and classes, lists, tables with spans, quotes, code, footnotes, inline formatting, HTML blocks, links and pictures (inline data only). |
| AsciiDoc | Asciidoctor 1.5-2.x | 2002- | .adoc .asciidoc .asc | Document header (`= Title`, `:attr:`), delimited blocks | high | Header and attributes, sections, lists, description lists, admonitions, delimited blocks, tables with spans, footnotes, links. Includes are not followed. |
| Org mode | 8-9 | 2003- | .org | `#+TITLE:`, `* ` headlines, `#+BEGIN_` blocks | high | Headlines (with TODO keywords and tags as text), lists, tables, blocks, footnotes, links, emphasis. Babel code is not executed; drawers are dropped. |
| troff / man / mdoc | Unix man(7), mdoc(7), tbl | 1971- | .man .roff .mdoc .1-.9 .n | `.TH`, `.SH`, `.Dd`/`.Dt` request lines | high | man and mdoc macros (sections, paragraphs, lists, fonts, synopsis), tbl tables (including `T{ T}` blocks). Arbitrary troff requests, macros defined in the file, eqn and pic are not interpreted. |
| Plain text | any | 1960s- | .txt (any) | Text without markup | text | Encoding detected as above; DOS box drawing (code pages 437/850) decodes correctly. |
