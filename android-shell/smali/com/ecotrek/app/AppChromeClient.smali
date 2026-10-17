.class public Lcom/ecotrek/app/AppChromeClient;
.super Landroid/webkit/WebChromeClient;
.source "AppChromeClient.java"


# instance fields
.field private act:Lcom/ecotrek/app/MainActivity;


# direct methods
.method public constructor <init>(Lcom/ecotrek/app/MainActivity;)V
    .locals 0

    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V

    iput-object p1, p0, Lcom/ecotrek/app/AppChromeClient;->act:Lcom/ecotrek/app/MainActivity;

    return-void
.end method


# virtual methods
.method public onGeolocationPermissionsShowPrompt(Ljava/lang/String;Landroid/webkit/GeolocationPermissions$Callback;)V
    .locals 5

    iget-object v0, p0, Lcom/ecotrek/app/AppChromeClient;->act:Lcom/ecotrek/app/MainActivity;

    const-string v1, "android.permission.ACCESS_FINE_LOCATION"

    invoke-virtual {v0, v1}, Lcom/ecotrek/app/MainActivity;->checkSelfPermission(Ljava/lang/String;)I

    move-result v2

    if-nez v2, :cond_ask

    const/4 v3, 0x1

    const/4 v4, 0x0

    invoke-interface {p2, p1, v3, v4}, Landroid/webkit/GeolocationPermissions$Callback;->invoke(Ljava/lang/String;ZZ)V

    return-void

    :cond_ask
    iput-object p2, v0, Lcom/ecotrek/app/MainActivity;->geoCallback:Landroid/webkit/GeolocationPermissions$Callback;

    iput-object p1, v0, Lcom/ecotrek/app/MainActivity;->geoOrigin:Ljava/lang/String;

    const/4 v2, 0x2

    new-array v3, v2, [Ljava/lang/String;

    const/4 v2, 0x0

    aput-object v1, v3, v2

    const-string v1, "android.permission.ACCESS_COARSE_LOCATION"

    const/4 v2, 0x1

    aput-object v1, v3, v2

    const/16 v2, 0x33

    invoke-virtual {v0, v3, v2}, Lcom/ecotrek/app/MainActivity;->requestPermissions([Ljava/lang/String;I)V

    return-void
.end method

.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .locals 4

    iget-object v0, p0, Lcom/ecotrek/app/AppChromeClient;->act:Lcom/ecotrek/app/MainActivity;

    iget-object v1, v0, Lcom/ecotrek/app/MainActivity;->fileCallback:Landroid/webkit/ValueCallback;

    if-eqz v1, :cond_store

    const/4 v2, 0x0

    invoke-interface {v1, v2}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V

    :cond_store
    iput-object p2, v0, Lcom/ecotrek/app/MainActivity;->fileCallback:Landroid/webkit/ValueCallback;

    :try_start_0
    invoke-virtual {p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->createIntent()Landroid/content/Intent;

    move-result-object v1

    const/16 v2, 0x34

    invoke-virtual {v0, v1, v2}, Lcom/ecotrek/app/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    const/4 v3, 0x1

    return v3

    :catch_0
    move-exception v1

    const/4 v2, 0x0

    iput-object v2, v0, Lcom/ecotrek/app/MainActivity;->fileCallback:Landroid/webkit/ValueCallback;

    const/4 v3, 0x0

    return v3
.end method
