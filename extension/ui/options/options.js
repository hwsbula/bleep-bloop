(function initOptions() {
  const shared = globalThis.BleepBloopShared;
  const form = document.querySelector("#settingsForm");
  const resetButton = document.querySelector("#resetButton");
  const message = document.querySelector("#message");
  const termsField = document.querySelector("#terms");

  load().catch((error) => {
    message.textContent = String(error?.message || error);
  });

  form.addEventListener("submit", handleSubmit);
  resetButton.addEventListener("click", handleReset);

  async function load() {
    const stored = await chrome.storage.sync.get(shared.STORAGE_KEY);
    const settings = shared.mergeSettings(stored[shared.STORAGE_KEY]);
    populateForm(settings);
  }

  function populateForm(settings) {
    form.elements.enabled.checked = settings.enabled;
    form.elements.autoOpenTranscript.checked = settings.autoOpenTranscript;
    form.elements.enableLiveCaptionsFallback.checked = settings.enableLiveCaptionsFallback;
    form.elements.enablePlaceholderDetection.checked = settings.enablePlaceholderDetection;
    form.elements.muteNamedPlaceholderCues.checked = settings.muteNamedPlaceholderCues;
    form.elements.muteSymbolPlaceholderCues.checked = settings.muteSymbolPlaceholderCues;
    form.elements.censorPopupWords.checked = settings.censorPopupWords;
    form.elements.debug.checked = settings.debug;
    form.elements.padBeforeMs.value = String(settings.padBeforeMs);
    form.elements.padAfterMs.value = String(settings.padAfterMs);
    form.elements.lastCueFallbackMs.value = String(settings.lastCueFallbackMs);
    termsField.value = shared.serializeTerms(settings.terms);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const settings = shared.mergeSettings({
      enabled: form.elements.enabled.checked,
      autoOpenTranscript: form.elements.autoOpenTranscript.checked,
      enableLiveCaptionsFallback: form.elements.enableLiveCaptionsFallback.checked,
      enablePlaceholderDetection: form.elements.enablePlaceholderDetection.checked,
      muteNamedPlaceholderCues: form.elements.muteNamedPlaceholderCues.checked,
      muteSymbolPlaceholderCues: form.elements.muteSymbolPlaceholderCues.checked,
      censorPopupWords: form.elements.censorPopupWords.checked,
      debug: form.elements.debug.checked,
      padBeforeMs: form.elements.padBeforeMs.value,
      padAfterMs: form.elements.padAfterMs.value,
      lastCueFallbackMs: form.elements.lastCueFallbackMs.value,
      terms: shared.normalizeTerms(termsField.value)
    });

    await chrome.storage.sync.set({
      [shared.STORAGE_KEY]: settings
    });

    populateForm(settings);
    message.textContent = "Saved.";
    window.setTimeout(() => {
      message.textContent = "";
    }, 1500);
  }

  async function handleReset() {
    const settings = shared.mergeSettings(shared.DEFAULT_SETTINGS);

    await chrome.storage.sync.set({
      [shared.STORAGE_KEY]: settings
    });

    populateForm(settings);
    message.textContent = "Defaults restored.";
    window.setTimeout(() => {
      message.textContent = "";
    }, 1500);
  }
})();
