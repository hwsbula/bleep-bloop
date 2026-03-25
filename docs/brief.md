# Bleep Bloop Brief

## Objective

Build `Bleep Bloop`, a Chrome-compatible browser extension that mutes profanity on YouTube watch pages without using any paid or external transcript APIs. The extension should read transcript lines when available, flag profane or redacted lines, and mute the video for the full duration of each flagged line.

## Route ID

R-AUTO

## Repository Scope

This project is maintained as a standalone repository for `Bleep Bloop`.

## Recommended Execution Model

- single-thread
- The work is tightly coupled across detection heuristics, DOM automation, audio control, and extension packaging.

## Workstreams

- Browser extension scaffold and persistence
- Transcript and live-caption profanity detection
- Documentation, validation, and handoff

## Deliverables

- Loadable Manifest V3 browser extension source
- Transcript-driven mute scheduler with live-caption fallback
- Repository documentation covering the technical spec, implementation plan, usage notes, and limitations

## Success Criteria

- The extension can be loaded unpacked in Chromium-based browsers.
- On YouTube watch pages, the extension can attempt to open the transcript panel automatically.
- The extension flags explicit profanity and common redacted placeholders such as `[ __ ]`, `f*ck`, and `sh-t`.
- When a flagged transcript line is active, the extension mutes the video for the line interval.
- If transcript automation fails, the extension still has a live-caption fallback path.

## Scope

### In Scope

- YouTube watch-page support
- Transcript parsing from the visible page DOM
- Line-level mute timing
- Configurable profanity list and mute padding
- Popup and options UI

### Out of Scope

- Word-level profanity timing
- Server-side processing
- Paid APIs
- Native browser-store submission assets
