# Embedded editor for Anne's Post

Anne's Post, the suite's email app, can edit a message body in a complete copy of this word processor running
inside Anne's Post's own window. The first part of this file is the suite protocol, copied unchanged from the
shared specification (both apps implement it exactly); the second part describes this app's side and how to
try it locally.

The application is still called Anne's Pen in this repository; the protocol and the Android authority already
use the final name, QuillPen.

---

# Anne's Pen embedded editor protocol (Anne's Post ⇄ Anne's Pen)

Anne's Post can edit a message body in a complete, embedded copy of Anne's Pen when Anne's Pen is
installed. The editor runs inside Anne's Post's own window (an iframe), so the person never leaves
the message. Both apps implement this file exactly.

## 1. Locating Anne's Pen

| Platform | Where Anne's Post finds Anne's Pen's web build | Detection |
|---|---|---|
| Android | Anne's Pen app (applicationId `io.github.socrtwo.quillpen`) exports a read-only ContentProvider, authority `io.github.socrtwo.quillpen.embed`, serving its built web files (`dist/`, i.e. the APK's `public/` assets) by path: `content://io.github.socrtwo.quillpen.embed/index.html`. Anne's Post's WebView intercepts requests to `https://quillpen.embed/<path>` (`shouldInterceptRequest`) and answers them from that provider with `ContentResolver.openInputStream`, setting the MIME type from the extension. | `PackageManager.getPackageInfo("io.github.socrtwo.quillpen")` (manifest `<queries><package android:name="io.github.socrtwo.quillpen"/></queries>`) and the provider answering `index.html`. |
| Desktop (Windows/macOS/Linux) | Anne's Pen's installer ships its web build unpacked in `resources/embed/` (electron-builder `extraResources`), next to `app.asar`. Anne's Post desktop looks in the standard install locations (Windows: `%LOCALAPPDATA%\Programs\QuillPen\resources\embed`, `%PROGRAMFILES%\QuillPen\resources\embed`; macOS: `"/Applications/Anne's Pen.app"/Contents/Resources/embed`, `~/Applications/...`; Linux: `/opt/QuillPen/resources/embed`, AppImage users set the folder) or a folder chosen in Settings, and serves it from its local server at `/quillpen-embed/<path>`. | `index.html` exists in that folder. |
| iOS | Not available (iOS apps cannot read each other's files). The option is hidden. | — |
| Web | An Anne's Pen web deployment URL entered in Settings (for example a self-hosted copy). Same-origin or CORS is not needed: only `postMessage` crosses the frame boundary. | URL set and `index.html` loads. |

## 2. Starting the editor

Anne's Post loads `<base>/index.html?embed=compose&host=quillpost&v=1` in an `<iframe>` that fills the
compose body area (sandbox: `allow-scripts allow-same-origin allow-popups allow-modals allow-downloads`).

In embed mode Anne's Pen:
- shows its full ribbon, QAT, AI tab and editing features, but hides File/Backstage commands that
  open, save or close files, the document tabs, and window chrome;
- shows a slim bar with **Done** (send the result back) and **Cancel**;
- never writes drafts, recent files or autosave to its own storage for embedded documents;
- uses the iframe's size (no fixed heights) and respects the same safe-area variables.

## 3. Messages (window.postMessage, JSON objects)

All messages have `type` starting with `quill-embed:` and `v: 1`. Each side checks `event.source`
is the expected window; Anne's Post also checks `event.origin` against the base it loaded.

| Direction | type | Fields | Meaning |
|---|---|---|---|
| Pen → Post | `quill-embed:ready` | `app: "Anne's Pen"`, `version` | Editor loaded and listening. Post then sends `load`. |
| Post → Pen | `quill-embed:load` | `html` (message body HTML), `subject?`, `theme?: "light"\|"dark"`, `lang?` | Replace the editor content. |
| Pen → Post | `quill-embed:changed` | `dirty: true` | Content changed (debounced, at most every 2 s). |
| Post → Pen | `quill-embed:request` | `id` | Ask for the current content without closing (Send pressed). |
| Pen → Post | `quill-embed:content` | `id`, `html`, `text` | Reply to `request`. |
| Pen → Post | `quill-embed:done` | `html`, `text` | Done pressed: Post replaces the body and closes the editor. |
| Pen → Post | `quill-embed:cancel` | — | Cancel pressed: Post closes the editor and keeps the old body. |

`html` is a fragment suitable for an email body: inline styles only (no `<style>` blocks that
depend on classes, no scripts), images as `data:` URIs or `cid:` references unchanged.

## 4. Anne's Post user interface

- Settings ▸ Compose: **Edit messages in Anne's Pen** (Off / Ask / Always), shown only when Anne's Pen
  is detected; on desktop and web, a field to choose the Anne's Pen folder or URL.
- Compose window: a **Anne's Pen** button (also a command, so it can be placed on the QAT) that opens
  the current body in the embedded editor; the built-in editor stays available.
- If Anne's Pen does not answer `ready` within 8 s, Anne's Post shows an error and falls back to the
  built-in editor.

---

## This app's side

### Web app (`?embed=compose`)

`src/main.ts` switches to embedded mode when the page is opened with `embed=compose` in the query string
(`host` and `v` are accepted and ignored). In that mode:

- A slim bar above the title bar shows **Editing message** (or **Editing: <subject>**), **Cancel** and
  **Done**. Cancel asks before discarding changes.
- The File tab and button, the document name, the Backstage (File screen) and every command that opens,
  saves, closes, prints, exports or sends files are hidden from the ribbon, the Quick Access Bar, menus and
  command search (`src/embed/hidden.ts`); running one from a shortcut or macro only says it is unavailable.
  Options, customization, help and all editing commands (including the AI tab) stay.
- The document tabs are hidden. If a command creates another document (mail-merge results, an AI draft), the
  tab strip appears so you can return to the message; the message itself cannot be closed.
- Nothing about the message is stored: no drafts, autosave, recent files, crash recovery or tour, and the
  service worker is not registered. (Preferences such as the Quick Access Bar are still remembered.)
- The editor fills the iframe and uses Web Layout (Mobile View on narrow frames). The safe-area variables
  apply as in the full app.
- `theme` from `load` overrides the light/dark preference without saving it; `lang` sets the document
  language (spelling); `subject` becomes the title shown in the bar.

`src/embed/embed.ts` implements the messages. It accepts messages only from `window.parent`, with `v: 1`
and a `quill-embed:` type; the origin of the first accepted message is remembered, later messages from other
origins are ignored, and replies are addressed to that origin. `ready` goes to the embedding page's origin
when the browser reports it (`location.ancestorOrigins`), otherwise to `"*"` (it carries no content).
`changed` is sent at most every 2 seconds, never for the `load` itself and not after Done or Cancel.

`src/embed/emailHtml.ts` produces the `html` of `content` and `done`: the document's paragraph, character,
table and list styles are applied as inline `style` attributes (theme colours resolved), and classes,
`data-*` attributes, `<style>`, scripts, event handlers, form controls and `javascript:` URLs are removed.
Images keep their `src`, so `data:` URIs and `cid:` references pass through unchanged (`cid:` images in
incoming HTML are kept for this reason). Check boxes become ☑/☐, page breaks are dropped, and open fonts
the editor uses in place of common fonts are listed after the original (`Calibri, "Carlito", sans-serif`).
`text` is the plain-text export of the same document.

### Android

`android/app/src/main/java/io/github/socrtwo/quillpen/EmbedAssetsProvider.java` is an exported, read-only
ContentProvider registered in `AndroidManifest.xml` with the authority `${applicationId}.embed` (in code:
`BuildConfig.APPLICATION_ID + ".embed"`, which needs `buildFeatures { buildConfig = true }`). Once the
application id is `io.github.socrtwo.quillpen`, that is `io.github.socrtwo.quillpen.embed`, as the protocol
requires. It serves `assets/public/` (the web build that `npx cap sync` copies into the APK) by path, with
the MIME type from the extension; `/` and folder paths serve their `index.html`. Paths containing `..`, `.`
or empty segments, backslashes or NUL are refused, and so is any mode other than `"r"`. Uncompressed assets
are returned directly; compressed ones are streamed through a pipe, so `ContentResolver.openInputStream`
works for every file. `query` reports `_display_name` and, when known, `_size`.

### Desktop

`electron-builder.config.cjs` copies `dist/` unpacked to `resources/embed/` next to `app.asar`
(`extraResources`), which is where Anne's Post desktop looks for it.

### iOS

Not available (see the protocol). Nothing is added to the iOS app.

## Trying it locally

1. `npm run dev` and open `http://localhost:5173/?embed=compose`. The Done/Cancel bar appears and the File
   commands are gone.
2. In the browser console, listen for what the editor sends, then send it a message. Outside an iframe the
   page is its own parent, so it talks to itself:

   ```js
   addEventListener('message', (e) => { if (String(e.data?.type).startsWith('quill-embed:')) console.log(e.data); });
   postMessage({ type: 'quill-embed:load', v: 1, html: '<p>Hello <b>Ann</b>,</p><p>See you at <i>noon</i>.</p>', subject: 'Lunch', theme: 'dark', lang: 'en-GB' }, '*');
   postMessage({ type: 'quill-embed:request', v: 1, id: 'r1' }, '*');   // logs quill-embed:content
   ```

   Type in the document to see `quill-embed:changed` (at most every 2 s); press **Done** to see
   `quill-embed:done`, or **Cancel** for `quill-embed:cancel`. (The `ready` message went out before the
   listener existed; reload with the listener added from a bookmarklet or a host page to see it.)
3. To test it as Anne's Post does, serve a page from another origin with
   `<iframe src="http://localhost:5173/?embed=compose&host=quillpost&v=1" sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-downloads">`,
   wait for `quill-embed:ready` from `iframe.contentWindow`, and answer with `load` addressed to
   `http://localhost:5173`.
4. Unit tests: `npx vitest run tests/unit/embed.test.ts` (HTML export, CSS inliner, message handling).
