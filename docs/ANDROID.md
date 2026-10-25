# Anne's Pen for Android

The Android app is the Anne's Pen web core (TypeScript/Vite, built into `dist/`) wrapped with
[Capacitor 8](https://capacitorjs.com/). The native project lives in `android/` and is committed;
`npx cap sync android` copies the web build into it and regenerates the Capacitor plugin glue.

| Item | Value |
| --- | --- |
| Application ID | `io.github.socrtwo.quillpen` |
| minSdk / targetSdk / compileSdk | 24 (Android 7.0) / 36 / 36 (`android/variables.gradle`) |
| versionName | `version` from the root `package.json` |
| versionCode | `VERSION_CODE` environment variable, default `1` (CI uses the workflow run number) |
| Java / Gradle | JDK 21, Gradle wrapper 8.14.3, Android Gradle Plugin 8.13 |

## Build locally

Prerequisites: Node.js 22, JDK 21, and the Android SDK (Android Studio installs it; set `ANDROID_HOME`
or let Android Studio write `android/local.properties`).

```bash
npm ci
npm run build              # web app -> dist/
npx cap sync android       # copy dist/ into android/ and update native plugins
```

Then either:

- **Android Studio:** `npx cap open android` (or open the `android/` folder), pick a device, press Run.
- **Command line:**

  ```bash
  cd android
  ./gradlew assembleDebug                    # app/build/outputs/apk/debug/app-debug.apk
  ./gradlew assembleRelease bundleRelease    # release APK + AAB (see signing below)
  ./gradlew installDebug                     # install on a connected device / emulator
  ```

`npm run android:build` runs build + sync + `assembleRelease` in one go.

Run `npx cap sync android` again after every web build; the web assets in
`android/app/src/main/assets/public/` and `android/capacitor-cordova-android-plugins/` are generated
and git-ignored.

## Continuous integration and releases

`.github/workflows/android.yml` runs on every push (any branch), on pull requests, on `v*` tags and
manually (`workflow_dispatch`). Documentation-only changes do not trigger it. Steps:

1. `npm ci`, `npm run typecheck`, `npm test`, `npm run build` (all required to pass).
2. JDK 21 (Temurin), Gradle cache, Android SDK (`android-actions/setup-android@v3`).
3. `npx cap sync android`.
4. Decode the release keystore from secrets, if configured.
5. `./gradlew assembleRelease bundleRelease`.
6. Upload `QuillPen-<version>.apk` and `QuillPen-<version>.aab` as workflow artifacts
   (Actions run page -> *Artifacts*).

Publishing:

- **Tagged release:** bump `version` in `package.json`, commit, then
  `git tag v0.1.0 && git push origin v0.1.0`. The workflow creates a GitHub Release named after the tag
  with the APK, AAB and `SHA256SUMS.txt` attached (tags containing `-`, e.g. `v0.2.0-beta.1`, are marked
  prerelease). The workflow warns if the tag does not match `package.json`.
- **Prerelease from any branch, without tagging:** Actions -> *Android* -> *Run workflow*, choose the
  branch, tick **prerelease**. This publishes a GitHub prerelease called
  `Anne's Pen <version> (build <run number>)` under the tag `v<version>-build.<run number>` pointing at
  that commit.

## Signing

`android/app/build.gradle` reads these environment variables:

| Variable | Meaning |
| --- | --- |
| `ANDROID_KEYSTORE_PATH` | Absolute path to the `.jks` keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore (store) password |
| `ANDROID_KEY_ALIAS` | Key alias inside the keystore |
| `ANDROID_KEY_PASSWORD` | Key password (defaults to the store password if empty) |

If `ANDROID_KEYSTORE_PATH` is not set (or the file does not exist) the **release build is signed with
the Android debug key**. That APK installs fine for sideloading and testing, but:

- Google Play rejects debug-signed bundles - you need a real upload key for the store.
- Debug keys differ between machines/runners, so a debug-signed build cannot be installed *over* a build
  signed with a different key (uninstall first). Configure a real key once you share builds with others.

### Create a keystore (once)

```bash
keytool -genkeypair -v \
  -keystore quillpen-release.jks \
  -alias quillpen \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Anne's Pen, O=Anne's Pen, C=US"
```

Keep the `.jks` file and its passwords somewhere safe and **never commit it** (`*.jks` and `*.keystore`
are git-ignored). If you lose it you can no longer publish updates under the same signature.

### Add it to GitHub

```bash
base64 -w 0 quillpen-release.jks > quillpen-release.jks.b64   # macOS: base64 -i quillpen-release.jks
```

Repository -> *Settings* -> *Secrets and variables* -> *Actions* -> *New repository secret*:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | contents of `quillpen-release.jks.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the store password |
| `ANDROID_KEY_ALIAS` | `quillpen` (or the alias you chose) |
| `ANDROID_KEY_PASSWORD` | the key password |

The workflow decodes the keystore to `$RUNNER_TEMP` and exports `ANDROID_KEYSTORE_PATH`; release
outputs are then properly signed. For Google Play, enroll in Play App Signing and use this key as the
upload key.

Signing locally works the same way:

```bash
export ANDROID_KEYSTORE_PATH=$PWD/quillpen-release.jks ANDROID_KEYSTORE_PASSWORD=... \
       ANDROID_KEY_ALIAS=quillpen ANDROID_KEY_PASSWORD=...
cd android && ./gradlew assembleRelease bundleRelease
```

## Install (sideload) the APK

1. Download `QuillPen-<version>.apk` from a GitHub Release (or a workflow run's artifacts - those are
   zipped, unzip first).
2. On the phone, open the APK from the browser or file manager. Android asks to allow installing apps
   from that source (*Settings -> Apps -> Special app access -> Install unknown apps*); allow it.
3. Or from a computer with USB debugging: `adb install -r QuillPen-<version>.apk`.

If the installer says the package conflicts with an existing one, the installed copy was signed with a
different key - uninstall it first (this deletes app data).

The `.aab` is for Google Play only; it cannot be installed directly.

## What the Android app integrates with

- **Open / Save As** use the system document picker (Storage Access Framework), so files in Drive,
  Dropbox, SD cards, etc. work and no storage permission is needed. Ctrl+S writes back to the same
  document via a persisted URI permission.
- **Open with Anne's Pen** for `.docx`, `.odt`, `.rtf`, `.md`, `.txt`, `.html`, `.epub` and `.qpd`
  (`ACTION_VIEW`), and **Share to Anne's Pen** (`ACTION_SEND`, files or plain text).
- **Print** goes through Android's print service, which also offers *Save as PDF*.
- **Share** sends the exported file to any app via the share sheet.
- The activity is `singleTask`, so opening another file while Anne's Pen runs delivers it to the running
  instance (`fileOpened` event).

## Native plugin API (`QuillNative`)

Implemented in `android/app/src/main/java/io/github/socrtwo/quillpen/QuillNativePlugin.java`,
registered in `MainActivity`, consumed by `src/platform/native.ts`. All file contents cross the bridge as
base64 strings (no line breaks); `data:` URL prefixes are tolerated on input.

| Method | Arguments | Resolves with |
| --- | --- | --- |
| `openDocument` | `{ mimeTypes: string[] }` | `{ uri, name, mime, data }` or `{ canceled: true }` |
| `saveAs` | `{ name, mime, data }` | `{ uri, name }` or `{ canceled: true }` |
| `writeUri` | `{ uri, data }` | `{ ok: true }` (rejects with a message on failure) |
| `readUri` | `{ uri }` | `{ uri, name, mime, data }` |
| `print` | `{ jobName }` | nothing (print dialog shown) |
| `share` | `{ name, mime, data, title? }` | nothing (share sheet shown) |
| `getLaunchFile` | - | `{ uri, name, mime, data }`, or `{}` if the app was not opened with a file. Consumed once. Text shared without a file arrives as `{ name: "….txt", mime: "text/plain", data }` with no `uri`. |
| `keepAwake` | `{ on: boolean }` | nothing |
| event `fileOpened` | - | same payload as `getLaunchFile`, for files opened/shared while the app is running (kept until a listener subscribes) |

Notes:

- `openDocument` and `saveAs` take a persistable read/write permission when the provider allows it, so
  the returned `uri` keeps working for `writeUri` / `readUri` after restarts. URIs from "Open with" may
  be read-only or temporary; if `writeUri` rejects, fall back to `saveAs`.
- Writes use mode `"wt"` (truncate), falling back to `"w"` for providers that do not support it.
- File I/O runs on a background thread; very large documents are limited by memory because they are
  passed to the WebView as one base64 string.

## App icon

The launcher icon is the Anne's Office suite's word-processor icon (a white page with blue lines and a white quill on a
blue tile, background `#2A57B8`). Its sources are `resources/icon.svg` (full tile), `resources/icon-foreground.svg`
(adaptive-icon foreground) and `resources/icon-background.txt` (adaptive background colour), copied from the
suite's icon set. `npm run icons` (`scripts/gen-android-icons.mjs`, then `scripts/gen-platform-icons.mjs`) writes:

- `res/drawable/ic_launcher_foreground.xml`, a vector converted from the foreground SVG
- `res/values/ic_launcher_background.xml`, the background (and launch-screen) colour
- `res/mipmap-anydpi-v26/ic_launcher{,_round}.xml`, the adaptive icon
- `res/mipmap-*/ic_launcher_monochrome.png`, the themed-icon silhouette (Android 13+)
- legacy PNGs `res/mipmap-*/ic_launcher{,_round}.png` (Android 7.x) and `resources/icon-512.png`
- `resources/icon-1024.png` (desktop installers), `public/icons/*` (web app, including a maskable icon),
  the iOS `AppIcon` (opaque, square corners) and `public/favicon.svg`

Replace the three source files and re-run `npm run icons`; do not hand-edit the generated files. The launch
screen (`res/drawable/splash.xml`) shows the same foreground on the background colour.
