(function initMuting(root) {
  const app = root.BleepBloopContent;

  if (!app) {
    return;
  }

  app.ensureVideoAttached = function ensureVideoAttached() {
    const nextVideo =
      document.querySelector("video.html5-main-video") ||
      document.querySelector("video.video-stream") ||
      document.querySelector("video");

    if (!nextVideo || nextVideo === app.state.video) {
      return;
    }

    app.detachVideo();
    app.state.video = nextVideo;
    app.state.video.addEventListener("play", app.handleVideoPlaybackEvent, true);
    app.state.video.addEventListener("pause", app.handleVideoPlaybackEvent, true);
    app.state.video.addEventListener("seeking", app.handleVideoPlaybackEvent, true);
    app.state.video.addEventListener("seeked", app.handleVideoPlaybackEvent, true);

    if (!app.state.video.paused && !app.state.video.ended) {
      app.startPlaybackLoop();
    }

    app.debugLog("Attached video element");
  };

  app.detachVideo = function detachVideo() {
    if (!app.state.video) {
      return;
    }

    app.state.video.removeEventListener("play", app.handleVideoPlaybackEvent, true);
    app.state.video.removeEventListener("pause", app.handleVideoPlaybackEvent, true);
    app.state.video.removeEventListener("seeking", app.handleVideoPlaybackEvent, true);
    app.state.video.removeEventListener("seeked", app.handleVideoPlaybackEvent, true);
    app.state.video = null;
  };

  app.handleVideoPlaybackEvent = function handleVideoPlaybackEvent() {
    if (!app.state.video) {
      return;
    }

    if (app.state.video.paused || app.state.video.ended) {
      app.stopPlaybackLoop();
      app.evaluateMute();
      return;
    }

    app.startPlaybackLoop();
    app.evaluateMute();
  };

  app.startPlaybackLoop = function startPlaybackLoop() {
    if (app.state.playbackIntervalId || !app.state.video) {
      return;
    }

    app.state.playbackIntervalId = window.setInterval(app.evaluateMute, 90);
  };

  app.stopPlaybackLoop = function stopPlaybackLoop() {
    if (!app.state.playbackIntervalId) {
      return;
    }

    window.clearInterval(app.state.playbackIntervalId);
    app.state.playbackIntervalId = 0;
  };

  app.evaluateMute = function evaluateMute() {
    if (!app.state.video || !app.state.settings.enabled) {
      app.releaseMute();
      return;
    }

    const transcriptCue = app.getActiveFlaggedCue(app.state.video.currentTime);
    const liveCaptionActive = app.state.settings.enableLiveCaptionsFallback && performance.now() < app.state.liveCaptionMuteUntil;

    if (transcriptCue || liveCaptionActive) {
      app.applyMute(
        transcriptCue
          ? `Transcript line ${app.shared.formatSeconds(transcriptCue.startSeconds)}`
          : `Live caption: ${app.state.lastCaptionText.slice(0, 80)}`
      );
      return;
    }

    app.releaseMute();
  };

  app.applyMute = function applyMute(reason) {
    app.state.lastMuteReason = reason;
    app.state.lastStatus = "Muting active";

    if (!app.state.video || app.state.extensionMuted || app.state.video.muted) {
      return;
    }

    app.state.video.muted = true;
    app.state.extensionMuted = true;
  };

  app.releaseMute = function releaseMute() {
    if (!app.state.video || !app.state.extensionMuted) {
      return;
    }

    app.state.video.muted = false;
    app.state.extensionMuted = false;
    app.state.lastStatus = app.state.cues.length ? "Monitoring transcript cues" : "Monitoring page";
  };

  app.getActiveFlaggedCue = function getActiveFlaggedCue(currentTime) {
    if (!app.state.cues.length) {
      return null;
    }

    let index = Math.min(app.state.lastCueIndex, app.state.cues.length - 1);

    while (index < app.state.cues.length - 1 && currentTime >= app.state.cues[index].muteEndSeconds) {
      index += 1;
    }

    while (index > 0 && currentTime < app.state.cues[index].muteStartSeconds) {
      index -= 1;
    }

    app.state.lastCueIndex = index;

    const cue = app.state.cues[index];

    if (!cue?.flagged) {
      return null;
    }

    return currentTime >= cue.muteStartSeconds && currentTime < cue.muteEndSeconds ? cue : null;
  };

  app.seekToTime = function seekToTime(value) {
    const seconds = Math.max(0, Number(value) || 0);

    app.ensureVideoAttached();

    if (!app.state.video) {
      app.state.lastError = "Video element unavailable.";
      return {
        ok: false
      };
    }

    app.state.lastError = "";
    app.state.video.currentTime = seconds;
    app.state.lastStatus = `Jumped to ${app.shared.formatSeconds(seconds)}`;
    app.evaluateMute();

    return {
      ok: true,
      jumpedToSeconds: seconds
    };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
