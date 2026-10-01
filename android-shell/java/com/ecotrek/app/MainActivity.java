package com.ecotrek.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * EcoTrek Android shell — reference source.
 *
 * NOTE: the file that actually ships is `smali/com/ecotrek/app/MainActivity.smali`
 * (assembled by apktool). This .java file is kept in sync by hand as readable
 * documentation of exactly what the smali does.
 *
 * The shell hosts the Expo web export from `assets/` on a virtual HTTPS
 * origin (https://appassets.ecotrek.app) via AppWebViewClient. That is the
 * fix for the old shell, which loaded file:///android_asset/index.html and
 * therefore broke:
 *   - every fetch() to Open-Meteo / Overpass / Nominatim (file:// CORS)   → trail
 *     search, weather and AI answers all failed;
 *   - geolocation (file:// is not a secure context);
 *   - localStorage persistence guarantees.
 *
 * It also fixes the "stretched / shifted" rendering by locking textZoom to
 * 100 (disables Android font boosting) and enabling standard viewport
 * behaviour to match Chrome.
 */
public class MainActivity extends Activity {
    public static final String HOST = "appassets.ecotrek.app";
    public static final String APP_URL = "https://" + HOST + "/index.html";

    static final int REQ_LOCATION = 51; // 0x33
    static final int REQ_FILE = 52;     // 0x34

    public WebView webView;
    public GeolocationPermissions.Callback geoCallback;
    public String geoOrigin;
    public ValueCallback<android.net.Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xFF0D3D2D);

        WebView wv = new WebView(this);
        webView = wv;
        wv.setBackgroundColor(0xFFEBF7F0);

        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);              // no font boosting — fixes "stretched" text
        s.setUseWideViewPort(true);      // honour the <meta name="viewport"> tag
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccess(false);     // everything is served via the interceptor
        s.setAllowContentAccess(false);

        wv.setWebViewClient(new AppWebViewClient(this));
        wv.setWebChromeClient(new AppChromeClient(this));
        wv.loadUrl(APP_URL);
        setContentView(wv);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] grants) {
        if (code != REQ_LOCATION) {
            super.onRequestPermissionsResult(code, perms, grants);
            return;
        }
        boolean ok = grants.length > 0 && grants[0] == 0;
        if (geoCallback != null) {
            geoCallback.invoke(geoOrigin, ok, false);
            geoCallback = null;
            geoOrigin = null;
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req != REQ_FILE) {
            super.onActivityResult(req, res, data);
            return;
        }
        if (fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCallback = null;
        }
    }
}
