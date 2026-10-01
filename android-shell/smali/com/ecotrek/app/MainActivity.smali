.class public Lcom/ecotrek/app/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"


# instance fields
.field public fileCallback:Landroid/webkit/ValueCallback;

.field public geoCallback:Landroid/webkit/GeolocationPermissions$Callback;

.field public geoOrigin:Ljava/lang/String;

.field public webView:Landroid/webkit/WebView;


# direct methods
.method public constructor <init>()V
    .locals 0

    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method


# virtual methods
.method protected onActivityResult(IILandroid/content/Intent;)V
    .locals 3

    const/16 v0, 0x34

    if-eq p1, v0, :cond_0

    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V

    return-void

    :cond_0
    iget-object v0, p0, Lcom/ecotrek/app/MainActivity;->fileCallback:Landroid/webkit/ValueCallback;

    if-eqz v0, :cond_1

    invoke-static {p2, p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->parseResult(ILandroid/content/Intent;)[Landroid/net/Uri;

    move-result-object v1

    invoke-interface {v0, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V

    const/4 v2, 0x0

    iput-object v2, p0, Lcom/ecotrek/app/MainActivity;->fileCallback:Landroid/webkit/ValueCallback;

    :cond_1
    return-void
.end method

.method public onBackPressed()V
    .locals 2

    iget-object v0, p0, Lcom/ecotrek/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-eqz v0, :cond_0

    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z

    move-result v1

    if-eqz v1, :cond_0

    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V

    return-void

    :cond_0
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V

    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 4

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    invoke-virtual {p0}, Lcom/ecotrek/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    const v1, -0xf2c2d3

    invoke-virtual {v0, v1}, Landroid/view/Window;->setStatusBarColor(I)V

    new-instance v0, Landroid/webkit/WebView;

    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    iput-object v0, p0, Lcom/ecotrek/app/MainActivity;->webView:Landroid/webkit/WebView;

    const v1, -0x140810

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object v1

    const/4 v2, 0x1

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    const/4 v2, 0x1

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    const/4 v2, 0x1

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDatabaseEnabled(Z)V

    const/4 v2, 0x1

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setGeolocationEnabled(Z)V

    const/4 v2, 0x0

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V

    const/16 v2, 0x64

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setTextZoom(I)V

    const/4 v2, 0x1

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setUseWideViewPort(Z)V

    const/4 v2, 0x1

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setLoadWithOverviewMode(Z)V

    const/4 v2, 0x0

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setSupportZoom(Z)V

    const/4 v2, 0x0

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setBuiltInZoomControls(Z)V

    const/4 v2, 0x0

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V

    const/4 v2, 0x0

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowContentAccess(Z)V

    new-instance v2, Lcom/ecotrek/app/AppWebViewClient;

    invoke-direct {v2, p0}, Lcom/ecotrek/app/AppWebViewClient;-><init>(Lcom/ecotrek/app/MainActivity;)V

    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    new-instance v3, Lcom/ecotrek/app/AppChromeClient;

    invoke-direct {v3, p0}, Lcom/ecotrek/app/AppChromeClient;-><init>(Lcom/ecotrek/app/MainActivity;)V

    invoke-virtual {v0, v3}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    const-string v2, "https://appassets.ecotrek.app/index.html"

    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    invoke-virtual {p0, v0}, Lcom/ecotrek/app/MainActivity;->setContentView(Landroid/view/View;)V

    return-void
.end method

.method public onRequestPermissionsResult(I[Ljava/lang/String;[I)V
    .locals 4

    const/16 v0, 0x33

    if-eq p1, v0, :cond_0

    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onRequestPermissionsResult(I[Ljava/lang/String;[I)V

    return-void

    :cond_0
    const/4 v0, 0x0

    array-length v1, p3

    if-lez v1, :cond_1

    const/4 v2, 0x0

    aget v2, p3, v2

    if-nez v2, :cond_1

    const/4 v0, 0x1

    :cond_1
    iget-object v1, p0, Lcom/ecotrek/app/MainActivity;->geoCallback:Landroid/webkit/GeolocationPermissions$Callback;

    if-eqz v1, :cond_2

    iget-object v2, p0, Lcom/ecotrek/app/MainActivity;->geoOrigin:Ljava/lang/String;

    const/4 v3, 0x0

    invoke-interface {v1, v2, v0, v3}, Landroid/webkit/GeolocationPermissions$Callback;->invoke(Ljava/lang/String;ZZ)V

    const/4 v1, 0x0

    iput-object v1, p0, Lcom/ecotrek/app/MainActivity;->geoCallback:Landroid/webkit/GeolocationPermissions$Callback;

    iput-object v1, p0, Lcom/ecotrek/app/MainActivity;->geoOrigin:Ljava/lang/String;

    :cond_2
    return-void
.end method
