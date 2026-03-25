# Implementation Plan

## Scope Summary

Create a Manifest V3 extension that:

- Runs on YouTube watch pages
- Attempts to open the transcript panel automatically
- Parses transcript timestamps and text into mute intervals
- Detects profanity, redactions, and placeholders
- Mutes the video during flagged line intervals
- Falls back to live-caption detection when transcript access is unavailable

## Dependencies

- Chromium-based browser with unpacked extension support
- YouTube transcript or captions availability on the viewed video

## Milestones

1. Scaffold the extension and storage model.
2. Implement transcript parsing and profanity detection.
3. Implement mute scheduling and live-caption fallback.
4. Add popup and options interfaces.
5. Document usage, limits, and validation steps.

## Task Sequence

1. Create the project packet and extension folder structure.
2. Add shared settings and profanity-detection utilities.
3. Build the content script for YouTube page discovery, transcript automation, parsing, and mute control.
4. Add popup controls for enable state, transcript open, and rescan.
5. Add options for term customization and mute padding.
6. Run syntax validation and a detector smoke test.
7. Record usage notes and known limitations.

## Acceptance Criteria

- The extension loads without build tooling.
- Popup and options pages persist settings via `chrome.storage.sync`.
- The content script can identify a YouTube `<video>` element and track playback.
- Profane transcript lines are converted into mute windows and applied while playing.
- When transcripts are unavailable, live captions can still trigger temporary muting.

## Validation Plan

- Run static syntax checks on all extension scripts.
- Run a small detector smoke test against representative transcript strings.
- Manually load the extension in a Chromium-based browser and test against a YouTube video with a transcript.

## Rollback Or Contingency Notes

- If transcript auto-open is unreliable on a given UI variant, disable auto-open and require the user to click `Show transcript`.
- If transcript parsing fails, the live-caption fallback still provides partial coverage.
