.class public Lcom/ecotrek/app/AuthPopupChromeClient;
.super Landroid/webkit/WebChromeClient;
.source "AuthPopupChromeClient.java"

.field private final popup:Lcom/ecotrek/app/AuthPopup;

.method public constructor <init>(Lcom/ecotrek/app/AuthPopup;)V
    .locals 0
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    iput-object p1, p0, Lcom/ecotrek/app/AuthPopupChromeClient;->popup:Lcom/ecotrek/app/AuthPopup;
    return-void
.end method

.method public onCloseWindow(Landroid/webkit/WebView;)V
    .locals 1
    iget-object v0, p0, Lcom/ecotrek/app/AuthPopupChromeClient;->popup:Lcom/ecotrek/app/AuthPopup;
    invoke-virtual {v0}, Lcom/ecotrek/app/AuthPopup;->dismiss()V
    return-void
.end method
