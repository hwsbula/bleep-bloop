# Assumptions Log

| ID | Assumption | Why It Was Made | Risk | Confirm Later |
| --- | --- | --- | --- | --- |
| A-001 | The target site is YouTube watch pages. | The request references a transcript panel with a `Show transcript` action, which is consistent with YouTube. | medium | yes |
| A-002 | Transcript timestamps are line-based, not word-based. | The request explicitly states the transcript is lined by line. | low | no |
| A-003 | Transcript DOM selectors may change, so heuristics must be resilient. | YouTube uses an SPA and changes markup periodically. | high | yes |
| A-004 | Some videos will not expose an auto-openable transcript, so a fallback is needed. | Transcript availability varies by video and language settings. | high | yes |
| A-005 | Muting the entire transcript line is acceptable even if it over-mutes slightly. | The request accepts line-level muting as the practical tradeoff. | low | no |
