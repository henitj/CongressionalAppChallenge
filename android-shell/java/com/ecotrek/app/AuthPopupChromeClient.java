package com.ecotrek.app;

import android.webkit.WebChromeClient;
import android.webkit.WebView;

/** Close the auth dialog when Puter calls window.close(). */
public class AuthPopupChromeClient extends WebChromeClient {
    private final AuthPopup popup;

    public AuthPopupChromeClient(AuthPopup popup) {
        this.popup = popup;
    }

    @Override
    public void onCloseWindow(WebView window) {
        popup.dismiss();
    }
}
