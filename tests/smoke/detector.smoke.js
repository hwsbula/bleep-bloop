const path = require("path");
const shared = require(path.join(__dirname, "..", "..", "extension", "shared", "index.js"));

const detector = shared.compileDetector(shared.DEFAULT_SETTINGS);

const cases = [
  { text: "this line says fuck once", expected: true },
  { text: "this line says f*ck once", expected: true },
  { text: "this line says sh-t once", expected: true },
  { text: "this line contains [ __ ] as a placeholder", expected: true },
  { text: "this line is clean", expected: false }
];

const censorCases = [
  { text: "fuck", expected: "fu--" },
  { text: "motherfucker", expected: "mo----------" },
  { text: "son of a bitch", expected: "so- of a bi---" },
  { text: "f*ck", expected: "f*c-" }
];

const namedPlaceholderOffDetector = shared.compileDetector({
  ...shared.DEFAULT_SETTINGS,
  muteNamedPlaceholderCues: false
});

const symbolPlaceholderOffDetector = shared.compileDetector({
  ...shared.DEFAULT_SETTINGS,
  muteSymbolPlaceholderCues: false
});

const placeholderToggleCases = [
  { text: "this line contains [bleep] as a placeholder", detector: namedPlaceholderOffDetector, expected: false },
  { text: "this line contains [ __ ] as a placeholder", detector: namedPlaceholderOffDetector, expected: true },
  { text: "this line contains [ __ ] as a placeholder", detector: symbolPlaceholderOffDetector, expected: false },
  { text: "this line contains [bleep] as a placeholder", detector: symbolPlaceholderOffDetector, expected: true },
  { text: "this line says f*ck once", detector: namedPlaceholderOffDetector, expected: true }
];

const flaggedWordEntries = shared.buildFlaggedWordEntries([
  {
    startSeconds: 83,
    occurrences: [
      {
        match: "fuck",
        displayMatch: "fuck",
        contextBefore: "this line says",
        contextAfter: "once",
        instanceId: "83|15|fuck|fuck",
        ignored: false,
        charStart: 15
      },
      {
        match: "son of a bitch",
        displayMatch: "son of a bitch",
        contextBefore: "he called him",
        contextAfter: "today",
        instanceId: "83|28|son of a bitch|son of a bitch",
        ignored: false,
        charStart: 28
      }
    ]
  },
  {
    startSeconds: 5,
    occurrences: [
      {
        match: "placeholder",
        displayMatch: "[bleep]",
        contextBefore: "this line contains",
        contextAfter: "here",
        instanceId: "5|18|placeholder|[bleep]",
        ignored: true,
        charStart: 18
      }
    ]
  }
]);

const occurrenceCase = shared.analyzeProfanity("this line says fuck once", detector);

let failed = 0;

for (const testCase of cases) {
  const result = shared.analyzeProfanity(testCase.text, detector);

  if (result.flagged !== testCase.expected) {
    failed += 1;
    console.error("FAIL", { text: testCase.text, expected: testCase.expected, actual: result.flagged, matches: result.matches });
  }
}

for (const testCase of censorCases) {
  const actual = shared.censorMatch(testCase.text);

  if (actual !== testCase.expected) {
    failed += 1;
    console.error("FAIL", { text: testCase.text, expected: testCase.expected, actual });
  }
}

for (const testCase of placeholderToggleCases) {
  const result = shared.analyzeProfanity(testCase.text, testCase.detector);

  if (result.flagged !== testCase.expected) {
    failed += 1;
    console.error("FAIL", { text: testCase.text, expected: testCase.expected, actual: result.flagged, matches: result.matches });
  }
}

const expectedEntries = [
  {
    startSeconds: 5,
    timestamp: "0:05",
    censoredMatch: "[bl---]",
    contextBefore: "this line contains",
    contextAfter: "here",
    ignored: true
  },
  {
    startSeconds: 83,
    timestamp: "1:23",
    censoredMatch: "fu--",
    contextBefore: "this line says",
    contextAfter: "once",
    ignored: false
  },
  {
    startSeconds: 83,
    timestamp: "1:23",
    censoredMatch: "so- of a bi---",
    contextBefore: "he called him",
    contextAfter: "today",
    ignored: false
  }
];

const migratedSettings = shared.mergeSettings({
  mutePlaceholderCues: false
});

if (
  JSON.stringify(
    flaggedWordEntries.map(({ startSeconds, timestamp, censoredMatch, contextBefore, contextAfter, ignored }) => ({
      startSeconds,
      timestamp,
      censoredMatch,
      contextBefore,
      contextAfter,
      ignored
    }))
  ) !== JSON.stringify(expectedEntries)
) {
  failed += 1;
  console.error("FAIL", { expectedEntries, actualEntries: flaggedWordEntries });
}

if (migratedSettings.muteNamedPlaceholderCues !== false || migratedSettings.muteSymbolPlaceholderCues !== false) {
  failed += 1;
  console.error("FAIL", { message: "Legacy mutePlaceholderCues did not migrate to both new placeholder toggles.", migratedSettings });
}

if (
  occurrenceCase.occurrences.length !== 1 ||
  occurrenceCase.occurrences[0].displayMatch !== "fuck" ||
  occurrenceCase.occurrences[0].contextBefore !== "this line says" ||
  occurrenceCase.occurrences[0].contextAfter !== "once"
) {
  failed += 1;
  console.error("FAIL", { message: "Occurrence context extraction failed.", occurrenceCase });
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`Passed ${cases.length + censorCases.length + placeholderToggleCases.length + 3} smoke checks.`);
}
