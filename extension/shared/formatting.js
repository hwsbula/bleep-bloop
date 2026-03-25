(function initSharedFormatting(root) {
  const namespace = root.BleepBloopShared || (root.BleepBloopShared = {});

  function parseTimestamp(value) {
    const match = String(value || "")
      .trim()
      .match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);

    if (!match) {
      return null;
    }

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  function formatSeconds(value) {
    const total = Math.max(0, Math.floor(Number(value) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function censorMatch(value) {
    return String(value || "")
      .split(/(\s+)/)
      .map((part) => (/^\s+$/.test(part) ? part : censorWord(part)))
      .join("");
  }

  function censorWord(value) {
    const chars = Array.from(String(value || ""));
    const letterPositions = [];

    for (let index = 0; index < chars.length; index += 1) {
      if (/[a-z]/i.test(chars[index])) {
        letterPositions.push(index);
      }
    }

    if (letterPositions.length <= 2) {
      return chars.join("");
    }

    const visibleLetterIndexes = new Set(letterPositions.slice(0, 2));

    return chars
      .map((char, index) => {
        if (!/[a-z]/i.test(char)) {
          return char;
        }

        return visibleLetterIndexes.has(index) ? char : "-";
      })
      .join("");
  }

  function buildFlaggedWordEntries(cues) {
    if (!Array.isArray(cues)) {
      return [];
    }

    const entries = [];

    for (const cue of cues) {
      if (!Array.isArray(cue?.occurrences) || cue.occurrences.length === 0) {
        continue;
      }

      for (const occurrence of cue.occurrences) {
        const displayMatch = String(occurrence?.displayMatch || occurrence?.match || "").trim();

        if (!displayMatch) {
          continue;
        }

        entries.push({
          startSeconds: Math.max(0, Number(cue.startSeconds) || 0),
          timestamp: formatSeconds(cue.startSeconds),
          match: String(occurrence?.match || displayMatch).trim(),
          displayMatch,
          censoredMatch: censorMatch(displayMatch),
          instanceId: String(occurrence?.instanceId || ""),
          ignored: occurrence?.ignored === true,
          contextBefore: String(occurrence?.contextBefore || "").trim(),
          contextAfter: String(occurrence?.contextAfter || "").trim(),
          charStart: Math.max(0, Number(occurrence?.charStart) || 0)
        });
      }
    }

    return entries.sort((left, right) => {
      if (left.startSeconds !== right.startSeconds) {
        return left.startSeconds - right.startSeconds;
      }

      return left.charStart - right.charStart;
    });
  }

  const exports = {
    parseTimestamp,
    formatSeconds,
    censorMatch,
    buildFlaggedWordEntries
  };

  Object.assign(namespace, exports);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
