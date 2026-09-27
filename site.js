(() => {
  const config = window.ECOTREK_CONFIG || {};
  const usePlayStore = config.installMode === 'play' && Boolean(config.playStoreUrl);
  const installUrl = usePlayStore ? config.playStoreUrl : (config.apkUrl || '/downloads/ecotrek.apk');
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const buttons = document.querySelectorAll('#download-button, #download-button-bottom');
  const note = document.querySelector('#download-note');
  const helper = document.querySelector('#install-helper');
  const year = document.querySelector('#current-year');

  buttons.forEach((button) => {
    button.setAttribute('href', installUrl);
    if (usePlayStore) {
      button.removeAttribute('download');
      const title = button.querySelector('.button-label strong');
      const subtitle = button.querySelector('.button-label small');
      if (title) title.textContent = 'Get it on Google Play';
      if (subtitle) subtitle.textContent = 'Official store listing';
    } else {
      button.setAttribute('download', 'EcoTrek.apk');
    }
    button.addEventListener('click', () => {
      if (usePlayStore) return;
      if (isAppleMobile) {
        if (note) {
          note.textContent = 'This download is an Android APK. iPhone needs an App Store or TestFlight build; the APK cannot be installed on iOS.';
          note.classList.add('is-warning');
        }
        return;
      }

      if (note) {
        note.textContent = isAndroid
          ? 'Your download should begin now. When it finishes, open EcoTrek.apk and tap Install.'
          : 'The Android APK download is ready. Open this page on an Android phone to install EcoTrek.';
        note.classList.remove('is-warning');
      }
      if (helper && isAndroid) {
        helper.textContent = 'When the download finishes, open EcoTrek.apk and tap Install. Android may ask you to allow installs from this browser once.';
      }
    });
  });

  if (!usePlayStore && note && installUrl.startsWith('/')) {
    // Make a missing release artifact obvious instead of letting a visitor
    // discover a generic 404 only after tapping the install button.
    fetch(installUrl, { method: 'HEAD' })
      .then((response) => {
        if (!response.ok) {
          note.textContent = 'The website is ready, but the signed APK has not been published at this address yet.';
          note.classList.add('is-warning');
        }
      })
      .catch(() => {
        // A network/CORS failure should not disable a valid download link.
      });
  }

  if (year) year.textContent = String(new Date().getFullYear());
})();
