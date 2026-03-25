(function initIgnoredInstances(root) {
  const app = root.BleepBloopContent;

  if (!app) {
    return;
  }

  app.toIgnoredInstanceSet = function toIgnoredInstanceSet(value) {
    if (Array.isArray(value)) {
      return new Set(value.map((item) => String(item || "").trim()).filter(Boolean));
    }

    if (!value || typeof value !== "object") {
      return new Set();
    }

    return new Set(
      Object.entries(value)
        .filter((entry) => entry[1] === true)
        .map((entry) => String(entry[0] || "").trim())
        .filter(Boolean)
    );
  };

  app.setsEqual = function setsEqual(left, right) {
    if (left.size !== right.size) {
      return false;
    }

    for (const value of left) {
      if (!right.has(value)) {
        return false;
      }
    }

    return true;
  };

  app.ensureIgnoredInstancesLoaded = async function ensureIgnoredInstancesLoaded() {
    const requestedVideoId = app.getCurrentVideoId();

    if (!requestedVideoId) {
      const changed = app.state.ignoredVideoId !== "" || app.state.ignoredInstanceIds.size > 0;
      app.state.ignoredVideoId = "";
      app.state.ignoredInstanceIds = new Set();
      return changed;
    }

    if (app.state.ignoredVideoId === requestedVideoId) {
      return false;
    }

    if (app.state.ignoredLoadPromise) {
      return app.state.ignoredLoadPromise;
    }

    app.state.ignoredLoadPromise = chrome.storage.local
      .get(app.shared.IGNORED_INSTANCES_STORAGE_KEY)
      .then((stored) => {
        if (requestedVideoId !== app.getCurrentVideoId()) {
          return false;
        }

        app.state.ignoredVideoId = requestedVideoId;
        app.state.ignoredInstanceIds = app.toIgnoredInstanceSet(stored[app.shared.IGNORED_INSTANCES_STORAGE_KEY]?.[requestedVideoId]);
        return true;
      })
      .finally(() => {
        app.state.ignoredLoadPromise = null;
      });

    return app.state.ignoredLoadPromise;
  };

  app.applyIgnoredInstancesChange = function applyIgnoredInstancesChange(nextValue) {
    const currentVideoId = app.getCurrentVideoId();

    if (!currentVideoId || app.state.ignoredVideoId !== currentVideoId) {
      return;
    }

    const nextIgnoredSet = app.toIgnoredInstanceSet(nextValue?.[currentVideoId]);

    if (app.setsEqual(app.state.ignoredInstanceIds, nextIgnoredSet)) {
      return;
    }

    app.state.ignoredInstanceIds = nextIgnoredSet;
    app.refreshCueIgnoredState();
    app.evaluateMute();
  };

  app.setIgnoredInstance = async function setIgnoredInstance(instanceId, ignored) {
    const normalizedInstanceId = String(instanceId || "").trim();
    const currentVideoId = app.getCurrentVideoId();

    if (!normalizedInstanceId || !currentVideoId) {
      return;
    }

    await app.ensureIgnoredInstancesLoaded();

    const stored = await chrome.storage.local.get(app.shared.IGNORED_INSTANCES_STORAGE_KEY);
    const allIgnored = stored[app.shared.IGNORED_INSTANCES_STORAGE_KEY] && typeof stored[app.shared.IGNORED_INSTANCES_STORAGE_KEY] === "object"
      ? { ...stored[app.shared.IGNORED_INSTANCES_STORAGE_KEY] }
      : {};
    const videoIgnored = allIgnored[currentVideoId] && typeof allIgnored[currentVideoId] === "object"
      ? { ...allIgnored[currentVideoId] }
      : {};

    if (ignored) {
      videoIgnored[normalizedInstanceId] = true;
    } else {
      delete videoIgnored[normalizedInstanceId];
    }

    if (Object.keys(videoIgnored).length > 0) {
      allIgnored[currentVideoId] = videoIgnored;
    } else {
      delete allIgnored[currentVideoId];
    }

    await chrome.storage.local.set({
      [app.shared.IGNORED_INSTANCES_STORAGE_KEY]: allIgnored
    });

    app.state.lastError = "";
    app.state.ignoredVideoId = currentVideoId;
    app.state.ignoredInstanceIds = app.toIgnoredInstanceSet(videoIgnored);
    app.refreshCueIgnoredState();
    app.evaluateMute();
  };

  app.refreshCueIgnoredState = function refreshCueIgnoredState() {
    app.state.cues = app.state.cues.map((cue) => {
      const occurrences = Array.isArray(cue?.occurrences)
        ? cue.occurrences.map((occurrence) => ({
            ...occurrence,
            ignored: app.state.ignoredInstanceIds.has(occurrence.instanceId)
          }))
        : [];
      const activeMatches = [...new Set(occurrences.filter((occurrence) => !occurrence.ignored).map((occurrence) => occurrence.match))];

      return {
        ...cue,
        occurrences,
        matches: activeMatches,
        flagged: activeMatches.length > 0
      };
    });

    app.state.flaggedCueCount = app.state.cues.filter((cue) => cue.flagged).length;
    app.state.lastCueIndex = Math.min(app.state.lastCueIndex, Math.max(0, app.state.cues.length - 1));
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
