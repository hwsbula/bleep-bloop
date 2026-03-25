(function initTranscript(root) {
  const app = root.BleepBloopContent;

  if (!app) {
    return;
  }

  app.rescanTranscript = function rescanTranscript(source) {
    if (!app.state.settings.enabled) {
      return;
    }

    const rootNode = app.state.transcriptRoot || app.findTranscriptRoot();

    if (!rootNode) {
      app.state.cues = [];
      app.state.flaggedCueCount = 0;
      app.state.lastStatus = "Transcript unavailable";
      return;
    }

    const rows = app.collectTranscriptRows(rootNode);
    const cues = app.buildCues(rows);

    app.state.cues = cues;
    app.state.flaggedCueCount = cues.filter((cue) => cue.flagged).length;
    app.state.lastCueIndex = 0;
    app.state.lastStatus = cues.length
      ? `Transcript parsed from ${source}`
      : "Transcript open but no cues found";

    app.debugLog("Transcript cues", {
      source,
      count: cues.length,
      flagged: app.state.flaggedCueCount
    });
  };

  app.collectTranscriptRows = function collectTranscriptRows(rootNode) {
    const primaryRows = app.transcriptRowSelectors.flatMap((selector) => [...rootNode.querySelectorAll(selector)]);

    if (primaryRows.length > 0) {
      return primaryRows;
    }

    return [...rootNode.querySelectorAll("button, [role='button'], div, span")].filter((node) => {
      const text = (node.textContent || "").trim();
      const timestamps = [...new Set(text.match(app.cueTimestampPatternGlobal) || [])];

      return text.length > 0 && timestamps.length === 1 && app.shared.parseTimestamp(timestamps[0]) !== null;
    });
  };

  app.buildCues = function buildCues(rows) {
    const rawCues = [];
    const seen = new Set();

    for (const row of rows) {
      const cue = app.extractCue(row);

      if (!cue) {
        continue;
      }

      const key = `${cue.startSeconds}|${cue.text.toLowerCase()}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      rawCues.push(cue);
    }

    rawCues.sort((left, right) => left.startSeconds - right.startSeconds);

    return rawCues.map((cue, index) => {
      const nextCue = rawCues[index + 1];
      const endSeconds = nextCue && nextCue.startSeconds > cue.startSeconds
        ? nextCue.startSeconds
        : cue.startSeconds + app.state.settings.lastCueFallbackMs / 1000;
      const analysis = app.shared.analyzeProfanity(cue.text, app.state.detector);
      const occurrences = analysis.occurrences.map((occurrence) => {
        const instanceId = app.buildOccurrenceInstanceId(cue.startSeconds, occurrence);

        return {
          ...occurrence,
          instanceId,
          ignored: app.state.ignoredInstanceIds.has(instanceId)
        };
      });
      const activeMatches = [...new Set(occurrences.filter((occurrence) => !occurrence.ignored).map((occurrence) => occurrence.match))];

      return {
        startSeconds: cue.startSeconds,
        endSeconds,
        muteStartSeconds: Math.max(0, cue.startSeconds - app.state.settings.padBeforeMs / 1000),
        muteEndSeconds: endSeconds + app.state.settings.padAfterMs / 1000,
        text: cue.text,
        flagged: activeMatches.length > 0,
        matches: activeMatches,
        occurrences
      };
    });
  };

  app.buildOccurrenceInstanceId = function buildOccurrenceInstanceId(startSeconds, occurrence) {
    return [
      Math.max(0, Number(startSeconds) || 0),
      Math.max(0, Number(occurrence?.charStart) || 0),
      String(occurrence?.match || "").trim().toLowerCase(),
      String(occurrence?.displayMatch || "").trim().toLowerCase()
    ].join("|");
  };

  app.extractCue = function extractCue(row) {
    const rawText = (row.innerText || row.textContent || "").trim();

    if (!rawText) {
      return null;
    }

    const timestamps = [...new Set(rawText.match(app.cueTimestampPatternGlobal) || [])];

    if (timestamps.length > 1) {
      return null;
    }

    const timestampNode =
      row.querySelector?.("#segment-start-offset") ||
      row.querySelector?.("[id*='timestamp']") ||
      row.querySelector?.("[class*='timestamp']") ||
      null;
    const textNode =
      row.querySelector?.("#segment-text") ||
      row.querySelector?.("[class*='segment-text']") ||
      null;
    const timestampText = (timestampNode?.textContent || rawText.match(app.cueTimestampPattern)?.[0] || "").trim();
    const startSeconds = app.shared.parseTimestamp(timestampText);

    if (startSeconds === null) {
      return null;
    }

    let text = (textNode?.textContent || rawText).replace(timestampText, "").replace(/\s+/g, " ").trim();

    if (!text) {
      const lines = rawText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      text = lines.filter((line) => line !== timestampText).join(" ").trim();
    }

    if (!text) {
      return null;
    }

    return {
      startSeconds,
      text
    };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
