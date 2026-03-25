(function initCaptions(root) {
  const app = root.BleepBloopContent;

  if (!app) {
    return;
  }

  app.handleCaptionMutation = function handleCaptionMutation() {
    if (!app.state.settings.enableLiveCaptionsFallback) {
      return;
    }

    const captionText = app.extractVisibleCaptionText();

    if (!captionText || captionText === app.state.lastCaptionText) {
      return;
    }

    app.state.lastCaptionText = captionText;
    const result = app.shared.analyzeProfanity(captionText, app.state.detector);

    if (!result.flagged) {
      return;
    }

    app.state.liveCaptionMuteUntil = performance.now() + 1400;
    app.state.lastStatus = "Caption fallback active";
    app.debugLog("Live caption profanity", captionText, result.matches);
    app.evaluateMute();
  };

  app.extractVisibleCaptionText = function extractVisibleCaptionText() {
    const rootNode = app.state.captionRoot || app.findCaptionRoot();

    if (!rootNode) {
      return "";
    }

    const parts = [...rootNode.querySelectorAll(".ytp-caption-segment, .caption-visual-line, span")]
      .map((node) => (node.textContent || "").trim())
      .filter(Boolean);

    return parts.join(" ").replace(/\s+/g, " ").trim();
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
