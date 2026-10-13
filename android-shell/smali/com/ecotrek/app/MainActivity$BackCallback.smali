.class public final Lcom/ecotrek/app/MainActivity$BackCallback;
.super Ljava/lang/Object;
.implements Landroid/webkit/ValueCallback;
.source "MainActivity.java"

.field private final activity:Lcom/ecotrek/app/MainActivity;


.method public constructor <init>(Lcom/ecotrek/app/MainActivity;)V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ecotrek/app/MainActivity$BackCallback;->activity:Lcom/ecotrek/app/MainActivity;

    return-void
.end method


.method public onReceiveValue(Ljava/lang/Object;)V
    .locals 3

    const-string v0, "\"handled\""

    invoke-virtual {v0, p1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :return

    iget-object v0, p0, Lcom/ecotrek/app/MainActivity$BackCallback;->activity:Lcom/ecotrek/app/MainActivity;

    const-string v1, "\"unhandled\""

    invoke-virtual {v1, p1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :fallback

    invoke-virtual {v0}, Landroid/app/Activity;->finish()V

    return-void

    :fallback
    iget-object v1, v0, Lcom/ecotrek/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-eqz v1, :finish

    invoke-virtual {v1}, Landroid/webkit/WebView;->canGoBack()Z

    move-result v2

    if-eqz v2, :finish

    invoke-virtual {v1}, Landroid/webkit/WebView;->goBack()V

    return-void

    :finish
    invoke-virtual {v0}, Landroid/app/Activity;->finish()V

    :return
    return-void
.end method
