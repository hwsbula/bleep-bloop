# Decision Log

| ID | Date | Decision | Rationale | Impact |
| --- | --- | --- | --- | --- |
| D-001 | 2026-03-24 | Build a browser extension rather than a generic plugin. | The requested behavior depends on page DOM access, transcript panel interaction, and direct control of the in-page video element. | The deliverable is loadable in Chromium-based browsers without additional infrastructure. |
| D-002 | 2026-03-24 | Use transcript scheduling as the primary mute mechanism. | Transcript lines provide start times, which enables predictable line-level muting without external services. | Muting can happen ahead of a profane line rather than only after visual detection. |
| D-003 | 2026-03-24 | Add a live-caption fallback detector. | Transcript automation can fail when the transcript panel is unavailable or not open. | The extension still provides partial profanity suppression when transcripts are inaccessible. |
| D-004 | 2026-03-24 | Keep the implementation dependency-free. | The user prohibited paid APIs and the extension can run entirely with browser APIs and in-page DOM access. | The extension can be loaded unpacked directly with no install step. |
