package com.ecotrek.app;

import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

/**
 * Bridges web geolocation to the Android runtime permission dialog, and the
 * web <input type="file"> (profile photo) to the system picker. Reference
 * source for `smali/com/ecotrek/app/AppChromeClient.smali`.
 */
public class AppChromeClient extends WebChromeClient {
    private MainActivity act;

    public AppChromeClient(MainActivity a) {
        act = a;
    }

    @Override
    public void onGeolocationPermissionsShowPrompt(
            String origin, GeolocationPermissions.Callback callback) {
        if (act.checkSelfPermission("android.permission.ACCESS_FINE_LOCATION") == 0) {
            callback.invoke(origin, true, false);
            return;
        }
        act.geoCallback = callback;
        act.geoOrigin = origin;
        act.requestPermissions(
                new String[] {
                    "android.permission.ACCESS_FINE_LOCATION",
                    "android.permission.ACCESS_COARSE_LOCATION"
                },
                MainActivity.REQ_LOCATION);
    }

    @Override
    public boolean onShowFileChooser(
            WebView wv, ValueCallback<android.net.Uri[]> cb, FileChooserParams params) {
        if (act.fileCallback != null) {
            act.fileCallback.onReceiveValue(null);
        }
        act.fileCallback = cb;
        try {
            act.startActivityForResult(params.createIntent(), MainActivity.REQ_FILE);
        } catch (Exception e) {
            act.fileCallback = null;
            return false;
        }
        return true;
    }
}
