(function initContent(root) {
  const app = root.BleepBloopContent;

  if (!app || !chrome?.storage?.sync) {
    return;
  }

  app.loadInitialState = async function loadInitialState() {
    const stored = await chrome.storage.sync.get(app.shared.STORAGE_KEY);
    app.applySettings(stored[app.shared.STORAGE_KEY]);
    await app.ensureIgnoredInstancesLoaded();
  };

  app.handleStorageChange = function handleStorageChange(changes, areaName) {
    if (areaName === "sync" && changes[app.shared.STORAGE_KEY]) {
      app.applySettings(changes[app.shared.STORAGE_KEY].newValue);
      app.scheduleRefresh(0);
      return;
    }

    if (areaName === "local" && changes[app.shared.IGNORED_INSTANCES_STORAGE_KEY]) {
      app.applyIgnoredInstancesChange(changes[app.shared.IGNORED_INSTANCES_STORAGE_KEY].newValue);
    }
  };

  app.handleRuntimeMessage = function handleRuntimeMessage(message, _sender, sendResponse) {
    const type = message?.type;

    if (type === "GET_STATUS") {
      sendResponse(app.getStatus());
      return false;
    }

    if (type === "RESCAN_TRANSCRIPT") {
      app.rescanTranscript("popup");
      sendResponse(app.getStatus());
      return false;
    }

    if (type === "OPEN_TRANSCRIPT") {
      app.ensureTranscriptOpen(true)
        .then(() => {
          window.setTimeout(() => {
            app.rescanTranscript("open-transcript");
            sendResponse(app.getStatus());
          }, 700);
        })
        .catch((error) => {
          app.state.lastError = String(error?.message || error);
          sendResponse(app.getStatus());
        });

      return true;
    }

    if (type === "SEEK_TO_TIME") {
      const response = app.seekToTime(message?.seconds);
      sendResponse({
        ...app.getStatus(),
        ...response
      });
      return false;
    }

    if (type === "SET_INSTANCE_IGNORED") {
      app.setIgnoredInstance(message?.instanceId, message?.ignored !== false)
        .then(() => {
          sendResponse(app.getStatus());
        })
        .catch((error) => {
          app.state.lastError = String(error?.message || error);
          sendResponse(app.getStatus());
        });

      return true;
    }

    return false;
  };

  app.startRuntime = function startRuntime() {
    app.state.domObserver = new MutationObserver(() => {
      app.scheduleRefresh(180);
    });

    if (document.body) {
      app.state.domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: false
      });
    }

    document.addEventListener("yt-navigate-finish", app.handlePageNavigation, true);
    window.addEventListener("popstate", app.handlePageNavigation, true);

    app.state.routeTimerId = window.setInterval(() => {
      if (location.href !== app.state.lastUrl) {
        app.handlePageNavigation();
      }
    }, 1000);

    app.refreshRuntime("startup");
  };

  app.handlePageNavigation = function handlePageNavigation() {
    if (location.href === app.state.lastUrl) {
      return;
    }

    app.state.lastUrl = location.href;
    app.resetPageState();
    app.scheduleRefresh(250);
  };

  app.resetPageState = function resetPageState() {
    app.disconnectTranscriptObserver();
    app.disconnectCaptionObserver();
    app.stopPlaybackLoop();
    app.releaseMute();
    app.detachVideo();
    app.state.cues = [];
    app.state.flaggedCueCount = 0;
    app.state.lastCueIndex = 0;
    app.state.lastCaptionText = "";
    app.state.lastMuteReason = "";
    app.state.lastError = "";
    app.state.ignoredVideoId = "";
    app.state.ignoredInstanceIds = new Set();
    app.state.ignoredLoadPromise = null;
  };

  app.scheduleRefresh = function scheduleRefresh(delayMs) {
    if (app.state.refreshTimerId) {
      window.clearTimeout(app.state.refreshTimerId);
    }

    app.state.refreshTimerId = window.setTimeout(() => {
      app.state.refreshTimerId = 0;
      app.refreshRuntime("scheduled");
    }, delayMs);
  };

  app.refreshRuntime = function refreshRuntime(source) {
    if (!app.isSupportedPage()) {
      app.state.lastStatus = "Open a YouTube watch page.";
      app.resetPageState();
      return;
    }

    app.state.lastStatus = "Watching page DOM";
    app.ensureVideoAttached();
    app.syncTranscriptRoot();
    app.syncCaptionRoot();

    const currentVideoId = app.getCurrentVideoId();

    if (app.state.ignoredVideoId !== currentVideoId) {
      app.state.lastStatus = currentVideoId ? "Loading ignored instances" : "Waiting for video";
      app.ensureIgnoredInstancesLoaded()
        .then((updated) => {
          if (!updated) {
            return;
          }

          app.rescanTranscript("ignored-state");
          app.evaluateMute();
        })
        .catch((error) => {
          app.state.lastError = String(error?.message || error);
        });
      return;
    }

    if (app.state.settings.enabled) {
      if (!app.state.transcriptRoot && app.state.settings.autoOpenTranscript) {
        app.ensureTranscriptOpen(false).catch((error) => {
          app.state.lastError = String(error?.message || error);
        });
      }

      app.rescanTranscript(source);
    } else {
      app.state.lastStatus = "Muting disabled";
      app.releaseMute();
    }

    if (app.state.video && !app.state.video.paused && !app.state.video.ended) {
      app.startPlaybackLoop();
    }
  };

  app.getStatus = function getStatus() {
    return {
      enabled: app.state.settings.enabled,
      supportedPage: app.isSupportedPage(),
      hasVideo: Boolean(app.state.video),
      transcriptOpen: Boolean(app.state.transcriptRoot),
      cueCount: app.state.cues.length,
      flaggedCueCount: app.state.flaggedCueCount,
      flaggedWordEntries: app.shared.buildFlaggedWordEntries(app.state.cues),
      extensionMuted: app.state.extensionMuted,
      lastMuteReason: app.state.lastMuteReason,
      status: app.state.lastStatus,
      lastError: app.state.lastError
    };
  };

  app.loadInitialState().then(app.startRuntime);

  chrome.storage.onChanged.addListener(app.handleStorageChange);
  chrome.runtime.onMessage.addListener(app.handleRuntimeMessage);
})(typeof globalThis !== "undefined" ? globalThis : this);
