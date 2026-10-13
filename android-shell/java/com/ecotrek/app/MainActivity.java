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
 * The APK ships the equivalent smali implementation. This source is kept in
 * sync by hand for review. The shell hosts the Expo web export on a virtual
 * HTTPS origin so location, fetch, and local storage work inside WebView.
 */
public class MainActivity extends Activity {
    public static final String HOST = "appassets.ecotrek.app";
    public static final String APP_URL = "https://" + HOST + "/index.html";

    static final int REQ_LOCATION = 51;
    static final int REQ_FILE = 52;

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
        s.setTextZoom(100);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        wv.setWebViewClient(new AppWebViewClient(this));
        wv.setWebChromeClient(new AppChromeClient(this));
        wv.loadUrl(APP_URL);
        setContentView(wv);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // WebView can cache a per-origin denial. Clear it when returning from
        // Android Settings so the next explicit location request can recover.
        GeolocationPermissions.getInstance().clear("https://" + HOST);
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(
                "(function(){var b=window.__ecotrekAndroidBack;" +
                "if(typeof b==='function')return b()?'handled':'unhandled';" +
                "return 'missing';})()",
                new BackCallback(this));
    }

    /** Waits for React Navigation before deciding whether Android should exit. */
    public static final class BackCallback implements ValueCallback<String> {
        private final MainActivity activity;

        BackCallback(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public void onReceiveValue(String value) {
            if ("\"handled\"".equals(value)) return;
            if ("\"unhandled\"".equals(value)) {
                activity.finish();
                return;
            }
            if (activity.webView != null && activity.webView.canGoBack()) {
                activity.webView.goBack();
            } else {
                activity.finish();
            }
        }
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
