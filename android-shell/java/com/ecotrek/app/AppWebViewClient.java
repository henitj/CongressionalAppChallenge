package com.ecotrek.app;

import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

/**
 * Serves the bundled Expo web export from assets/ on the virtual secure
 * origin https://appassets.ecotrek.app. Reference source for
 * `smali/com/ecotrek/app/AppWebViewClient.smali` — see MainActivity.java for
 * why the shell works this way.
 */
public class AppWebViewClient extends WebViewClient {
    private MainActivity act;

    public AppWebViewClient(MainActivity a) {
        act = a;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        String host = uri.getHost();
        if (host == null || !host.equals(MainActivity.HOST)) {
            return null; // real network request (Overpass, Open-Meteo, the user's AI…)
        }
        String path = uri.getPath();
        if (path == null || path.length() == 0 || path.equals("/")) {
            path = "/index.html";
        }
        String asset = path.substring(1);
        try {
            InputStream in = act.getAssets().open(asset);
            return new WebResourceResponse(mime(asset), "utf-8", in);
        } catch (Exception e) {
            // SPA fallback: extension-less deep links get index.html.
            if (asset.indexOf('.') < 0) {
                try {
                    InputStream in2 = act.getAssets().open("index.html");
                    return new WebResourceResponse("text/html", "utf-8", in2);
                } catch (Exception ignored) {
                }
            }
            return new WebResourceResponse(
                    "text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
        }
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        String host = uri.getHost();
        if (host != null && host.equals(MainActivity.HOST)) {
            return false; // stay inside the app
        }
        try {
            act.startActivity(new Intent("android.intent.action.VIEW", uri));
        } catch (Exception ignored) {
        }
        return true;
    }

    private static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg")) return "image/jpeg";
        if (p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".gif")) return "image/gif";
        if (p.endsWith(".wasm")) return "application/wasm";
        return "application/octet-stream";
    }
}
