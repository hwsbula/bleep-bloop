# Bleep Bloop Technical Spec

## System Objective

Mute profanity on YouTube videos using only client-side browser extension logic and transcript or caption text already present in the page.

## Components

- `manifest.json`: Manifest V3 definition, permissions, popup, options, and content-script registration
- `service-worker.js`: Initializes default settings on install
- `shared/*`: Shared defaults, storage helpers, timestamp parsing, profanity detection, and formatting helpers
- `content/*`: YouTube runtime logic for transcript automation, cue extraction, caption fallback, ignored-instance state, and mute control
- `ui/popup/*`: Quick controls and runtime status
- `ui/options/*`: Settings editor for profanity terms and timing

## Interfaces

- `chrome.storage.sync`: Persists extension settings
- `chrome.runtime.onMessage`: Popup-to-content actions such as status, rescan, and transcript open
- In-page DOM access: Transcript controls, transcript rows, caption overlays, and the YouTube `<video>` element

## Data Flow

1. Load settings from storage.
2. Detect the YouTube watch page and attach to the active video element.
3. Attempt to open the transcript panel when enabled.
4. Read transcript rows into `{ startSeconds, endSeconds, text, flagged }` cues.
5. During playback, compare `video.currentTime` against flagged cues and mute when within a flagged interval.
6. If transcript cues are unavailable or incomplete, watch live caption text and apply short fallback mutes when profanity appears onscreen.

## Environment Assumptions

- The browser supports Chrome Manifest V3 APIs.
- The user can load an unpacked extension.
- The user has access to videos with transcripts or captions.

## Security Considerations

- The extension is scoped to `https://www.youtube.com/*`.
- No network calls or external APIs are used.
- Only `storage` and `tabs` permissions are requested.

## Error Handling Strategy

- Keep runtime state tolerant of missing transcript panels, missing captions, and SPA page transitions.
- Expose status messages in the popup instead of failing silently.
- Use fallback live-caption muting when transcript parsing is not available.

## Observability Needs

- Popup shows transcript state, cue counts, and the last mute reason.
- Optional debug logging can be enabled from the options page.

## Test Strategy

- Syntax-check extension scripts with Node.
- Run a detector smoke test for explicit and redacted profanity.
- Manual browser verification on multiple YouTube videos.

## Deployment Or Release Considerations

- Current deliverable is a standalone unpacked extension repository.
- Browser-store packaging, icons, and review assets can be added later.
