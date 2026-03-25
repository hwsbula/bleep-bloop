# Bleep Bloop Validation

## Static Checks Run

- `node --check extension/service-worker.js`
- `node --check extension/shared/index.js`
- `node --check extension/shared/constants.js`
- `node --check extension/shared/settings.js`
- `node --check extension/shared/detector.js`
- `node --check extension/shared/formatting.js`
- `node --check extension/content/state.js`
- `node --check extension/content/ignored-instances.js`
- `node --check extension/content/muting.js`
- `node --check extension/content/dom.js`
- `node --check extension/content/transcript.js`
- `node --check extension/content/captions.js`
- `node --check extension/content/index.js`
- `node --check extension/ui/popup/popup.js`
- `node --check extension/ui/options/options.js`
- `node tests/smoke/detector.smoke.js`
- `node -e "JSON.parse(require('fs').readFileSync('extension/manifest.json','utf8')); console.log('manifest ok')"`

## Results

- All JavaScript files passed syntax checks.
- The detector smoke test passed 5 representative cases for explicit and redacted profanity.
- The manifest parsed successfully as valid JSON.

## Remaining Validation

- Manual browser validation is still required because transcript opening and transcript-row selectors depend on YouTube’s live DOM.
- Test against:
  - A video with a visible transcript
  - A video that requires clicking `Show transcript`
  - A video with captions but no transcript
  - A clean video to verify the extension does not over-mute
