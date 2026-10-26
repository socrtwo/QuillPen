# Anne's Pen Command Reference

Anne's Pen ships **823 commands**. Every one can be placed on the Quick Access Bar, added to a custom tab, bound to a keyboard shortcut, recorded in a macro, or found with command search (Alt+Q).

435 of them are "Commands Not in the Tabs" — reachable through the Quick Access Bar chooser, Customize Tabs, the command search, or menus — mirroring how desktop suites expose their full command library.

This file is generated from the source by `npm run catalog`.

## Default tab layout

- **Home**: Clipboard · Font · Paragraph · Styles · Editing · Voice
- **Insert**: Pages · Tables · Illustrations · Links · Comments · Header & Footer · Text · Symbols
- **Draw**: Drawing Tools · Drawing
- **Design**: Document Formatting · Page Background
- **Layout**: Page Setup · Paragraph · Arrange
- **References**: Table of Contents · Footnotes · Citations & Bibliography · Captions · Index · Table of Authorities
- **Mailings**: Create · Start Mail Merge · Write & Insert Fields · Preview Results · Finish
- **Review**: Proofing · Speech · Accessibility · Language · Comments · Tracking · Changes · Compare · Protect · Ink
- **View**: Views · Immersive · Show · Zoom · Writing · Window · Macros
- **Tools**: Clean Up · Typography · Text · Analyze
- **AI**: Assistant · Providers · Write · Rewrite · Length & Structure · Proofing · Summarize & Analyze · Translate · Research · Review · Pictures · Creative
- **Developer**: Code · Controls · Protect · Templates
- **Help**: Help
- **Table Design** (contextual): Table Style Options · Table Styles · Borders
- **Table Layout** (contextual): Table · Rows & Columns · Merge · Cell Size · Alignment · Data
- **Picture Format** (contextual): Adjust · Picture Styles · Accessibility · Arrange · Size

## File (48)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Close All Documents | Close |  | `file.closeAll` | not in tabs |
| Close Document | Close | Ctrl+w, Ctrl+F4 | `file.close` |  |
| Exit | Close |  | `file.exit` | not in tabs |
| Export as Anne's Pen Document (.qpd) | Export |  | `file.export.qpd` | not in tabs |
| Export as EPUB e-book (.epub) | Export |  | `file.export.epub` | not in tabs |
| Export as Flat OpenDocument (.fodt) | Export |  | `file.export.fodt` | not in tabs |
| Export as Markdown (.md) | Export |  | `file.export.md` | not in tabs |
| Export as OpenDocument Text (.odt) | Export |  | `file.export.odt` | not in tabs |
| Export as PDF | Export |  | `file.exportPdf` |  |
| Export as Plain Text (.txt) | Export |  | `file.export.txt` | not in tabs |
| Export as Rich Text Format (.rtf) | Export |  | `file.export.rtf` | not in tabs |
| Export as Web Page (.html) | Export |  | `file.export.html` | not in tabs |
| Export as Word Document (.docx) | Export |  | `file.export.docx` | not in tabs |
| Encrypt with Password… | Info |  | `file.encrypt` | not in tabs |
| Inspect Document… | Info |  | `file.inspect` | not in tabs |
| Properties… | Info |  | `file.properties` |  |
| Recover Unsaved Documents | Info |  | `file.recover` | not in tabs |
| Revert to Saved | Info |  | `file.revert` | not in tabs |
| Take Snapshot | Info | Ctrl+Alt+5 | `file.snapshot` | not in tabs |
| Version History | Info |  | `file.versions` | inspired by Snapshots (Scrivener) / version history (online editors) |
| New Document | New | Ctrl+n | `file.new` |  |
| New from Template… | New |  | `file.newFromTemplate` | not in tabs |
| Clear Unpinned Recent Documents | Open |  | `file.clearRecent` | not in tabs |
| Manual Recovery Options | Open |  | `file.recoveryHelp` | not in tabs |
| Open and Repair… | Open |  | `file.openRepair` | not in tabs |
| Open Encrypted Document… | Open |  | `file.openEncrypted` | not in tabs |
| Open Recent | Open |  | `file.openRecent` | has options menu; not in tabs |
| Open… | Open | Ctrl+o, Ctrl+F12 | `file.open` |  |
| Recover Text from Any File… | Open |  | `file.recoverText` | not in tabs |
| Recovery Report | Open |  | `file.recoveryReport` | not in tabs |
| AutoCorrect Options… | Options |  | `file.autocorrectOptions` | not in tabs |
| Custom Dictionary… | Options |  | `file.customDictionary` | not in tabs |
| Customize Keyboard… | Options |  | `file.customizeKeyboard` | not in tabs |
| Customize Quick Access Bar… | Options |  | `file.customizeQat` | not in tabs |
| Customize Tabs… | Options |  | `file.customizeRibbon` | not in tabs |
| Export / Import Settings… | Options |  | `file.exportSettings` | not in tabs |
| Options… | Options |  | `file.options` |  |
| Reset All Customizations | Options |  | `file.resetCustomizations` | not in tabs |
| Print Preview | Print | Ctrl+Alt+i | `file.printPreview` | not in tabs |
| Print… | Print | Ctrl+p | `file.print` |  |
| Quick Print | Print |  | `file.quickPrint` | not in tabs |
| AutoSave | Save |  | `file.autosave` | not in tabs |
| Save | Save | Ctrl+s, Shift+F12 | `file.save` |  |
| Save All | Save |  | `file.saveAll` | not in tabs |
| Save as Template | Save |  | `file.saveTemplate` | not in tabs |
| Save As… | Save | F12 | `file.saveAs` |  |
| Email as Attachment | Share |  | `file.email` | not in tabs |
| Share… | Share |  | `file.share` |  |

## Home (233)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Clipboard History | Clipboard |  | `edit.clipboardPane` | inspired by Office Clipboard / clipboard managers |
| Copy | Clipboard |  | `edit.copy` |  |
| Copy Formatting | Clipboard |  | `fmt.copyFormat` | not in tabs |
| Cut | Clipboard |  | `edit.cut` |  |
| Format Painter | Clipboard | Ctrl+Shift+c | `fmt.painter` |  |
| Insert Spike Contents | Clipboard | Ctrl+Shift+F3 | `edit.spikeInsert` | not in tabs |
| Paste | Clipboard |  | `edit.paste` | has options menu |
| Paste and Merge Formatting | Clipboard |  | `edit.pasteMerge` | not in tabs |
| Paste as Plain Text | Clipboard | Ctrl+Shift+v | `edit.pasteText` | not in tabs |
| Paste Formatting | Clipboard |  | `fmt.pasteFormat` | not in tabs |
| Paste Markdown as Formatted Text | Clipboard |  | `edit.pasteMarkdown` | not in tabs; inspired by Markdown editors |
| Paste Special… | Clipboard | Ctrl+Alt+v | `edit.pasteSpecial` | not in tabs |
| Redo | Clipboard | Ctrl+y, Ctrl+Shift+z | `edit.redo` | not in tabs |
| Repeat Last Action | Clipboard | F4 | `edit.repeat` | not in tabs |
| Set Default Paste… | Clipboard |  | `edit.setDefaultPaste` | not in tabs |
| Spike (Cut to Collection) | Clipboard | Ctrl+F3 | `edit.spikeCut` | not in tabs; inspired by Classic word processor "Spike" |
| Undo | Clipboard | Ctrl+z | `edit.undo` | not in tabs |
| Advanced Find (Regex, Wildcards) | Editing |  | `edit.advancedFind` | not in tabs; inspired by LibreOffice regex search |
| Clear Find Highlights | Editing |  | `edit.clearFind` | not in tabs |
| Collapse Selection | Editing |  | `edit.collapseSelection` | not in tabs |
| Delete Next Word | Editing |  | `edit.deleteWordFwd` | not in tabs |
| Delete Paragraph | Editing | Ctrl+Shift+Backspace | `edit.deleteBlock` | not in tabs |
| Delete Previous Word | Editing |  | `edit.deleteWordBack` | not in tabs |
| Duplicate Paragraph | Editing | Ctrl+Shift+u | `edit.duplicate` | not in tabs; inspired by Code editors |
| Extend Selection | Editing | F8 | `edit.extendSelection` | not in tabs; inspired by Classic Extend mode (word → sentence → paragraph → document) |
| Find | Editing | Ctrl+f | `edit.find` |  |
| Find Next | Editing | Ctrl+g | `edit.findNext` | not in tabs |
| Find Previous | Editing |  | `edit.findPrev` | not in tabs |
| Go To… | Editing | Ctrl+Alt+g, F5 | `nav.goto` |  |
| Highlight All Matches (Reading Highlight) | Editing |  | `edit.highlightAll` | not in tabs |
| Join Paragraphs | Editing |  | `edit.joinParagraphs` | not in tabs |
| Move Paragraph Down | Editing | Alt+Shift+ArrowDown | `edit.moveDown` | not in tabs |
| Move Paragraph Up | Editing | Alt+Shift+ArrowUp | `edit.moveUp` | not in tabs |
| Replace | Editing | Ctrl+h | `edit.replace` |  |
| Replace All | Editing |  | `edit.replaceAll` | not in tabs |
| Select All | Editing | Ctrl+a | `edit.selectAll` |  |
| Select Line | Editing |  | `edit.selectLine` | not in tabs |
| Select Objects (Selection Pane) | Editing |  | `edit.selectObjects` | not in tabs |
| Select Paragraph | Editing |  | `edit.selectParagraph` | not in tabs |
| Select Sentence | Editing |  | `edit.selectSentence` | not in tabs |
| Select Text with Similar Formatting | Editing |  | `edit.selectSimilar` |  |
| Select to End of Document | Editing | Ctrl+Shift+End | `edit.selectToEnd` | not in tabs |
| Select to Start of Document | Editing | Ctrl+Shift+Home | `edit.selectToStart` | not in tabs |
| Select Word | Editing |  | `edit.selectWord` | not in tabs |
| Shrink Selection | Editing | Shift+F8 | `edit.shrinkSelection` | not in tabs |
| Transpose Characters | Editing |  | `edit.transpose` | not in tabs; inspired by Emacs / macOS text system |
| Transpose Words | Editing |  | `edit.transposeWords` | not in tabs |
| All Caps | Font | Ctrl+Shift+a | `fmt.allcaps` | not in tabs |
| aLtErNaTiNg cAsE | Font |  | `fmt.case.alternating` | not in tabs |
| Bold | Font | Ctrl+b, Ctrl+Shift+b | `fmt.bold` |  |
| Capitalize Each Word | Font |  | `fmt.case.capitalize` | not in tabs |
| Change Case | Font | Shift+F3 | `fmt.changeCase` | has options menu |
| Character Border | Font |  | `fmt.charBorder` | not in tabs |
| Character Shading | Font |  | `fmt.shading` | not in tabs |
| Character Spacing | Font |  | `fmt.charSpacing` | has options menu; not in tabs |
| Clear All Formatting | Font | Ctrl+Space | `fmt.clear` |  |
| Clear Character Formatting | Font |  | `fmt.clearChar` | not in tabs |
| Condense Character Spacing | Font |  | `fmt.condense` | not in tabs |
| Decrease Font Size | Font | Ctrl+Shift+,, Ctrl+[ | `fmt.shrink` |  |
| Dotted Underline | Font |  | `fmt.underlineDotted` | not in tabs |
| Double Strikethrough | Font |  | `fmt.dstrike` | not in tabs |
| Double Underline | Font | Ctrl+Shift+d | `fmt.underlineDouble` | not in tabs |
| Expand Character Spacing | Font |  | `fmt.expand` | not in tabs |
| Font | Font | Ctrl+Shift+f | `fmt.font` |  |
| Font Color | Font |  | `fmt.color` |  |
| Font Settings… | Font | Ctrl+d | `fmt.fontDialog` | not in tabs |
| Font Size | Font | Ctrl+Shift+p | `fmt.size` |  |
| Font Size 10 | Font |  | `fmt.size10` | not in tabs |
| Font Size 10.5 | Font |  | `fmt.size10_5` | not in tabs |
| Font Size 11 | Font |  | `fmt.size11` | not in tabs |
| Font Size 12 | Font |  | `fmt.size12` | not in tabs |
| Font Size 14 | Font |  | `fmt.size14` | not in tabs |
| Font Size 16 | Font |  | `fmt.size16` | not in tabs |
| Font Size 18 | Font |  | `fmt.size18` | not in tabs |
| Font Size 20 | Font |  | `fmt.size20` | not in tabs |
| Font Size 22 | Font |  | `fmt.size22` | not in tabs |
| Font Size 24 | Font |  | `fmt.size24` | not in tabs |
| Font Size 26 | Font |  | `fmt.size26` | not in tabs |
| Font Size 28 | Font |  | `fmt.size28` | not in tabs |
| Font Size 36 | Font |  | `fmt.size36` | not in tabs |
| Font Size 48 | Font |  | `fmt.size48` | not in tabs |
| Font Size 72 | Font |  | `fmt.size72` | not in tabs |
| Font Size 8 | Font |  | `fmt.size8` | not in tabs |
| Font Size 9 | Font |  | `fmt.size9` | not in tabs |
| Grow Font 1 Point | Font |  | `fmt.grow1` | not in tabs |
| Hidden Text | Font | Ctrl+Shift+h | `fmt.hidden` | not in tabs |
| Increase Font Size | Font | Ctrl+Shift+., Ctrl+] | `fmt.grow` |  |
| Inline Code | Font | Ctrl+` | `fmt.code` | not in tabs; inspired by Markdown editors |
| Italic | Font | Ctrl+i, Ctrl+Shift+i | `fmt.italic` |  |
| Kerning for Fonts | Font |  | `fmt.kerning` | not in tabs |
| Left-to-Right Text Run | Font |  | `fmt.ltrRun` | not in tabs |
| Ligatures | Font |  | `fmt.ligatures` | not in tabs; inspired by Desktop typography (OpenType) |
| Lower Text Position | Font |  | `fmt.lower` | not in tabs |
| lowercase | Font |  | `fmt.case.lower` | not in tabs |
| Narrow Characters (Scale) | Font |  | `fmt.scaleNarrow` | not in tabs |
| Number Forms | Font |  | `fmt.numerals` | not in tabs |
| Other Font… | Font |  | `fmt.fontOther` | not in tabs |
| Phonetic Guide (Ruby) | Font |  | `fmt.phonetic` | not in tabs; inspired by East Asian typography |
| Raise Text Position | Font |  | `fmt.raise` | not in tabs |
| Remove Highlight | Font |  | `fmt.highlightNone` | not in tabs |
| Remove Underline | Font |  | `fmt.underlineNone` | not in tabs |
| Right-to-Left Text Run | Font |  | `fmt.rtlRun` | not in tabs |
| Sentence case | Font |  | `fmt.case.sentence` | not in tabs |
| Set as Default Font… | Font |  | `fmt.defaultFont` | not in tabs |
| Shrink Font 1 Point | Font |  | `fmt.shrink1` | not in tabs |
| Small Caps | Font | Ctrl+Shift+k | `fmt.smallcaps` | not in tabs |
| Strikethrough | Font | Ctrl+Alt+s | `fmt.strike` |  |
| Stylistic Set | Font |  | `fmt.stylisticSet` | not in tabs |
| Subscript | Font | Ctrl+= | `fmt.sub` |  |
| Superscript | Font | Ctrl+Shift+= | `fmt.sup` |  |
| Text Effect: 3-D Extrude | Font |  | `fmt.effect.3d` | not in tabs |
| Text Effect: Emboss | Font |  | `fmt.effect.emboss` | not in tabs |
| Text Effect: Engrave | Font |  | `fmt.effect.engrave` | not in tabs |
| Text Effect: Glow | Font |  | `fmt.effect.glow` | not in tabs |
| Text Effect: Gradient Fill | Font |  | `fmt.effect.gradient` | not in tabs |
| Text Effect: Neon | Font |  | `fmt.effect.neon` | not in tabs |
| Text Effect: Outline | Font |  | `fmt.effect.outline` | not in tabs |
| Text Effect: Reflection | Font |  | `fmt.effect.reflection` | not in tabs |
| Text Effect: Shadow | Font |  | `fmt.effect.shadow` | not in tabs |
| Text Effects and Typography | Font |  | `fmt.effects` | has options menu |
| Text Highlight Color | Font | Ctrl+Alt+h | `fmt.highlight` |  |
| Title Case | Font |  | `fmt.case.title` | not in tabs |
| tOGGLE cASE | Font |  | `fmt.case.toggle` | not in tabs |
| Underline | Font | Ctrl+u | `fmt.underline` | has options menu |
| Underline Color | Font |  | `fmt.underlineColor` | not in tabs |
| UPPERCASE | Font |  | `fmt.case.upper` | not in tabs |
| Wavy Underline | Font |  | `fmt.underlineWavy` | not in tabs |
| Widen Characters (Scale) | Font |  | `fmt.scaleWide` | not in tabs |
| Word Underline | Font | Ctrl+Shift+w | `fmt.underlineWords` | not in tabs |
| 1.5 Line Spacing | Paragraph | Ctrl+5 | `para.onehalf` | not in tabs |
| Add/Remove Space After | Paragraph |  | `para.spaceAfterToggle` | not in tabs |
| Add/Remove Space Before | Paragraph | Ctrl+0 | `para.spaceBeforeToggle` | not in tabs |
| Align Left | Paragraph | Ctrl+l | `para.align.left` |  |
| Align Right | Paragraph | Ctrl+r | `para.align.right` |  |
| All Borders | Paragraph |  | `para.border.all` | not in tabs |
| Borders | Paragraph |  | `para.borders` | has options menu |
| Borders and Shading… | Paragraph |  | `para.borderStyle` |  |
| Bottom Border | Paragraph |  | `para.border.bottom` | not in tabs |
| Box (Double) | Paragraph |  | `para.border.box` | not in tabs |
| Bullets | Paragraph | Ctrl+Shift+l | `list.bullets` | has options menu |
| Center | Paragraph | Ctrl+e | `para.align.center` |  |
| Checklist | Paragraph | Ctrl+Shift+9 | `list.checklist` | inspired by Note-taking apps |
| Clear Paragraph Formatting | Paragraph | Ctrl+q | `fmt.clearPara` | not in tabs |
| Continue Numbering | Paragraph |  | `list.continue` | not in tabs |
| Convert List to Text | Paragraph |  | `list.convertToText` | not in tabs |
| Decrease Indent | Paragraph | Ctrl+Shift+m | `para.outdent` |  |
| Decrease List Level | Paragraph |  | `list.decreaseLevel` | not in tabs |
| Define New Bullet… | Paragraph |  | `list.defineBullet` | not in tabs |
| Distributed | Paragraph | Ctrl+Shift+j | `para.align.distribute` | not in tabs |
| Double Spacing | Paragraph | Ctrl+2 | `para.double` | not in tabs |
| First-Line Indent | Paragraph |  | `para.firstLine` | not in tabs |
| Hanging Indent | Paragraph | Ctrl+t | `para.hanging` | not in tabs |
| Heading Numbering (Chapter Numbering) | Paragraph |  | `list.numberHeadings` | not in tabs; inspired by LibreOffice chapter numbering |
| Hidden Paragraph | Paragraph |  | `para.hiddenPara` | not in tabs; inspired by LibreOffice Writer hidden paragraphs |
| Increase Indent | Paragraph | Ctrl+m | `para.indent` |  |
| Increase List Level | Paragraph |  | `list.increaseLevel` | not in tabs |
| Inside Borders | Paragraph |  | `para.border.inside` | not in tabs |
| Inside Horizontal Border | Paragraph |  | `para.border.insideH` | not in tabs |
| Justify | Paragraph | Ctrl+j | `para.align.justify` |  |
| Left Border | Paragraph |  | `para.border.left` | not in tabs |
| Left-to-Right Text Direction | Paragraph |  | `para.ltr` | not in tabs |
| Line and Paragraph Spacing | Paragraph |  | `para.lineSpacing` | has options menu |
| Multilevel List | Paragraph |  | `list.multilevel` | has options menu |
| No Border | Paragraph |  | `para.border.none` | not in tabs |
| Numbering | Paragraph | Ctrl+Shift+7 | `list.numbering` | has options menu |
| Outside Borders | Paragraph |  | `para.border.outside` | not in tabs |
| Paragraph Settings… | Paragraph |  | `para.dialog` | not in tabs |
| Paragraph Shading | Paragraph |  | `para.shading` |  |
| Remove Hanging Indent | Paragraph | Ctrl+Shift+t | `para.unhang` | not in tabs |
| Restart Numbering | Paragraph |  | `list.restart` | not in tabs |
| Right Border | Paragraph |  | `para.border.right` | not in tabs |
| Right-to-Left Text Direction | Paragraph |  | `para.rtl` | not in tabs |
| Set Numbering Value… | Paragraph |  | `list.setValue` | not in tabs |
| Shadow Box | Paragraph |  | `para.border.shadow` | not in tabs |
| Single Spacing | Paragraph | Ctrl+1 | `para.single` | not in tabs |
| Tabs… | Paragraph |  | `para.tabs` | not in tabs |
| Top Border | Paragraph |  | `para.border.top` | not in tabs |
| Apply Styles… | Styles |  | `style.applyDialog` | not in tabs |
| Character Style: Book Title | Styles |  | `style.c.BookTitle` | not in tabs |
| Character Style: Emphasis | Styles |  | `style.c.Emphasis` | not in tabs |
| Character Style: Intense Emphasis | Styles |  | `style.c.IntenseEmphasis` | not in tabs |
| Character Style: Intense Reference | Styles |  | `style.c.IntenseReference` | not in tabs |
| Character Style: Keyboard | Styles |  | `style.c.Keyboard` | not in tabs |
| Character Style: Strong | Styles |  | `style.c.Strong` | not in tabs |
| Character Style: Subtle Emphasis | Styles |  | `style.c.SubtleEmphasis` | not in tabs |
| Character Style: Subtle Reference | Styles |  | `style.c.SubtleReference` | not in tabs |
| Clear Character Style | Styles |  | `style.clearChar` | not in tabs |
| Create a Style from Selection… | Styles |  | `style.create` | not in tabs |
| Import Styles from Document… | Styles |  | `style.importFrom` | not in tabs; inspired by Organizer / Load Styles |
| Manage Styles… | Styles |  | `style.manage` | not in tabs |
| Modify Style… | Styles |  | `style.modify` | not in tabs |
| Select All Instances of Style | Styles |  | `style.selectAllInstances` | not in tabs |
| Style Inspector | Styles |  | `style.inspector` | not in tabs; inspired by LibreOffice Style Inspector |
| Style: Bibliography | Styles |  | `style.p.Bibliography` | not in tabs |
| Style: Block Text | Styles |  | `style.p.BlockText` | not in tabs |
| Style: Body Text | Styles |  | `style.p.BodyText` | not in tabs |
| Style: Body Text First Indent | Styles |  | `style.p.BodyTextFirstIndent` | not in tabs |
| Style: Caption | Styles |  | `style.p.Caption` | not in tabs |
| Style: Closing | Styles |  | `style.p.Closing` | not in tabs |
| Style: Code | Styles |  | `style.p.Code` | not in tabs |
| Style: Envelope Address | Styles |  | `style.p.EnvelopeAddress` | not in tabs |
| Style: Epigraph | Styles |  | `style.p.Epigraph` | not in tabs |
| Style: Hanging Indent | Styles |  | `style.p.HangingIndent` | not in tabs |
| Style: Heading 1 | Styles | Ctrl+Alt+1 | `style.p.Heading1` | not in tabs |
| Style: Heading 2 | Styles | Ctrl+Alt+2 | `style.p.Heading2` | not in tabs |
| Style: Heading 3 | Styles | Ctrl+Alt+3 | `style.p.Heading3` | not in tabs |
| Style: Heading 4 | Styles |  | `style.p.Heading4` | not in tabs |
| Style: Heading 5 | Styles |  | `style.p.Heading5` | not in tabs |
| Style: Heading 6 | Styles |  | `style.p.Heading6` | not in tabs |
| Style: Heading 7 | Styles |  | `style.p.Heading7` | not in tabs |
| Style: Heading 8 | Styles |  | `style.p.Heading8` | not in tabs |
| Style: Heading 9 | Styles |  | `style.p.Heading9` | not in tabs |
| Style: Intense Quote | Styles |  | `style.p.IntenseQuote` | not in tabs |
| Style: List Paragraph | Styles |  | `style.p.ListParagraph` | not in tabs |
| Style: No Spacing | Styles |  | `style.p.NoSpacing` | not in tabs |
| Style: Normal | Styles | Ctrl+Shift+n | `style.p.Normal` | not in tabs |
| Style: Plain Text | Styles |  | `style.p.PlainText` | not in tabs |
| Style: Quote | Styles |  | `style.p.Quote` | not in tabs |
| Style: Salutation | Styles |  | `style.p.Salutation` | not in tabs |
| Style: Screenplay Action | Styles |  | `style.p.ScreenplayAction` | not in tabs |
| Style: Screenplay Character | Styles |  | `style.p.ScreenplayCharacter` | not in tabs |
| Style: Screenplay Dialogue | Styles |  | `style.p.ScreenplayDialogue` | not in tabs |
| Style: Screenplay Parenthetical | Styles |  | `style.p.ScreenplayParenthetical` | not in tabs |
| Style: Screenplay Scene | Styles |  | `style.p.ScreenplayScene` | not in tabs |
| Style: Screenplay Transition | Styles |  | `style.p.ScreenplayTransition` | not in tabs |
| Style: Signature | Styles |  | `style.p.Signature` | not in tabs |
| Style: Subtitle | Styles |  | `style.p.Subtitle` | not in tabs |
| Style: Title | Styles |  | `style.p.Title` | not in tabs |
| Style: Verse | Styles |  | `style.p.Verse` | not in tabs |
| Styles | Styles | Ctrl+Shift+s | `style.apply` | has options menu |
| Styles Pane | Styles | Ctrl+Alt+Shift+s | `style.pane` |  |
| Update Style to Match Selection | Styles |  | `style.updateToMatch` | not in tabs |
| Dictate (Voice Typing) | Voice | Alt+` | `review.dictate` | inspired by Voice typing in online editors |

## Insert (136)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Footer | Header & Footer |  | `insert.footer` | has options menu |
| Format Page Numbers… | Header & Footer |  | `insert.pageNumberFormat` | not in tabs |
| Header | Header & Footer |  | `insert.header` | has options menu |
| Page Number | Header & Footer |  | `insert.pageNumber` | has options menu |
| Remove Footer | Header & Footer |  | `insert.removeFooter` | not in tabs |
| Remove Header | Header & Footer |  | `insert.removeHeader` | not in tabs |
| Chart | Illustrations |  | `insert.chart` | has options menu |
| Diagram | Illustrations |  | `insert.diagram` | has options menu; inspired by Smart graphics in desktop suites |
| Edit Shape / Diagram / Chart | Illustrations |  | `insert.editGraphic` | not in tabs |
| Icons | Illustrations |  | `insert.icons` |  |
| Online Picture (URL)… | Illustrations |  | `insert.pictureUrl` | not in tabs |
| Picture from Camera | Illustrations |  | `insert.pictureCamera` | not in tabs |
| Pictures | Illustrations |  | `insert.picture` | has options menu |
| Shapes | Illustrations |  | `insert.shapes` | has options menu |
| Bookmark… | Links | Ctrl+Shift+F5 | `insert.bookmark` |  |
| Copy Link Address | Links |  | `insert.copyLink` | not in tabs |
| Link | Links | Ctrl+k | `insert.link` |  |
| Next Bookmark | Links |  | `nav.nextBookmark` | not in tabs |
| Open Link | Links |  | `insert.openLink` | not in tabs |
| Remove Link | Links |  | `insert.removeLink` | not in tabs |
| Blank Page | Pages |  | `insert.blankPage` |  |
| Cover Page | Pages |  | `insert.coverPage` | has options menu |
| Page Break | Pages |  | `insert.pageBreak` |  |
| Remove Cover Page | Pages |  | `insert.removeCover` | not in tabs |
| Emoji | Symbols | Ctrl+. | `insert.emoji` |  |
| Equation | Symbols | Alt+= | `insert.equation` | has options menu |
| Inline Equation | Symbols |  | `insert.equationInline` | not in tabs |
| Insert Approximately | Symbols |  | `insert.char.Approximately` | not in tabs |
| Insert Asterism | Symbols |  | `insert.char.Asterism` | not in tabs |
| Insert Ballot Box | Symbols |  | `insert.char.BallotBox` | not in tabs |
| Insert Ballot Box with X | Symbols |  | `insert.char.BallotBoxwithX` | not in tabs |
| Insert Ballot X | Symbols |  | `insert.char.BallotX` | not in tabs |
| Insert Black Star | Symbols |  | `insert.char.BlackStar` | not in tabs |
| Insert Bullet | Symbols |  | `insert.char.Bullet` | not in tabs |
| Insert Care Of | Symbols |  | `insert.char.CareOf` | not in tabs |
| Insert Cent | Symbols |  | `insert.char.Cent` | not in tabs |
| Insert Check Mark | Symbols |  | `insert.char.CheckMark` | not in tabs |
| Insert Chi Rho | Symbols |  | `insert.char.ChiRho` | not in tabs |
| Insert Copyright | Symbols | Ctrl+Alt+c | `insert.char.Copyright` | not in tabs |
| Insert Dagger | Symbols |  | `insert.char.Dagger` | not in tabs |
| Insert Degree | Symbols |  | `insert.char.Degree` | not in tabs |
| Insert Division Sign | Symbols |  | `insert.char.DivisionSign` | not in tabs |
| Insert Double Closing Quote | Symbols |  | `insert.char.DoubleClosingQuote` | not in tabs |
| Insert Double Dagger | Symbols |  | `insert.char.DoubleDagger` | not in tabs |
| Insert Double Opening Quote | Symbols |  | `insert.char.DoubleOpeningQuote` | not in tabs |
| Insert Double Prime (inches/seconds) | Symbols |  | `insert.char.DoublePrimeinchesseconds` | not in tabs |
| Insert Down Arrow | Symbols |  | `insert.char.DownArrow` | not in tabs |
| Insert Ellipsis | Symbols | Ctrl+Alt+. | `insert.char.Ellipsis` | not in tabs |
| Insert Em Dash | Symbols | Ctrl+Alt+- | `insert.char.EmDash` | not in tabs |
| Insert Em Space | Symbols |  | `insert.char.EmSpace` | not in tabs |
| Insert En Dash | Symbols |  | `insert.char.EnDash` | not in tabs |
| Insert En Space | Symbols |  | `insert.char.EnSpace` | not in tabs |
| Insert Euro | Symbols |  | `insert.char.Euro` | not in tabs |
| Insert Fraction Slash | Symbols |  | `insert.char.FractionSlash` | not in tabs |
| Insert Greater or Equal | Symbols |  | `insert.char.GreaterorEqual` | not in tabs |
| Insert Heart | Symbols |  | `insert.char.Heart` | not in tabs |
| Insert Infinity | Symbols |  | `insert.char.Infinity` | not in tabs |
| Insert Latin Cross | Symbols |  | `insert.char.LatinCross` | not in tabs |
| Insert Left Arrow | Symbols |  | `insert.char.LeftArrow` | not in tabs |
| Insert Left Guillemet | Symbols |  | `insert.char.LeftGuillemet` | not in tabs |
| Insert Less or Equal | Symbols |  | `insert.char.LessorEqual` | not in tabs |
| Insert Micro | Symbols |  | `insert.char.Micro` | not in tabs |
| Insert Multiplication Sign | Symbols |  | `insert.char.MultiplicationSign` | not in tabs |
| Insert Narrow No-Break Space | Symbols |  | `insert.char.NarrowNoBreakSpace` | not in tabs |
| Insert Nonbreaking Hyphen | Symbols | Ctrl+Shift+- | `insert.char.NonbreakingHyphen` | not in tabs |
| Insert Nonbreaking Space | Symbols | Ctrl+Shift+Space | `insert.char.NonbreakingSpace` | not in tabs |
| Insert Not Equal | Symbols |  | `insert.char.NotEqual` | not in tabs |
| Insert Numero | Symbols |  | `insert.char.Numero` | not in tabs |
| Insert One Half | Symbols |  | `insert.char.OneHalf` | not in tabs |
| Insert One Quarter | Symbols |  | `insert.char.OneQuarter` | not in tabs |
| Insert One Third | Symbols |  | `insert.char.OneThird` | not in tabs |
| Insert Optional Hyphen | Symbols | Ctrl+- | `insert.optionalHyphen` | not in tabs |
| Insert Orthodox Cross | Symbols |  | `insert.char.OrthodoxCross` | not in tabs |
| Insert Paragraph Mark | Symbols |  | `insert.char.ParagraphMark` | not in tabs |
| Insert Per Mille | Symbols |  | `insert.char.PerMille` | not in tabs |
| Insert Pi | Symbols |  | `insert.char.Pi` | not in tabs |
| Insert Plus-Minus | Symbols |  | `insert.char.PlusMinus` | not in tabs |
| Insert Pound | Symbols |  | `insert.char.Pound` | not in tabs |
| Insert Prescription | Symbols |  | `insert.char.Prescription` | not in tabs |
| Insert Prime (feet/minutes) | Symbols |  | `insert.char.Primefeetminutes` | not in tabs |
| Insert Reference Mark | Symbols |  | `insert.char.ReferenceMark` | not in tabs |
| Insert Registered | Symbols | Ctrl+Alt+r | `insert.char.Registered` | not in tabs |
| Insert Right Arrow | Symbols |  | `insert.char.RightArrow` | not in tabs |
| Insert Right Guillemet | Symbols |  | `insert.char.RightGuillemet` | not in tabs |
| Insert Section | Symbols |  | `insert.char.Section` | not in tabs |
| Insert Service Mark | Symbols |  | `insert.char.ServiceMark` | not in tabs |
| Insert Single Closing Quote (Apostrophe) | Symbols |  | `insert.char.SingleClosingQuoteApostrophe` | not in tabs |
| Insert Single Opening Quote | Symbols |  | `insert.char.SingleOpeningQuote` | not in tabs |
| Insert Smiley | Symbols |  | `insert.char.Smiley` | not in tabs |
| Insert Sound Recording Copyright | Symbols |  | `insert.char.SoundRecordingCopyright` | not in tabs |
| Insert Square Root | Symbols |  | `insert.char.SquareRoot` | not in tabs |
| Insert Star of David | Symbols |  | `insert.char.StarofDavid` | not in tabs |
| Insert Thin Space | Symbols |  | `insert.char.ThinSpace` | not in tabs |
| Insert Three Quarters | Symbols |  | `insert.char.ThreeQuarters` | not in tabs |
| Insert Trademark | Symbols | Ctrl+Alt+t | `insert.char.Trademark` | not in tabs |
| Insert Up Arrow | Symbols |  | `insert.char.UpArrow` | not in tabs |
| Insert White Star | Symbols |  | `insert.char.WhiteStar` | not in tabs |
| Insert Yen | Symbols |  | `insert.char.Yen` | not in tabs |
| Insert Zero-Width Joiner | Symbols |  | `insert.char.ZeroWidthJoiner` | not in tabs |
| Insert Zero-Width Non-Joiner | Symbols |  | `insert.char.ZeroWidthNonJoiner` | not in tabs |
| Insert Zero-Width Space (optional break) | Symbols |  | `insert.char.ZeroWidthSpaceoptionalbreak` | not in tabs |
| Special Characters… | Symbols |  | `insert.specialCharacters` | not in tabs |
| Symbol | Symbols |  | `insert.symbol` | has options menu |
| Convert Text to Table… | Tables |  | `table.fromText` | not in tabs |
| Insert Table… | Tables |  | `insert.tableDialog` | not in tabs |
| Quick Table | Tables |  | `insert.quickTable` | not in tabs |
| Table | Tables |  | `insert.table` | has options menu |
| Building Blocks (Snippets) | Text |  | `insert.snippets` | has options menu; inspired by Quick parts / AutoText / QuickWords |
| Check Box | Text |  | `insert.checkbox` |  |
| Code Block | Text |  | `insert.codeBlock` | inspired by Developer documentation tools |
| Date & Time… | Text | Alt+Shift+d | `insert.dateTime` |  |
| Decorative Text | Text |  | `insert.decorativeText` | has options menu |
| Document Property | Text |  | `insert.docProperty` | has options menu; not in tabs |
| Drop Cap | Text |  | `para.dropCap` | has options menu |
| Edit Field… | Text |  | `insert.editField` | not in tabs |
| Expand Building Block (Name → Content) | Text | F3 | `insert.expandSnippet` | not in tabs |
| Field… | Text | Ctrl+F9 | `insert.field` |  |
| Format Text Box… | Text |  | `insert.textBoxFormat` | not in tabs |
| Horizontal Line | Text |  | `insert.hr` | has options menu |
| Insert Date Field | Text |  | `insert.date` | not in tabs |
| Insert Line Break | Text | Shift+Enter | `edit.lineBreak` | not in tabs |
| Insert Time Field | Text | Alt+Shift+t | `insert.time` | not in tabs |
| Lock Fields | Text | Ctrl+F11 | `insert.lockFields` | not in tabs |
| Next Field | Text | F11 | `nav.nextField` | not in tabs |
| Object (Embed File)… | Text |  | `insert.object` |  |
| Placeholder Text (Lorem Ipsum) | Text |  | `insert.lorem` | not in tabs; inspired by =lorem() / =rand() |
| Previous Field | Text | Shift+F11 | `nav.prevField` | not in tabs |
| Save Selection as Building Block… | Text |  | `insert.saveSnippet` | not in tabs |
| Signature Line | Text |  | `insert.signatureLine` |  |
| Smart Chip | Text |  | `insert.chip` | has options menu; inspired by Online document editors |
| Text Box | Text |  | `insert.textBox` | has options menu |
| Text from File… | Text |  | `insert.textFromFile` |  |
| Toggle Field Codes | Text | Alt+F9 | `insert.toggleFieldCodes` | not in tabs |
| Unlink Fields (Convert to Text) | Text | Ctrl+Shift+F9 | `insert.unlinkFields` | not in tabs |
| Unlock Fields | Text | Ctrl+Shift+F11 | `insert.unlockFields` | not in tabs |
| Update Fields | Text | F9 | `insert.updateFields` | not in tabs |

## Draw (9)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Draw Signature | Drawing |  | `draw.signature` |  |
| Drawing Canvas | Drawing |  | `draw.canvas` |  |
| Edit Drawing | Drawing |  | `draw.editDrawing` |  |
| Shapes | Drawing |  | `draw.shapes` | has options menu |
| Sketch on Graph Paper | Drawing |  | `draw.graphPaper` |  |
| Highlighter Pen | Tools |  | `draw.highlighter` |  |
| Pen | Tools |  | `draw.pen` |  |
| Pen Color and Thickness… | Tools |  | `draw.penSettings` |  |
| Pencil | Tools |  | `draw.pencil` |  |

## Design (10)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Paragraph Spacing | Document Formatting |  | `design.paragraphSpacing` | has options menu |
| Set as Default | Document Formatting |  | `design.setDefault` |  |
| Style Set | Document Formatting |  | `design.styleSet` | has options menu |
| Theme Colors | Document Formatting |  | `design.colors` | has options menu |
| Theme Effects | Document Formatting |  | `design.effects` |  |
| Theme Fonts | Document Formatting |  | `design.fonts` | has options menu |
| Themes | Document Formatting |  | `design.themes` | has options menu |
| Page Borders | Page Background |  | `design.pageBorders` |  |
| Page Color | Page Background |  | `design.pageColor` |  |
| Watermark | Page Background |  | `design.watermark` | has options menu |

## Layout (31)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Align Object | Arrange |  | `layout.align` | has options menu |
| Bring Forward | Arrange |  | `layout.bringForward` |  |
| Position | Arrange |  | `layout.position` |  |
| Rotate Object | Arrange |  | `layout.rotate` | has options menu |
| Selection Pane | Arrange |  | `layout.selectionPane` |  |
| Send Backward | Arrange |  | `layout.sendBackward` |  |
| Wrap Text | Arrange |  | `layout.wrapText` | has options menu |
| Breaks | Page Setup |  | `layout.breaks` | has options menu |
| Column Break | Page Setup | Ctrl+Shift+Enter | `insert.columnBreak` | not in tabs |
| Columns | Page Setup |  | `layout.columns` | has options menu |
| Columns… | Page Setup |  | `layout.columnsDialog` | not in tabs |
| Hyphenation | Page Setup |  | `layout.hyphenation` | has options menu |
| Landscape | Page Setup |  | `layout.landscape` | not in tabs |
| Line Numbering Options… | Page Setup |  | `layout.lineNumberOptions` | not in tabs |
| Line Numbers | Page Setup |  | `layout.lineNumbers` | has options menu |
| Margins | Page Setup |  | `layout.margins` | has options menu |
| Orientation | Page Setup |  | `layout.orientation` | has options menu |
| Page Setup… | Page Setup |  | `layout.pageSetup` | not in tabs |
| Portrait | Page Setup |  | `layout.portrait` | not in tabs |
| Section Break | Page Setup |  | `insert.sectionBreak` | has options menu; not in tabs |
| Size | Page Setup |  | `layout.size` | has options menu |
| Text Direction | Page Setup |  | `layout.textDirection` | has options menu |
| Indent Left | Paragraph |  | `layout.indentLeft` |  |
| Indent Right | Paragraph |  | `layout.indentRight` |  |
| Keep Lines Together | Paragraph |  | `para.keepLines` |  |
| Keep with Next | Paragraph |  | `para.keepNext` |  |
| Page Break Before | Paragraph |  | `para.pageBreakBefore` |  |
| Spacing After | Paragraph |  | `layout.spaceAfter` |  |
| Spacing Before | Paragraph |  | `layout.spaceBefore` |  |
| Suppress Line Numbers | Paragraph |  | `para.suppressLineNumbers` | not in tabs |
| Widow/Orphan Control | Paragraph |  | `para.widow` |  |

## References (31)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Cross-reference… | Captions |  | `refs.crossReference` |  |
| Insert Caption… | Captions |  | `refs.caption` |  |
| Insert Table of Figures | Captions |  | `refs.tof` |  |
| Update Table of Figures | Captions |  | `refs.updateTof` |  |
| Bibliography | Citations & Bibliography |  | `refs.bibliography` | has options menu |
| Citation Style | Citations & Bibliography |  | `refs.citationStyle` | has options menu |
| Convert Citations to Static Text | Citations & Bibliography |  | `refs.citationToText` | not in tabs |
| Insert Citation | Citations & Bibliography |  | `refs.insertCitation` | has options menu |
| Manage Sources… | Citations & Bibliography |  | `refs.manageSources` |  |
| Update Citations and Bibliography | Citations & Bibliography |  | `refs.updateCitations` | not in tabs |
| Convert Footnotes ⇄ Endnotes | Footnotes |  | `refs.convertNotes` | not in tabs |
| Footnote and Endnote Options… | Footnotes |  | `refs.footnoteOptions` | not in tabs |
| Insert Endnote | Footnotes | Ctrl+Alt+d | `refs.endnote` |  |
| Insert Footnote | Footnotes | Ctrl+Alt+f | `refs.footnote` |  |
| Insert Notes Section | Footnotes |  | `refs.insertEndnotesSection` | not in tabs |
| Next Footnote | Footnotes |  | `nav.nextFootnote` |  |
| Previous Footnote | Footnotes |  | `nav.prevFootnote` | not in tabs |
| Show Notes | Footnotes |  | `refs.showNotes` |  |
| AutoMark Index from Word List… | Index |  | `refs.autoMarkIndex` | not in tabs; inspired by Concordance file |
| Insert Index | Index |  | `refs.insertIndex` |  |
| Mark Index Entry… | Index | Alt+Shift+x | `refs.markEntry` |  |
| Update Index | Index |  | `refs.updateIndex` |  |
| Insert Table of Authorities | Table of Authorities |  | `refs.insertToa` |  |
| Mark Citation (Authorities)… | Table of Authorities | Alt+Shift+i | `refs.markCitation` |  |
| Update Table of Authorities | Table of Authorities |  | `refs.updateToa` |  |
| Add Text (TOC Level) | Table of Contents |  | `refs.addText` | has options menu |
| Custom Table of Contents… | Table of Contents |  | `refs.tocDialog` | not in tabs |
| Remove Table of Contents | Table of Contents |  | `refs.removeToc` | not in tabs |
| Table of Contents | Table of Contents |  | `refs.toc` | has options menu |
| Update All (Fields, Tables, Citations) | Table of Contents |  | `refs.updateAll` | not in tabs |
| Update Table | Table of Contents |  | `refs.updateToc` |  |

## Mailings (18)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Envelopes | Create |  | `mail.envelopes` |  |
| Labels | Create |  | `mail.labels` |  |
| Finish & Merge | Finish |  | `mail.finish` | has options menu |
| Check for Errors | Preview Results |  | `mail.checkErrors` |  |
| Find Recipient | Preview Results |  | `mail.findRecipient` |  |
| First Record | Preview Results |  | `mail.first` |  |
| Last Record | Preview Results |  | `mail.last` |  |
| Next Record | Preview Results |  | `mail.next` |  |
| Preview Results | Preview Results |  | `mail.preview` |  |
| Previous Record | Preview Results |  | `mail.prev` |  |
| Edit Recipient List | Start Mail Merge |  | `mail.editRecipients` |  |
| Select Recipients | Start Mail Merge |  | `mail.selectRecipients` | has options menu |
| Start Mail Merge | Start Mail Merge |  | `mail.start` | has options menu |
| Address Block | Write & Insert Fields |  | `mail.addressBlock` |  |
| Greeting Line | Write & Insert Fields |  | `mail.greetingLine` |  |
| Highlight Merge Fields | Write & Insert Fields |  | `mail.highlightFields` |  |
| Insert Merge Field | Write & Insert Fields |  | `mail.insertField` | has options menu |
| Rules | Write & Insert Fields |  | `mail.rules` | has options menu |

## Review (48)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Alt Text… | Accessibility |  | `review.altText` | not in tabs |
| Check Accessibility | Accessibility |  | `review.accessibility` |  |
| Accept | Changes |  | `review.accept` | has options menu |
| Accept All and Stop Tracking | Changes |  | `review.acceptAllStop` | not in tabs |
| Accept All Changes | Changes |  | `review.acceptAll` | not in tabs |
| Accept/Reject by Reviewer… | Changes |  | `review.acceptByAuthor` | not in tabs |
| Next Change | Changes |  | `review.nextChange` |  |
| Previous Change | Changes |  | `review.prevChange` |  |
| Reject | Changes |  | `review.reject` | has options menu |
| Reject All and Stop Tracking | Changes |  | `review.rejectAllStop` | not in tabs |
| Reject All Changes | Changes |  | `review.rejectAll` | not in tabs |
| Delete All Comments | Comments |  | `review.deleteAllComments` | not in tabs |
| Delete Comment | Comments |  | `review.deleteComment` | has options menu |
| New Comment | Comments | Ctrl+Alt+m | `review.newComment` |  |
| Next Comment | Comments |  | `review.nextComment` |  |
| Previous Comment | Comments |  | `review.prevComment` |  |
| Reply to Comment | Comments |  | `review.replyComment` | not in tabs |
| Resolve Comment | Comments |  | `review.resolveComment` | not in tabs |
| Show Comments | Comments |  | `review.showComments` |  |
| Combine Revisions… | Compare |  | `review.combine` |  |
| Compare Documents… | Compare |  | `review.compare` |  |
| Compare with Saved Version… | Compare |  | `review.compareVersions` | not in tabs |
| Hide Ink | Ink |  | `review.hideInk` |  |
| Do Not Check Spelling | Language |  | `fmt.noProof` | not in tabs |
| English Spelling | Language |  | `review.spellDialect` | has options menu |
| Set Proofing Language | Language |  | `fmt.language` |  |
| Spelling Dictionaries… | Language |  | `review.dictionaries` |  |
| Translate Selection (online) | Language |  | `review.translate` |  |
| Check Spelling as You Type | Proofing |  | `review.toggleSpell` | not in tabs |
| Define (Dictionary) | Proofing |  | `review.define` | not in tabs |
| Hide Spelling & Grammar Errors in This Document | Proofing |  | `review.hideProof` | not in tabs |
| Mark Grammar Errors as You Type | Proofing |  | `review.toggleGrammar` | not in tabs |
| Readability Statistics | Proofing |  | `review.readability` |  |
| Recheck Document | Proofing |  | `review.recheck` | not in tabs |
| Spelling & Grammar | Proofing | F7 | `review.spelling` |  |
| Thesaurus | Proofing | Shift+F7 | `review.thesaurus` |  |
| Word Count | Proofing | Ctrl+Shift+g | `review.wordCount` |  |
| Writing Style Highlights | Proofing |  | `review.styleCoach` | inspired by Readability editors (Hemingway-style highlighting) |
| Mark as Final | Protect |  | `review.markFinal` |  |
| Restrict Editing… | Protect |  | `review.restrictEditing` |  |
| Read Aloud | Speech | Ctrl+Alt+Space | `review.readAloud` |  |
| Read Aloud Settings… | Speech |  | `review.speechSettings` | not in tabs |
| Change User Name… | Tracking |  | `review.changeAuthor` | not in tabs |
| Display for Review | Tracking |  | `review.markupView` | has options menu |
| Lock Tracking | Tracking |  | `review.lockTracking` | not in tabs |
| Reviewing Pane | Tracking |  | `review.reviewingPane` |  |
| Show Markup | Tracking |  | `review.showMarkup` | has options menu |
| Track Changes | Tracking | Ctrl+Shift+e | `review.trackChanges` |  |

## View (60)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Immersive Reader | Immersive |  | `view.immersiveReader` |  |
| Read Aloud | Immersive |  | `view.readAloud` | not in tabs |
| Teleprompter | Immersive |  | `view.teleprompter` | inspired by Presenter / teleprompter apps |
| Text Spacing (Reading) | Immersive |  | `view.textSpacing` | not in tabs |
| Go Back (Previous Edit Location) | Navigate | Shift+F5 | `nav.goBack` | not in tabs; inspired by Return to last edit point |
| Go to End of Document | Navigate |  | `nav.docEnd` | not in tabs |
| Go to Start of Document | Navigate |  | `nav.docStart` | not in tabs |
| Next Heading | Navigate | Ctrl+Alt+ArrowDown | `nav.nextHeading` | not in tabs |
| Next Picture | Navigate |  | `nav.nextImage` | not in tabs |
| Next Table | Navigate |  | `nav.nextTable` | not in tabs |
| Previous Heading | Navigate | Ctrl+Alt+ArrowUp | `nav.prevHeading` | not in tabs |
| Collapse All Headings | Outline |  | `outline.collapseAll` | not in tabs |
| Collapse Heading | Outline |  | `outline.collapse` | not in tabs |
| Demote | Outline | Alt+Shift+ArrowRight | `outline.demote` | not in tabs |
| Demote to Body Text | Outline |  | `outline.demoteToBody` | not in tabs |
| Expand All Headings | Outline |  | `outline.expandAll` | not in tabs |
| Expand Heading | Outline |  | `outline.expand` | not in tabs |
| Move Section Down | Outline |  | `outline.moveDown` | not in tabs |
| Move Section Up | Outline |  | `outline.moveUp` | not in tabs |
| Promote | Outline | Alt+Shift+ArrowLeft | `outline.promote` | not in tabs |
| Promote to Heading 1 | Outline |  | `outline.promoteToHeading1` | not in tabs |
| Show First Line Only | Outline |  | `outline.firstLineOnly` | not in tabs |
| Show Level | Outline |  | `outline.showLevel` | has options menu; not in tabs |
| Side to Side Page Movement | Page Movement |  | `view.pageMovement` | not in tabs |
| Field Shading | Show |  | `view.fieldShading` | has options menu; not in tabs |
| Gridlines | Show |  | `view.gridlines` |  |
| Navigation Pane | Show | Ctrl+Alt+n | `view.navPane` |  |
| Reveal Codes | Show | Alt+F3 | `view.revealCodes` | inspired by WordPerfect Reveal Codes |
| Ruler | Show |  | `view.ruler` |  |
| Show Hidden Text | Show |  | `view.hiddenText` | not in tabs |
| Show/Hide ¶ | Show | Ctrl+Shift+8 | `view.formattingMarks` |  |
| Status Bar | Show |  | `view.statusBar` | not in tabs |
| Text Boundaries | Show |  | `view.textBoundaries` | not in tabs |
| Draft | Views |  | `view.draft` |  |
| Focus | Views |  | `view.focus` |  |
| Mobile View | Views |  | `view.mobile` |  |
| Outline | Views |  | `view.outline` |  |
| Print Layout | Views |  | `view.print` |  |
| Read Mode | Views |  | `view.read` |  |
| Web Layout | Views |  | `view.web` |  |
| Collapse the Ribbon | Window | Ctrl+F1 | `view.collapseRibbon` | not in tabs |
| Dark Mode | Window |  | `view.darkMode` | has options menu |
| Dark Page Color | Window |  | `view.darkPage` | not in tabs |
| Distraction-Free Writing | Window | Ctrl+Alt+Shift+z | `view.distractionFree` | inspired by Distraction-free editors |
| Full Screen | Window |  | `view.fullScreen` |  |
| New Document Tab | Window |  | `view.newWindow` |  |
| Next Document | Window | Ctrl+F6 | `view.nextWindow` | not in tabs |
| Previous Document | Window | Ctrl+Shift+F6 | `view.prevWindow` | not in tabs |
| Search Commands | Window | Alt+q | `view.commandSearch` |  |
| Switch Windows | Window |  | `view.switchWindows` | has options menu |
| Focus Highlighting | Writing |  | `view.focusMode` | has options menu; inspired by iA Writer / Ulysses focus mode |
| Typewriter Scrolling | Writing |  | `view.typewriter` | inspired by Scrivener / iA Writer |
| Writing Goal… | Writing |  | `view.writingGoal` | inspired by Scrivener project targets |
| 100% | Zoom |  | `view.zoom100` |  |
| Multiple Pages | Zoom |  | `view.multiplePages` |  |
| One Page | Zoom |  | `view.onePage` |  |
| Page Width | Zoom |  | `view.pageWidth` |  |
| Zoom In | Zoom |  | `view.zoomIn` | not in tabs |
| Zoom Out | Zoom |  | `view.zoomOut` | not in tabs |
| Zoom… | Zoom |  | `view.zoom` |  |

## Tools (36)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Calculate Selection | Analyze |  | `tools.calculate` | inspired by Classic word-processor Calculate command |
| Compare Documents | Analyze |  | `tools.compareText` | not in tabs |
| Document Statistics | Analyze |  | `tools.statistics` |  |
| Find Overused Phrases | Analyze |  | `tools.repeatedPhrases` |  |
| Word Frequency | Analyze |  | `tools.wordFrequency` | inspired by Concordance tools |
| Clean Up OCR Text… | Clean Up |  | `tools.ocrCleanup` | inspired by OCR post-processing |
| Collapse Multiple Spaces | Clean Up |  | `tools.collapseSpaces` |  |
| Join Broken Lines (Unwrap) | Clean Up |  | `tools.unwrapLines` | inspired by OCR and plain-text cleanup |
| Leading Spaces to Tabs | Clean Up |  | `tools.spacesToTabs` | not in tabs |
| Link All URLs and Emails | Clean Up |  | `tools.linkUrls` | not in tabs |
| Normalize Unicode (NFC) | Clean Up |  | `tools.normalize` | not in tabs |
| One Space After Sentences | Clean Up |  | `tools.oneSpaceAfterPeriod` | not in tabs |
| Remove All Hyperlinks | Clean Up |  | `tools.stripLinks` | not in tabs |
| Remove Empty Paragraphs | Clean Up |  | `tools.removeEmpty` |  |
| Remove Invisible Characters | Clean Up |  | `tools.stripInvisible` | not in tabs |
| Remove Line-End Hyphenation | Clean Up |  | `tools.dehyphenate` |  |
| Remove Manual Line Breaks | Clean Up |  | `tools.removeLineBreaks` |  |
| Tabs to Spaces | Clean Up |  | `tools.tabsToSpaces` | not in tabs |
| Trim Leading/Trailing Spaces | Clean Up |  | `tools.trim` | not in tabs |
| Add Prefix/Suffix to Paragraphs… | Text |  | `tools.prefixSuffix` |  |
| Extract Emails / URLs / Numbers… | Text |  | `tools.extract` |  |
| Hard-Wrap Lines at Column… | Text |  | `tools.hardWrap` | not in tabs |
| Insert Timestamp | Text | Ctrl+Alt+Shift+t | `tools.insertTimestamp` | not in tabs; inspired by Journaling apps |
| Number Paragraphs (Prefix) | Text |  | `tools.numberLines` | not in tabs |
| Remove Duplicate Paragraphs | Text |  | `tools.dedupe` |  |
| Reverse Paragraph Order | Text |  | `tools.reverse` |  |
| ROT13 / Spoiler Encode | Text |  | `tools.rot13` | not in tabs |
| Shuffle Paragraphs | Text |  | `tools.shuffle` | not in tabs |
| Sort Paragraphs… | Text |  | `tools.sort` |  |
| AutoFormat Now | Typography |  | `tools.autoFormatNow` |  |
| Convert Markdown Syntax in Document | Typography |  | `tools.markdownToFormat` | not in tabs; inspired by Markdown editors |
| Convert to Smart Quotes | Typography |  | `tools.smartQuotes` |  |
| Convert to Straight Quotes | Typography |  | `tools.straightQuotes` |  |
| Fix Dashes and Ellipses | Typography |  | `tools.dashes` |  |
| Non-Breaking Spaces Before Units/Numbers | Typography |  | `tools.nbspUnits` | not in tabs |
| Typographic Clean-Up (All) | Typography |  | `tools.typographer` | inspired by Publishing typography |

## AI (70)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Action Items | Analyze |  | `ai.actionItems` |  |
| Analyze Text | Analyze |  | `ai.analyze` |  |
| Explain | Analyze |  | `ai.explain` |  |
| Extract Names, Dates & Places | Analyze |  | `ai.extractData` |  |
| Generate FAQ | Analyze |  | `ai.faq` |  |
| Insert Summary at Top | Analyze |  | `ai.summaryTop` |  |
| Summarize | Analyze | Ctrl+Alt+Shift+u | `ai.summarize` | has options menu |
| AI & Privacy | Assistant |  | `ai.privacy` |  |
| AI Pane | Assistant | Ctrl+Alt+a | `ai.chat` |  |
| AI Settings… | Assistant |  | `ai.settings` |  |
| Ask About Document… | Assistant | Ctrl+Alt+q | `ai.ask` |  |
| Delete Downloaded Models | Assistant |  | `ai.clearLocal` |  |
| My Prompts | Assistant |  | `ai.runPrompt` | has options menu |
| Prompt Library… | Assistant |  | `ai.prompts` |  |
| Set Up AI… | Assistant |  | `ai.setup` |  |
| Stop AI | Assistant |  | `ai.stop` |  |
| Describe (Sensory Detail) | Creative |  | `ai.describe` |  |
| Name Generator… | Creative |  | `ai.names` |  |
| Polish Dialogue | Creative |  | `ai.dialogue` |  |
| Story Notes… | Creative |  | `ai.storyNotes` |  |
| Add Detail | Length |  | `ai.addDetail` | has options menu |
| Add Headings | Length |  | `ai.headings` |  |
| Convert to Table | Length |  | `ai.table` |  |
| Expand | Length |  | `ai.expand` |  |
| Key Points | Length |  | `ai.keyPoints` |  |
| Make Bulleted List | Length |  | `ai.bullets` |  |
| Shorten | Length |  | `ai.shorten` |  |
| Describe Picture | Media |  | `ai.describeImage` |  |
| Generate Alt Text | Media |  | `ai.altText` |  |
| Generate Image… | Media |  | `ai.generateImage` |  |
| Image to Text (OCR) | Media |  | `ai.imageToText` |  |
| Check Against Style Guide | Proof |  | `ai.styleGuide` |  |
| Clarity Suggestions | Proof |  | `ai.clarity` |  |
| Fix OCR Errors | Proof |  | `ai.ocrFix` |  |
| Proofread with AI | Proof | Ctrl+Alt+p | `ai.proofread` |  |
| Active AI | Providers |  | `ai.chooseProvider` | has options menu |
| Choose AIs… | Providers |  | `ai.ensembleMembers` |  |
| Providers & Models… | Providers |  | `ai.providers` |  |
| Several AIs | Providers |  | `ai.ensembleMode` | has options menu |
| Show AI Discussion | Providers |  | `ai.showDeliberation` |  |
| Flag Claims to Verify | Research |  | `ai.flagClaims` |  |
| Format Citation… | Research |  | `ai.citation` | has options menu |
| Suggest Sources | Research |  | `ai.findSources` |  |
| Draft Comment Reply | Review |  | `ai.draftReply` |  |
| Feedback as Comments | Review |  | `ai.feedback` |  |
| Grade Against Rubric… | Review |  | `ai.grade` |  |
| Manuscript Critique | Review |  | `ai.critique` |  |
| Reader Reaction | Review |  | `ai.readerView` | has options menu |
| Review AI Edits | Review |  | `ai.reviewEdits` |  |
| Summarize Comments | Review |  | `ai.summarizeComments` |  |
| Change Style | Rewrite |  | `ai.style` | has options menu |
| Change Tone | Rewrite |  | `ai.tone` | has options menu |
| Edit with Instruction… | Rewrite | Ctrl+Alt+e | `ai.edit` |  |
| Improve Writing | Rewrite |  | `ai.improve` |  |
| Make It Sound Natural | Rewrite |  | `ai.natural` |  |
| Match My Voice | Rewrite |  | `ai.matchVoice` |  |
| Rewrite | Rewrite | Ctrl+Alt+Shift+r | `ai.rewrite` |  |
| Simplify | Rewrite |  | `ai.simplify` |  |
| Detect Language | Translate |  | `ai.detectLanguage` |  |
| Side-by-Side Translation | Translate |  | `ai.bilingual` | has options menu |
| Translate Document | Translate |  | `ai.translateDoc` | has options menu |
| Translate Selection | Translate |  | `ai.translate` | has options menu |
| Brainstorm Ideas… | Write |  | `ai.brainstorm` |  |
| Continue Writing | Write | Ctrl+Alt+Shift+. | `ai.continue` |  |
| Create Document from Brief… | Write |  | `ai.createDocument` |  |
| Draft from Template | Write |  | `ai.fromTemplate` | has options menu |
| Draft with AI… | Write | Ctrl+Alt+j | `ai.draft` |  |
| Generate Outline… | Write |  | `ai.outline` |  |
| Inline AI Command… | Write | Ctrl+Alt+Shift+i | `ai.command` |  |
| Suggest Titles | Write |  | `ai.titles` |  |

## Developer (24)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Copy Command ID List | Code |  | `dev.commandIds` | not in tabs |
| Export Macros | Code |  | `dev.exportMacros` | not in tabs |
| Import Macros | Code |  | `dev.importMacros` | not in tabs |
| Macros… | Code | Alt+F8 | `dev.macros` |  |
| Pause Recording | Code |  | `dev.pauseRecording` |  |
| Record Macro | Code |  | `dev.recordMacro` |  |
| Run Script Once… | Code |  | `dev.runScript` |  |
| Script Editor (New Macro) | Code |  | `dev.newScript` |  |
| Stop Recording | Code |  | `dev.stopRecording` |  |
| Check Box Content Control | Controls |  | `dev.control.checkbox` |  |
| Combo Box Content Control | Controls |  | `dev.control.combo` |  |
| Control Properties… | Controls |  | `dev.controlProperties` |  |
| Date Picker Content Control | Controls |  | `dev.control.date` |  |
| Design Mode | Controls |  | `dev.designMode` |  |
| Drop-Down List Content Control | Controls |  | `dev.control.dropdown` |  |
| Next Form Field | Controls |  | `nav.nextControl` | not in tabs |
| Picture Content Control | Controls |  | `dev.control.picture` |  |
| Plain Text Content Control | Controls |  | `dev.control.text` |  |
| Rich Text Content Control | Controls |  | `dev.control.rich` |  |
| Export Form Data (CSV) | Protect |  | `dev.exportFormData` |  |
| Protect for Form Filling | Protect |  | `dev.fillForms` |  |
| Restrict Editing | Protect |  | `dev.restrictEditing` |  |
| Document Panel (Properties) | Templates |  | `dev.documentPanel` |  |
| Document Template (Attach Styles)… | Templates |  | `dev.documentTemplate` |  |

## Help (7)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| About Anne's Pen | Help |  | `help.about` |  |
| Command Reference | Help |  | `help.commands` |  |
| Keyboard Shortcuts | Help | Ctrl+/ | `help.shortcuts` |  |
| Report an Issue | Help |  | `help.feedback` |  |
| Show the Quick Tour | Help |  | `help.tour` |  |
| Third-Party Notices | Help |  | `help.notices` |  |
| What’s New | Help |  | `help.whatsNew` |  |

## Table Tools (contextual) (41)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Align Bottom | Alignment |  | `table.valignBottom` | not in tabs |
| Align Center Vertically | Alignment |  | `table.valignMiddle` | not in tabs |
| Align Top | Alignment |  | `table.valignTop` | not in tabs |
| Cell Alignment | Alignment |  | `table.align` | has options menu |
| Cell Margins… | Alignment |  | `table.cellMargins` |  |
| Text Direction | Alignment |  | `table.textDirection` |  |
| Cell Borders | Borders |  | `table.borders` | has options menu |
| AutoFit | Cell Size |  | `table.autofit` | has options menu |
| Distribute Columns | Cell Size |  | `table.distributeCols` |  |
| Distribute Rows | Cell Size |  | `table.distributeRows` |  |
| Convert Table to Text… | Data |  | `table.toText` |  |
| Formula… | Data |  | `table.formula` |  |
| Repeat Header Rows | Data |  | `table.repeatHeader` |  |
| Sort Table… | Data |  | `table.sort` |  |
| Merge Cells | Merge |  | `table.merge` |  |
| Split Cells… | Merge |  | `table.split` |  |
| Split Table | Merge |  | `table.splitTable` |  |
| Clear Cell Contents | Rows & Columns |  | `table.deleteCell` | not in tabs |
| Delete | Rows & Columns |  | `table.deleteMenu` | has options menu |
| Delete Columns | Rows & Columns |  | `table.deleteCol` | not in tabs |
| Delete Rows | Rows & Columns |  | `table.deleteRow` | not in tabs |
| Delete Table | Rows & Columns |  | `table.delete` | not in tabs |
| Insert Column Left | Rows & Columns |  | `table.insertColLeft` |  |
| Insert Column Right | Rows & Columns |  | `table.insertColRight` |  |
| Insert Row Above | Rows & Columns |  | `table.insertRowAbove` |  |
| Insert Row Below | Rows & Columns |  | `table.insertRowBelow` |  |
| Select Cell | Table |  | `table.selectCell` |  |
| Select Column | Table |  | `table.selectCol` |  |
| Select Row | Table |  | `table.selectRow` |  |
| Select Table | Table |  | `table.selectTable` |  |
| Table Properties… | Table |  | `table.properties` |  |
| View Gridlines | Table |  | `table.gridlines` |  |
| Banded Columns | Table Style Options |  | `table.bandedCols` |  |
| Banded Rows | Table Style Options |  | `table.bandedRows` |  |
| First Column | Table Style Options |  | `table.toggleHeaderCol` |  |
| Header Row | Table Style Options |  | `table.toggleHeaderRow` |  |
| Last Column | Table Style Options |  | `table.lastCol` |  |
| Toggle Header Cell | Table Style Options |  | `table.toggleHeaderCell` | not in tabs |
| Total Row | Table Style Options |  | `table.totalRow` |  |
| Cell Shading | Table Styles |  | `table.shading` |  |
| Table Styles | Table Styles |  | `table.style` | has options menu |

## Picture Format (contextual) (21)

| Command | Group | Shortcut | ID | Notes |
|---|---|---|---|---|
| Alt Text… | Accessibility |  | `picture.altText` |  |
| Artistic Effects & Color | Adjust |  | `picture.filter` | has options menu |
| Change Picture… | Adjust |  | `picture.change` |  |
| Compress Pictures… | Adjust |  | `picture.compress` |  |
| Corrections… | Adjust |  | `picture.corrections` |  |
| Edit Shape/Chart/Diagram | Adjust |  | `picture.editGraphic` |  |
| Link Picture… | Adjust |  | `picture.link` | not in tabs |
| Remove Background (Simple) | Adjust |  | `picture.removeBackground` |  |
| Reset Picture | Adjust |  | `picture.reset` |  |
| Save as Picture… | Adjust |  | `picture.save` | not in tabs |
| Flip Horizontal | Arrange |  | `picture.flipH` |  |
| Flip Vertical | Arrange |  | `picture.flipV` |  |
| Rotate | Arrange |  | `picture.rotate` |  |
| Rotate Left 90° | Arrange |  | `picture.rotateLeft` | not in tabs |
| Wrap Text | Arrange |  | `picture.wrap` | has options menu |
| Picture Border | Picture Styles |  | `picture.border` | has options menu |
| Picture Shadow | Picture Styles |  | `picture.shadow` |  |
| Picture Styles | Picture Styles |  | `picture.styles` | has options menu |
| Crop… | Size |  | `picture.crop` |  |
| Format Picture… | Size |  | `picture.formatDialog` | not in tabs |
| Size… | Size |  | `picture.size` |  |
