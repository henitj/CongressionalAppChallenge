/*
 * Small progressive-enhancement script for the pages around the app:
 * the Android and iOS install guides, the AI-key guide and the privacy policy.
 *
 * The app page itself does not use this file — it must work inside the Android
 * APK, where none of this exists.
 *
 * Everything here is optional: with JavaScript off, the pages still show the
 * install links, the steps and the API-key links. Only the release details and
 * the platform hints need script.
 */
(() => {
  const config = window.ECOTREK_CONFIG || {};
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const query = (selector, root = document) => root.querySelector(selector);
  const queryAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const formatBytes = (bytes) => {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '';
    if (value < 1024) return `${value} bytes`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  };

  // --- release details ------------------------------------------------------
  const values = {
    apkVersion: config.apkVersion,
    apkBytes: formatBytes(config.apkBytes),
    apkSha256: config.apkSha256,
    minAndroid: config.minAndroid,
  };
  queryAll('[data-config]').forEach((element) => {
    const key = element.dataset.config;
    const value = values[key];
    if (value) element.textContent = value;
  });

  // --- download button ------------------------------------------------------
  const downloadButton = query('#download-button');
  const downloadNote = query('#download-note');
  const downloadMeta = query('#download-button-meta');
  if (downloadButton) {
    const apkUrl = config.apkUrl || '/downloads/ecotrek.apk';
    if (config.installMode === 'play' && config.playStoreUrl) {
      downloadButton.href = config.playStoreUrl;
      downloadButton.removeAttribute('download');
      if (downloadMeta) downloadMeta.textContent = 'Google Play';
    } else {
      downloadButton.href = apkUrl;
      downloadButton.setAttribute('download', 'EcoTrek.apk');
      if (downloadMeta && values.apkBytes) {
        downloadMeta.textContent = `Android APK · ${values.apkBytes}`;
      }
    }

    if (downloadNote && !isAndroid) {
      downloadNote.textContent = isAppleMobile
        ? 'This page is for Android phones. On an iPhone or iPad, use the Home Screen guide instead.'
        : 'Open this page on the Android phone you want it on.';
    }
    if (downloadNote && isAndroid) {
      downloadNote.textContent = 'When it finishes, tap the download notification or open EcoTrek.apk from Files → Downloads. If Android does not show Install, follow the steps below to allow this source.';
    }
  }

  // Missing artifact is worth saying out loud rather than 404-ing on tap.
  const apkUrl = config.apkUrl || '/downloads/ecotrek.apk';
  if (downloadButton && config.installMode !== 'play' && apkUrl.startsWith('/')) {
    fetch(apkUrl, { method: 'HEAD' })
      .then((response) => {
        if (!response.ok && downloadNote) {
          downloadNote.textContent = 'The APK is not published at this address right now. Please try again later or email ecotrek.support@gmail.com.';
        }
      })
      .catch(() => {
        /* offline or blocked: leave the link alone */
      });
  }

  // --- iPhone page ----------------------------------------------------------
  const storeButton = query('#ios-store-button');
  const iosStatus = query('#ios-status');
  if (storeButton && config.iosUrl) {
    storeButton.href = config.iosUrl;
    storeButton.hidden = false;
    if (iosStatus) {
      iosStatus.textContent = isAppleMobile
        ? 'EcoTrek for iPhone is available. You can also add the web app to your Home Screen below.'
        : 'The iPhone build opens in the App Store; the Home Screen steps below work on any iPhone or iPad.';
    }
  }

  // --- release year ---------------------------------------------------------
  queryAll('#current-year').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
