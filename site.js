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

  // --- platform tabs (Android / Apple / API) --------------------------------
  // The three install/API pages share this tablist. Switching tabs only ever
  // toggles the `hidden` attribute on the panels below it — it never touches
  // the hero illustration above it, so that illustration can't vanish no
  // matter how many times you switch tabs or which one you land on.
  const tabList = query('.tabs[role="tablist"]');
  if (tabList) {
    const tabs = queryAll('[role="tab"]', tabList);
    const panelFor = (tab) => document.getElementById(tab.getAttribute('aria-controls'));
    const byKey = (key) => tabs.find((tab) => tab.dataset.tabKey === key);

    const activate = (tab, { focus = false, updateHash = true } = {}) => {
      if (!tab) return;
      tabs.forEach((candidate) => {
        const selected = candidate === tab;
        candidate.setAttribute('aria-selected', String(selected));
        candidate.tabIndex = selected ? 0 : -1;
        const panel = panelFor(candidate);
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
      if (updateHash) {
        const hash = `#${tab.dataset.tabKey}`;
        if (location.hash !== hash && window.history && history.replaceState) {
          history.replaceState(null, '', hash);
        }
      }
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activate(tab));
    });

    // Left/Right/Home/End move focus and activate, per the standard tabs
    // keyboard pattern — Tab key still exits the tablist as usual.
    tabList.addEventListener('keydown', (event) => {
      const currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex === -1) return;
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex !== null) {
        event.preventDefault();
        activate(tabs[nextIndex], { focus: true });
      }
    });

    // Deep links and the browser's own Back/Forward buttons both work: the
    // hash is the single source of truth for which tab is showing.
    window.addEventListener('hashchange', () => {
      const key = location.hash.replace('#', '');
      const tab = byKey(key);
      if (tab) activate(tab, { updateHash: false });
    });

    const requestedKey = location.hash.replace('#', '');
    const defaultKey = tabList.dataset.defaultTab || (isAppleMobile ? 'ios' : 'android');
    const initialTab = byKey(requestedKey) || byKey(defaultKey) || tabs[0];
    activate(initialTab, { updateHash: false });
  }
})();
