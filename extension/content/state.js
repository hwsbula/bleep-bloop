(function initContentState(root) {
  const shared = root.BleepBloopShared;

  if (!shared || !chrome?.storage?.sync) {
    return;
  }

  const app = root.BleepBloopContent || {};

  app.shared = shared;
  app.state = {
    settings: shared.mergeSettings(),
    detector: shared.compileDetector(shared.DEFAULT_SETTINGS),
    video: null,
    cues: [],
    flaggedCueCount: 0,
    lastCueIndex: 0,
    transcriptRoot: null,
    transcriptObserver: null,
    captionRoot: null,
    captionObserver: null,
    domObserver: null,
    playbackIntervalId: 0,
    refreshTimerId: 0,
    routeTimerId: 0,
    extensionMuted: false,
    transcriptOpenAttemptAt: 0,
    liveCaptionMuteUntil: 0,
    lastCaptionText: "",
    lastMuteReason: "",
    lastStatus: "Initializing",
    lastError: "",
    lastUrl: location.href,
    ignoredVideoId: "",
    ignoredInstanceIds: new Set(),
    ignoredLoadPromise: null
  };

  app.transcriptSelectors = [
    "ytd-engagement-panel-section-list-renderer[target-id*='transcript']",
    "ytd-transcript-search-panel-renderer",
    "ytd-transcript-renderer"
  ];

  app.transcriptRowSelectors = [
    "ytd-transcript-segment-renderer",
    "[target-id*='transcript'] ytd-transcript-segment-renderer"
  ];

  app.captionSelectors = [
    ".ytp-caption-window-container",
    ".captions-text",
    ".caption-window"
  ];

  app.cueTimestampPattern = /(?:(?:\d{1,2}:)?\d{1,2}:\d{2})/;
  app.cueTimestampPatternGlobal = /(?:(?:\d{1,2}:)?\d{1,2}:\d{2})/g;

  app.debugLog = function debugLog(...args) {
    if (app.state.settings.debug) {
      console.debug("[BleepBloop]", ...args);
    }
  };

  app.applySettings = function applySettings(value) {
    app.state.settings = shared.mergeSettings(value);
    app.state.detector = shared.compileDetector(app.state.settings);
  };

  root.BleepBloopContent = app;
})(typeof globalThis !== "undefined" ? globalThis : this);
