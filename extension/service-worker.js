importScripts("shared/index.js", "shared/constants.js", "shared/settings.js");

const { STORAGE_KEY, mergeSettings } = self.BleepBloopShared;

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const merged = mergeSettings(stored[STORAGE_KEY]);

  await chrome.storage.sync.set({
    [STORAGE_KEY]: merged
  });
});
