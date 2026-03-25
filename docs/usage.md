# Bleep Bloop Usage

## Load The Extension

1. Open Chromium or Chrome.
2. Navigate to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this repository's `extension/` directory.

## Default Runtime Behavior

- The extension runs only on YouTube watch pages.
- It tries to find the page video element.
- It attempts to open the transcript panel automatically when `Auto-open transcript` is enabled.
- It scans transcript lines for profanity, redacted spellings like `f*ck`, named placeholder cues like `[bleep]`, and symbol placeholder cues like `[ __ ]`.
- It mutes the video for the duration of any flagged transcript line.
- If transcript automation fails, it watches live captions as a fallback.

## Practical Notes

- `Plugin` is not the precise term here. This deliverable is a browser extension because it operates through browser APIs and page DOM access.
- The transcript may still need to be opened manually on some YouTube UI variants. The popup includes `Open Transcript` and `Rescan Transcript` actions.
- Timing is line-level, so the extension may mute slightly earlier or later than the spoken word. Use the padding controls in the options page to tune this.
- The options page can independently disable named placeholder muting like `[bleep]`, symbol placeholder muting like `[ __ ]`, and popup-word censorship.
- If captions and transcripts are both unavailable, the extension has no text source and cannot detect profanity.
