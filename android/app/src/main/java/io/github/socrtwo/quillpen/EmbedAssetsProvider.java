package io.github.socrtwo.quillpen;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.util.Log;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Serves the app's built web files (the Capacitor "public" asset folder, i.e. dist/) read-only to other apps,
 * so Anne's Post can run this editor inside its own window (docs/EMBED.md):
 *
 *   content://io.github.socrtwo.quillpen.embed/index.html  ->  assets/public/index.html
 *
 * Only files under assets/public/ are reachable: paths with "..", "." or empty segments, backslashes or NUL
 * characters are refused. Writes are refused. The authority is the application id plus ".embed".
 */
public class EmbedAssetsProvider extends ContentProvider {

    public static final String AUTHORITY = BuildConfig.APPLICATION_ID + ".embed";
    private static final String ROOT = "public";
    private static final String TAG = "EmbedAssetsProvider";

    private static final Map<String, String> MIME = new HashMap<>();

    static {
        MIME.put("html", "text/html");
        MIME.put("htm", "text/html");
        MIME.put("js", "text/javascript");
        MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json");
        MIME.put("map", "application/json");
        MIME.put("webmanifest", "application/manifest+json");
        MIME.put("txt", "text/plain");
        MIME.put("xml", "application/xml");
        MIME.put("svg", "image/svg+xml");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg");
        MIME.put("gif", "image/gif");
        MIME.put("webp", "image/webp");
        MIME.put("ico", "image/x-icon");
        MIME.put("woff2", "font/woff2");
        MIME.put("woff", "font/woff");
        MIME.put("ttf", "font/ttf");
        MIME.put("otf", "font/otf");
        MIME.put("wasm", "application/wasm");
        MIME.put("aff", "text/plain");
        MIME.put("dic", "text/plain");
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    /** MIME type for a file name, from its extension (application/octet-stream when unknown). */
    static String mimeFor(String path) {
        int slash = path.lastIndexOf('/');
        int dot = path.lastIndexOf('.');
        if (dot <= slash || dot == path.length() - 1) return "application/octet-stream";
        String t = MIME.get(path.substring(dot + 1).toLowerCase(Locale.ROOT));
        return t != null ? t : "application/octet-stream";
    }

    /**
     * The asset path for a request path ("/index.html" -> "public/index.html", "/" -> "public/index.html"),
     * or null when the path tries to leave the web folder or is malformed.
     */
    static String assetPath(String path) {
        if (path == null) path = "";
        if (path.indexOf('\\') >= 0 || path.indexOf('\0') >= 0) return null;
        while (path.startsWith("/")) path = path.substring(1);
        if (path.isEmpty()) path = "index.html";
        if (path.endsWith("/")) path = path + "index.html";
        for (String seg : path.split("/", -1)) {
            if (seg.isEmpty() || seg.equals(".") || seg.equals("..")) return null;
        }
        return ROOT + "/" + path;
    }

    private String assetFor(Uri uri) throws FileNotFoundException {
        if (uri == null || !AUTHORITY.equals(uri.getAuthority())) throw new FileNotFoundException("Unknown URI");
        String asset = assetPath(uri.getPath()); // getPath() is already percent-decoded, so %2e%2e is caught too
        if (asset == null) throw new FileNotFoundException("Path not allowed: " + uri.getPath());
        return asset;
    }

    @Override
    public String getType(Uri uri) {
        String p = uri == null ? null : assetPath(uri.getPath());
        return p == null ? null : mimeFor(p);
    }

    @Override
    public AssetFileDescriptor openAssetFile(Uri uri, String mode) throws FileNotFoundException {
        if (mode == null || !mode.equals("r")) throw new SecurityException("Read-only provider");
        String asset = assetFor(uri);
        AssetManager am = getContext().getAssets();
        // Uncompressed assets can be handed out directly (seekable, with a length).
        try {
            return am.openFd(asset);
        } catch (IOException compressedOrMissing) {
            // Compressed assets (most text files) are streamed through a pipe.
        }
        final InputStream in;
        try {
            in = am.open(asset, AssetManager.ACCESS_STREAMING);
        } catch (IOException e) {
            throw new FileNotFoundException("No such file: " + asset);
        }
        try {
            ParcelFileDescriptor[] pipe = ParcelFileDescriptor.createPipe();
            final ParcelFileDescriptor writeEnd = pipe[1];
            Thread copier = new Thread(() -> {
                try (InputStream src = in; OutputStream out = new ParcelFileDescriptor.AutoCloseOutputStream(writeEnd)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = src.read(buf)) > 0) out.write(buf, 0, n);
                } catch (IOException e) {
                    // The reader went away (closed early); nothing to clean up beyond the streams.
                    Log.d(TAG, "copy ended: " + e.getMessage());
                }
            }, "embed-asset");
            copier.setDaemon(true);
            copier.start();
            return new AssetFileDescriptor(pipe[0], 0, AssetFileDescriptor.UNKNOWN_LENGTH);
        } catch (IOException e) {
            try { in.close(); } catch (IOException ignored) { /* nothing more to do */ }
            throw new FileNotFoundException("Cannot open " + asset + ": " + e.getMessage());
        }
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        String asset;
        try {
            asset = assetFor(uri);
        } catch (FileNotFoundException e) {
            return null;
        }
        long size = -1;
        try (AssetFileDescriptor fd = getContext().getAssets().openFd(asset)) {
            size = fd.getLength();
        } catch (IOException compressedOrMissing) {
            try (InputStream ignored = getContext().getAssets().open(asset)) {
                size = -1; // exists, length unknown without reading it
            } catch (IOException missing) {
                return null;
            }
        }
        String[] cols = projection != null ? projection : new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE };
        MatrixCursor c = new MatrixCursor(cols, 1);
        Object[] row = new Object[cols.length];
        for (int i = 0; i < cols.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(cols[i])) row[i] = asset.substring(asset.lastIndexOf('/') + 1);
            else if (OpenableColumns.SIZE.equals(cols[i])) row[i] = size >= 0 ? size : null;
        }
        c.addRow(row);
        return c;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("Read-only provider");
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("Read-only provider");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("Read-only provider");
    }
}
