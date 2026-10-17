"""Source/bytecode contract for the simplified Android shell.

This checks that there is no leftover user-facing chat authentication popup;
it is not a substitute for testing the APK on an Android device.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
JAVA = ROOT / 'java/com/ecotrek/app'
SMALI = ROOT / 'smali/com/ecotrek/app'


class NoChatPopupTests(unittest.TestCase):
    def test_shell_does_not_register_multiple_windows_or_auth_popup(self):
        for source in [
            JAVA / 'AppChromeClient.java',
            SMALI / 'AppChromeClient.smali',
            JAVA / 'MainActivity.java',
            SMALI / 'MainActivity.smali',
        ]:
            content = source.read_text()
            self.assertNotIn('onCreateWindow', content, source.name)
            self.assertNotIn('AuthPopup', content, source.name)
            self.assertNotIn('setSupportMultipleWindows', content, source.name)

        for name in ('AuthPopup.java', 'AuthPopupChromeClient.java'):
            self.assertFalse((JAVA / name).exists(), name)
        for name in ('AuthPopup.smali', 'AuthPopupChromeClient.smali'):
            self.assertFalse((SMALI / name).exists(), name)

    def test_web_chrome_client_keeps_only_location_and_photo_bridges(self):
        java = (JAVA / 'AppChromeClient.java').read_text()
        smali = (SMALI / 'AppChromeClient.smali').read_text()
        self.assertIn('onGeolocationPermissionsShowPrompt', java)
        self.assertIn('onShowFileChooser', java)
        self.assertIn('onGeolocationPermissionsShowPrompt', smali)
        self.assertIn('onShowFileChooser', smali)


if __name__ == '__main__':
    unittest.main()
