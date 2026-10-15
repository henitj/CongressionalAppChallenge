.class public Lcom/ecotrek/app/AuthPopup;
.super Landroid/app/Dialog;
.source "AuthPopup.java"

.field public webView:Landroid/webkit/WebView;

.method public constructor <init>(Landroid/content/Context;)V
    .locals 3
    invoke-direct {p0, p1}, Landroid/app/Dialog;-><init>(Landroid/content/Context;)V
    const-string v0, "Connect Grok with Puter"
    invoke-virtual {p0, v0}, Landroid/app/Dialog;->setTitle(Ljava/lang/CharSequence;)V
    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p1}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lcom/ecotrek/app/AuthPopup;->webView:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1
    const/4 v2, 0x1
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowContentAccess(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setSupportMultipleWindows(Z)V
    const/4 v2, 0x1
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMixedContentMode(I)V
    new-instance v1, Landroid/webkit/WebViewClient;
    invoke-direct {v1}, Landroid/webkit/WebViewClient;-><init>()V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V
    new-instance v1, Lcom/ecotrek/app/AuthPopupChromeClient;
    invoke-direct {v1, p0}, Lcom/ecotrek/app/AuthPopupChromeClient;-><init>(Lcom/ecotrek/app/AuthPopup;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V
    invoke-virtual {p0, v0}, Landroid/app/Dialog;->setContentView(Landroid/view/View;)V
    return-void
.end method

.method public dismiss()V
    .locals 2
    iget-object v0, p0, Lcom/ecotrek/app/AuthPopup;->webView:Landroid/webkit/WebView;
    if-eqz v0, :done
    invoke-virtual {v0}, Landroid/webkit/WebView;->stopLoading()V
    invoke-virtual {v0}, Landroid/webkit/WebView;->destroy()V
    const/4 v1, 0x0
    iput-object v1, p0, Lcom/ecotrek/app/AuthPopup;->webView:Landroid/webkit/WebView;
    :done
    invoke-super {p0}, Landroid/app/Dialog;->dismiss()V
    return-void
.end method
