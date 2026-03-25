(function initSharedConstants(root) {
  const namespace = root.BleepBloopShared || (root.BleepBloopShared = {});

  const STORAGE_KEY = "settings";
  const IGNORED_INSTANCES_STORAGE_KEY = "ignoredInstancesByVideo";

  const DEFAULT_TERMS = Object.freeze([
    "fuck",
    "fucking",
    "fucker",
    "motherfucker",
    "shit",
    "bullshit",
    "bitch",
    "son of a bitch",
    "asshole",
    "dumbass",
    "jackass",
    "bastard",
    "damn",
    "goddamn",
    "crap",
    "piss",
    "dick",
    "prick",
    "pussy",
    "cock",
    "cunt",
    "slut",
    "whore",
    "douche",
    "faggot",
    "nigger",
    "nigga"
  ]);

  const NAMED_PLACEHOLDER_PATTERNS = Object.freeze([
    /\[\s*(?:bleep|beep|cursing|curse|swearing|swear|expletive|profanity)\s*\]/i,
    /\b(?:bleep|beep)(?:ed|ing)?\b/i,
    /\b(?:censored|redacted|expletive)\b/i
  ]);

  const SYMBOL_PLACEHOLDER_PATTERNS = Object.freeze([
    /\[\s*__+\s*\]/i,
    /\[\s*[^a-z0-9\s]{2,}\s*\]/i
  ]);

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    autoOpenTranscript: true,
    enableLiveCaptionsFallback: true,
    enablePlaceholderDetection: true,
    muteNamedPlaceholderCues: true,
    muteSymbolPlaceholderCues: true,
    censorPopupWords: true,
    padBeforeMs: 120,
    padAfterMs: 220,
    lastCueFallbackMs: 2200,
    debug: false,
    terms: [...DEFAULT_TERMS]
  });

  const exports = {
    STORAGE_KEY,
    IGNORED_INSTANCES_STORAGE_KEY,
    DEFAULT_TERMS,
    NAMED_PLACEHOLDER_PATTERNS,
    SYMBOL_PLACEHOLDER_PATTERNS,
    DEFAULT_SETTINGS
  };

  Object.assign(namespace, exports);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
