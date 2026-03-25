# Bleep Bloop

Standalone repository for a Chrome-compatible extension that mutes profanity on YouTube watch pages with no external APIs.

This repository is scoped only to `Bleep Bloop`. It does not depend on `Project Architect` conventions, tooling, or folder structure.

## Structure

- `docs/`: brief, spec, implementation, usage, validation, and decision records
- `tests/smoke/`: direct Node smoke checks
- `extension/`: unpacked browser extension source
- `extension/shared/`: shared settings, detector, and formatting helpers
- `extension/content/`: YouTube runtime split by responsibility
- `extension/ui/`: popup and options interfaces

## Load

Open `chrome://extensions`, enable `Developer mode`, click `Load unpacked`, and select this repository's `extension/` directory.

## Runtime Summary

- Primary mode: transcript-driven line mute scheduling
- Fallback mode: live-caption profanity detection
- Storage: `chrome.storage.sync`

## Known Limits

- Transcript and menu selectors on YouTube are heuristic and may need updating if the UI changes.
- The extension does not do word-level timing.
- Some videos do not expose transcripts or captions.
