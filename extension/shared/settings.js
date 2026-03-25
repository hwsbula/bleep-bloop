(function initSharedSettings(root) {
  const namespace = root.BleepBloopShared || (root.BleepBloopShared = {});
  const shared = typeof module !== "undefined" && module.exports ? require("./constants.js") : namespace;

  function clampNumber(value, fallback, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function normalizeTerms(input) {
    const source = Array.isArray(input) ? input : String(input || "").split(/\r?\n/);
    const seen = new Set();
    const result = [];

    for (const rawValue of source) {
      const value = String(rawValue || "").trim().toLowerCase();

      if (!value || seen.has(value)) {
        continue;
      }

      seen.add(value);
      result.push(value);
    }

    return result;
  }

  function serializeTerms(terms) {
    return normalizeTerms(terms).join("\n");
  }

  function mergeSettings(partial) {
    const source = partial && typeof partial === "object" ? partial : {};
    const legacyMutePlaceholderCues = source.mutePlaceholderCues;
    const muteNamedPlaceholderCues =
      source.muteNamedPlaceholderCues !== undefined
        ? source.muteNamedPlaceholderCues !== false
        : legacyMutePlaceholderCues !== undefined
          ? legacyMutePlaceholderCues !== false
          : shared.DEFAULT_SETTINGS.muteNamedPlaceholderCues;
    const muteSymbolPlaceholderCues =
      source.muteSymbolPlaceholderCues !== undefined
        ? source.muteSymbolPlaceholderCues !== false
        : legacyMutePlaceholderCues !== undefined
          ? legacyMutePlaceholderCues !== false
          : shared.DEFAULT_SETTINGS.muteSymbolPlaceholderCues;

    return {
      enabled: source.enabled !== false,
      autoOpenTranscript: source.autoOpenTranscript !== false,
      enableLiveCaptionsFallback: source.enableLiveCaptionsFallback !== false,
      enablePlaceholderDetection: source.enablePlaceholderDetection !== false,
      muteNamedPlaceholderCues,
      muteSymbolPlaceholderCues,
      censorPopupWords: source.censorPopupWords !== false,
      padBeforeMs: clampNumber(source.padBeforeMs, shared.DEFAULT_SETTINGS.padBeforeMs, 0, 2000),
      padAfterMs: clampNumber(source.padAfterMs, shared.DEFAULT_SETTINGS.padAfterMs, 0, 3000),
      lastCueFallbackMs: clampNumber(source.lastCueFallbackMs, shared.DEFAULT_SETTINGS.lastCueFallbackMs, 500, 12000),
      debug: source.debug === true,
      terms: normalizeTerms(source.terms && source.terms.length ? source.terms : shared.DEFAULT_TERMS)
    };
  }

  const exports = {
    mergeSettings,
    normalizeTerms,
    serializeTerms
  };

  Object.assign(namespace, exports);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
