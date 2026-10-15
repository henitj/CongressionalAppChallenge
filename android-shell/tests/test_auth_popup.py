"""Source/bytecode contract for the user-gesture-only auth popup bridge.

This is not a device sign-in test. The final APK still needs a physical WebView
smoke test with a real Puter account.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
JAVA = ROOT / 'java/com/ecotrek/app'
SMALI = ROOT / 'smali/com/ecotrek/app'


class AuthPopupTests(unittest.TestCase):
    def test_child_window_transport_and_user_gesture_are_both_required(self):
        java = (JAVA / 'AppChromeClient.java').read_text()
        smali = (SMALI / 'AppChromeClient.smali').read_text()
        self.assertIn('!isUserGesture', java)
        self.assertIn('if-eqz p3, :blocked', smali)
        self.assertIn('WebView.WebViewTransport', java)
        self.assertIn('WebView$WebViewTransport;->setWebView', smali)
        self.assertIn('resultMsg.sendToTarget()', java)
        self.assertIn('Landroid/os/Message;->sendToTarget()', smali)
        for source in [JAVA / 'MainActivity.java', SMALI / 'MainActivity.smali']:
            self.assertIn('setSupportMultipleWindows', source.read_text())

    def test_popup_has_no_app_bridge_or_local_file_access(self):
        java = (JAVA / 'AuthPopup.java').read_text()
        smali = (SMALI / 'AuthPopup.smali').read_text()
        self.assertIn('setAllowFileAccess(false)', java)
        self.assertIn('setAllowContentAccess(false)', java)
        self.assertIn('MIXED_CONTENT_NEVER_ALLOW', java)
        self.assertNotIn('addJavascriptInterface', java)
        self.assertNotIn('AppWebViewClient', java)
        self.assertIn('WebView;->destroy()', smali)
        self.assertIn('AuthPopup;->dismiss()', (SMALI / 'AuthPopupChromeClient.smali').read_text())


if __name__ == '__main__':
    unittest.main()
