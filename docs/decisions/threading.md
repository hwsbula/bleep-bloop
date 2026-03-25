# Threading Decision Record

## Objective

Deliver a working browser extension that mutes profane YouTube transcript lines with no paid APIs.

## Route ID

R-AUTO

## Decision

one thread

## Reasoning

- The codebase is being created from scratch and the main components share runtime state.
- Splitting transcript parsing, muting, and UI into separate workstreams would add overhead without reducing risk.
- The highest-risk work is DOM detection, which is easiest to validate from one coherent implementation.

## Workstreams

- Extension scaffold
- Transcript and caption detection
- Audio muting control
- Documentation and validation

## Risks

- YouTube may change transcript markup and interaction patterns.
- Some videos may lack transcripts or captions entirely.
- Line-level timing can mute slightly before or after the spoken profanity.

## Review Trigger

Revisit the decision if support expands beyond YouTube or if automated testing and browser-store packaging become separate workstreams.
