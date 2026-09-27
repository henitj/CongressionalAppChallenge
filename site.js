(() => {
  const config = window.ECOTREK_CONFIG || {};
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const usePlayStore = !isAppleMobile && config.installMode === 'play' && Boolean(config.playStoreUrl);
  const hasIosLink = Boolean(config.iosUrl);
  const androidUrl = usePlayStore ? config.playStoreUrl : (config.apkUrl || '/downloads/ecotrek.apk');
  const installUrl = isAppleMobile ? (config.iosUrl || '#ios-install-not-configured') : androidUrl;
  const buttons = document.querySelectorAll('#download-button, #download-button-bottom');
  const note = document.querySelector('#download-note');
  const helper = document.querySelector('#install-helper');
  const installDescription = document.querySelector('#install-description');
  const year = document.querySelector('#current-year');

  buttons.forEach((button) => {
    button.setAttribute('href', installUrl);

    if (isAppleMobile) {
      button.removeAttribute('download');
      const title = button.querySelector('.button-label strong');
      const subtitle = button.querySelector('.button-label small');
      if (title) title.textContent = hasIosLink ? 'Install on iPhone' : 'iPhone version';
      if (subtitle) subtitle.textContent = hasIosLink ? 'App Store / TestFlight' : 'Coming soon';
    } else if (usePlayStore) {
      button.removeAttribute('download');
      const title = button.querySelector('.button-label strong');
      const subtitle = button.querySelector('.button-label small');
      if (title) title.textContent = 'Get it on Google Play';
      if (subtitle) subtitle.textContent = 'Official store listing';
    } else {
      button.setAttribute('download', 'EcoTrek.apk');
    }

    button.addEventListener('click', (event) => {
      if (isAppleMobile) {
        if (!hasIosLink) {
          event.preventDefault();
          if (note) {
            note.textContent = 'The iPhone install link is not published yet. Add the App Store or TestFlight URL in site-config.js after the iOS build is approved.';
            note.classList.add('is-warning');
          }
          return;
        }
        if (note) {
          note.textContent = 'Opening EcoTrek for iPhone. Tap Get or Install, then confirm with Face ID, Touch ID, or your Apple ID.';
          note.classList.remove('is-warning');
        }
        if (helper) {
          helper.textContent = 'iPhone installs come through the App Store or TestFlight. Apple may ask you to confirm with Face ID, Touch ID, or your Apple ID.';
        }
        return;
      }

      if (usePlayStore) return;

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

  if (isAppleMobile) {
    if (installDescription) {
      installDescription.textContent = hasIosLink
        ? 'EcoTrek for iPhone is ready through Apple distribution. Use the button below to open the App Store or TestFlight and keep your outdoor log in your pocket.'
        : 'EcoTrek can be distributed to iPhone through the App Store or TestFlight. The iOS install link will appear here once the build is published.';
    }
    if (note && !hasIosLink) {
      note.textContent = 'The iPhone install link is not published yet. Once the iOS build is in the App Store or TestFlight, this button will open it here.';
      note.classList.add('is-warning');
    }
    if (helper && hasIosLink) {
      helper.textContent = 'iPhone installs come through the App Store or TestFlight. Apple may ask you to confirm with Face ID, Touch ID, or your Apple ID.';
    }
  } else if (usePlayStore) {
    if (installDescription) installDescription.textContent = 'EcoTrek is available on Google Play. Open the official listing below and keep your outdoor log in your pocket.';
    if (note) note.textContent = 'Opening the official Google Play listing.';
  }

  if (!isAppleMobile && !usePlayStore && note && androidUrl.startsWith('/')) {
    // Make a missing release artifact obvious instead of letting a visitor
    // discover a generic 404 only after tapping the install button.
    fetch(androidUrl, { method: 'HEAD' })
      .then((response) => {
        if (!response.ok) {
          note.textContent = 'The website is ready, but the signed Android APK has not been published at this address yet.';
          note.classList.add('is-warning');
        }
      })
      .catch(() => {
        // A network/CORS failure should not disable a valid download link.
      });
  }

  if (year) year.textContent = String(new Date().getFullYear());
})();
