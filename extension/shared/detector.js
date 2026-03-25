(function initSharedDetector(root) {
  const namespace = root.BleepBloopShared || (root.BleepBloopShared = {});
  const constants = typeof module !== "undefined" && module.exports ? require("./constants.js") : namespace;
  const settings = typeof module !== "undefined" && module.exports ? require("./settings.js") : namespace;

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/[’`]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function deLeet(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[@4]/g, "a")
      .replace(/[3]/g, "e")
      .replace(/[1!|]/g, "i")
      .replace(/[0]/g, "o")
      .replace(/[5$]/g, "s")
      .replace(/[7+]/g, "t");
  }

  function compactLetters(value) {
    return deLeet(value).replace(/[^a-z]/g, "");
  }

  function skeletonize(value) {
    return compactLetters(value).replace(/[aeiou]/g, "");
  }

  function buildTermRegex(term, flags = "i") {
    const escaped = escapeRegExp(normalizeText(term)).replace(/\\ /g, "\\s+");
    return new RegExp(`(^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, flags);
  }

  function compileDetector(customSettings) {
    const merged = settings.mergeSettings(customSettings);
    const regexEntries = merged.terms.map((term) => ({
      term,
      regex: buildTermRegex(term),
      globalRegex: buildTermRegex(term, "gi")
    }));
    const exactCompactTerms = new Set();
    const redactedSkeletonTerms = new Set();

    for (const term of merged.terms) {
      if (/\s/.test(term)) {
        continue;
      }

      const compact = compactLetters(term);
      const skeleton = skeletonize(term);

      if (compact.length >= 3) {
        exactCompactTerms.add(compact);
      }

      if (skeleton.length >= 3) {
        redactedSkeletonTerms.add(skeleton);
      }
    }

    return {
      settings: merged,
      regexEntries,
      exactCompactTerms,
      redactedSkeletonTerms
    };
  }

  function analyzeProfanity(text, detector) {
    const rawText = String(text || "");
    const value = normalizeText(rawText);

    if (!value) {
      return {
        flagged: false,
        matches: [],
        occurrences: []
      };
    }

    const compiled = detector || compileDetector(constants.DEFAULT_SETTINGS);
    const matches = new Set();
    const occurrences = [];
    const seenOccurrenceKeys = new Set();
    const tokens = buildTokenIndex(rawText);

    for (const entry of compiled.regexEntries) {
      collectRegexOccurrences(rawText, entry.globalRegex, entry.term, "term", tokens, occurrences, seenOccurrenceKeys);
    }

    if (compiled.settings.muteNamedPlaceholderCues) {
      for (const pattern of constants.NAMED_PLACEHOLDER_PATTERNS) {
        collectPatternOccurrences(rawText, pattern, "placeholder", "named-placeholder", tokens, occurrences, seenOccurrenceKeys);
      }
    }

    if (compiled.settings.muteSymbolPlaceholderCues) {
      for (const pattern of constants.SYMBOL_PLACEHOLDER_PATTERNS) {
        collectPatternOccurrences(rawText, pattern, "placeholder", "symbol-placeholder", tokens, occurrences, seenOccurrenceKeys);
      }
    }

    if (compiled.settings.enablePlaceholderDetection) {
      collectPlaceholderTokenOccurrences(tokens, compiled, occurrences, seenOccurrenceKeys);
    }

    occurrences.sort((left, right) => {
      if (left.charStart !== right.charStart) {
        return left.charStart - right.charStart;
      }

      if (left.charEnd !== right.charEnd) {
        return left.charEnd - right.charEnd;
      }

      return left.match.localeCompare(right.match);
    });

    for (const occurrence of occurrences) {
      matches.add(occurrence.match);
    }

    return {
      flagged: matches.size > 0,
      matches: [...matches],
      occurrences
    };
  }

  function buildTokenIndex(text) {
    const source = String(text || "");
    const tokens = [];
    const pattern = /\S+/g;
    let match = pattern.exec(source);

    while (match) {
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });

      match = pattern.exec(source);
    }

    return tokens;
  }

  function buildContext(tokens, tokenStart, tokenEnd) {
    const beforeStart = Math.max(0, tokenStart - 3);
    const afterEnd = Math.min(tokens.length, tokenEnd + 1);

    return {
      contextBefore: tokens
        .slice(beforeStart, tokenStart)
        .map((token) => token.text)
        .join(" "),
      contextAfter: tokens
        .slice(tokenEnd, afterEnd)
        .map((token) => token.text)
        .join(" ")
    };
  }

  function getTokenSpan(tokens, charStart, charEnd) {
    if (!tokens.length) {
      return {
        tokenStart: 0,
        tokenEnd: 0
      };
    }

    let tokenStart = -1;
    let tokenEnd = -1;

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];

      if (tokenStart === -1 && token.end > charStart) {
        tokenStart = index;
      }

      if (token.start < charEnd) {
        tokenEnd = index;
        continue;
      }

      if (tokenStart !== -1) {
        break;
      }
    }

    if (tokenStart === -1) {
      const fallbackIndex = tokens.findIndex((token) => token.start >= charStart);
      const index = fallbackIndex === -1 ? tokens.length - 1 : fallbackIndex;

      return {
        tokenStart: index,
        tokenEnd: index + 1
      };
    }

    return {
      tokenStart,
      tokenEnd: Math.max(tokenStart + 1, tokenEnd + 1)
    };
  }

  function pushOccurrence(occurrences, seenKeys, tokens, data) {
    const displayMatch = String(data.displayMatch || "").trim();

    if (!displayMatch) {
      return;
    }

    const charStart = Math.max(0, Number(data.charStart) || 0);
    const charEnd = Math.max(charStart, Number(data.charEnd) || charStart + displayMatch.length);
    const tokenSpan = getTokenSpan(tokens, charStart, charEnd);
    const dedupeKey = [
      String(data.type || "term"),
      String(data.match || "").toLowerCase(),
      charStart,
      charEnd,
      normalizeText(displayMatch)
    ].join("|");
    const normalizedMatch = String(data.match || displayMatch).trim().toLowerCase();
    const overlappingIndex = occurrences.findIndex(
      (occurrence) =>
        occurrence.match === normalizedMatch &&
        charStart < occurrence.charEnd &&
        charEnd > occurrence.charStart
    );

    if (seenKeys.has(dedupeKey)) {
      return;
    }

    if (overlappingIndex !== -1) {
      const existing = occurrences[overlappingIndex];
      const existingLength = existing.charEnd - existing.charStart;
      const nextLength = charEnd - charStart;

      if (existingLength >= nextLength) {
        return;
      }

      occurrences.splice(overlappingIndex, 1);
    }

    seenKeys.add(dedupeKey);

    occurrences.push({
      match: normalizedMatch,
      displayMatch,
      type: String(data.type || "term"),
      charStart,
      charEnd,
      tokenStart: tokenSpan.tokenStart,
      tokenEnd: tokenSpan.tokenEnd,
      ...buildContext(tokens, tokenSpan.tokenStart, tokenSpan.tokenEnd)
    });
  }

  function collectRegexOccurrences(text, regex, matchLabel, type, tokens, occurrences, seenKeys) {
    regex.lastIndex = 0;
    let result = regex.exec(text);

    while (result) {
      const boundary = result[1] || "";
      const displayMatch = String(result[2] || result[0] || "").trim();
      const charStart = result.index + boundary.length;

      pushOccurrence(occurrences, seenKeys, tokens, {
        match: matchLabel,
        displayMatch,
        type,
        charStart,
        charEnd: charStart + displayMatch.length
      });

      if (result[0].length === 0) {
        regex.lastIndex += 1;
      }

      result = regex.exec(text);
    }
  }

  function collectPatternOccurrences(text, pattern, matchLabel, type, tokens, occurrences, seenKeys) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const regex = new RegExp(pattern.source, flags);
    let result = regex.exec(text);

    while (result) {
      const displayMatch = String(result[0] || "").trim();

      pushOccurrence(occurrences, seenKeys, tokens, {
        match: matchLabel,
        displayMatch,
        type,
        charStart: result.index,
        charEnd: result.index + displayMatch.length
      });

      if (result[0].length === 0) {
        regex.lastIndex += 1;
      }

      result = regex.exec(text);
    }
  }

  function collectPlaceholderTokenOccurrences(tokens, compiled, occurrences, seenKeys) {
    for (const token of tokens) {
      if (!/[*_\-\[\]]/.test(token.text)) {
        continue;
      }

      const compact = compactLetters(token.text);
      const skeleton = skeletonize(token.text);

      if (
        (compact.length >= 3 && compiled.exactCompactTerms.has(compact)) ||
        (skeleton.length >= 3 && compiled.redactedSkeletonTerms.has(skeleton))
      ) {
        pushOccurrence(occurrences, seenKeys, tokens, {
          match: token.text,
          displayMatch: token.text,
          type: "redacted-token",
          charStart: token.start,
          charEnd: token.end
        });
      }
    }
  }

  const exports = {
    escapeRegExp,
    normalizeText,
    compileDetector,
    analyzeProfanity
  };

  Object.assign(namespace, exports);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
