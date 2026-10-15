package com.ecotrek.app;

import android.app.Dialog;
import android.content.Context;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * A temporary auth window that preserves window.opener/postMessage. Opening
 * Puter in an unrelated browser loses that channel and can never sign the
 * app in. This window gets no app asset interceptor or JavaScript bridge.
 * Reference source for smali/com/ecotrek/app/AuthPopup.smali.
 */
public class AuthPopup extends Dialog {
    public WebView webView;

    public AuthPopup(Context context) {
        super(context);
        setTitle("Connect Grok with Puter");
        webView = new WebView(context);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new AuthPopupChromeClient(this));
        setContentView(webView);
    }

    @Override
    public void dismiss() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.dismiss();
    }
}
