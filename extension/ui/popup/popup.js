(function initPopup() {
  const shared = globalThis.BleepBloopShared;
  const enabledToggle = document.querySelector("#enabledToggle");
  const statusText = document.querySelector("#statusText");
  const transcriptState = document.querySelector("#transcriptState");
  const cueCount = document.querySelector("#cueCount");
  const flaggedCount = document.querySelector("#flaggedCount");
  const muteReason = document.querySelector("#muteReason");
  const flaggedWordsSummary = document.querySelector("#flaggedWordsSummary");
  const flaggedWordsEmpty = document.querySelector("#flaggedWordsEmpty");
  const flaggedWordsList = document.querySelector("#flaggedWordsList");
  const openTranscriptButton = document.querySelector("#openTranscriptButton");
  const rescanButton = document.querySelector("#rescanButton");
  const optionsButton = document.querySelector("#optionsButton");

  let activeTabId = null;
  let activeTabUrl = "";
  let currentSettings = shared.mergeSettings();

  initialize().catch((error) => {
    statusText.textContent = String(error?.message || error);
  });

  chrome.storage.onChanged.addListener(handleStorageChange);
  enabledToggle.addEventListener("change", handleToggleChange);
  flaggedWordsList.addEventListener("click", handleFlaggedWordClick);
  openTranscriptButton.addEventListener("click", () => runTabAction("OPEN_TRANSCRIPT"));
  rescanButton.addEventListener("click", () => runTabAction("RESCAN_TRANSCRIPT"));
  optionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());

  async function initialize() {
    currentSettings = await loadSettings();
    enabledToggle.checked = currentSettings.enabled;
    const activeTab = await loadActiveTab();
    activeTabId = activeTab?.id ?? null;
    activeTabUrl = activeTab?.url || "";
    await refreshStatus();
  }

  async function loadSettings() {
    const stored = await chrome.storage.sync.get(shared.STORAGE_KEY);
    return shared.mergeSettings(stored[shared.STORAGE_KEY]);
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== "sync" || !changes[shared.STORAGE_KEY]) {
      return;
    }

    currentSettings = shared.mergeSettings(changes[shared.STORAGE_KEY].newValue);
    enabledToggle.checked = currentSettings.enabled;
    refreshStatus().catch((error) => {
      statusText.textContent = String(error?.message || error);
    });
  }

  async function loadActiveTab() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    return tab || null;
  }

  async function handleToggleChange() {
    const settings = await loadSettings();
    settings.enabled = enabledToggle.checked;
    await chrome.storage.sync.set({
      [shared.STORAGE_KEY]: settings
    });
    currentSettings = settings;
    await refreshStatus();
  }

  async function runTabAction(type) {
    if (!activeTabId) {
      statusText.textContent = "No active tab found.";
      return;
    }

    const response = await sendMessage(activeTabId, {
      type
    });

    renderStatus(response);
  }

  async function refreshStatus() {
    if (!activeTabId) {
      statusText.textContent = "Open a YouTube tab.";
      renderFlaggedWords([], {
        transcriptOpen: false,
        supportedPage: false
      });
      return;
    }

    const response = await sendMessage(activeTabId, {
      type: "GET_STATUS"
    });

    renderStatus(response);
  }

  async function sendMessage(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (_error) {
      return {
        status: "Open a YouTube watch page.",
        transcriptOpen: false,
        cueCount: 0,
        flaggedCueCount: 0,
        flaggedWordEntries: [],
        lastMuteReason: "",
        lastError: ""
      };
    }
  }

  async function handleFlaggedWordClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const actionButton = target?.closest("button[data-instance-id]");

    if (actionButton) {
      if (!activeTabId) {
        statusText.textContent = "No active YouTube tab found.";
        return;
      }

      actionButton.disabled = true;

      const response = await sendMessage(activeTabId, {
        type: "SET_INSTANCE_IGNORED",
        instanceId: actionButton.dataset.instanceId,
        ignored: actionButton.dataset.nextIgnored === "true"
      });

      renderStatus(response);
      return;
    }

    const link = target?.closest("a[data-seconds]");

    if (!link) {
      return;
    }

    event.preventDefault();

    if (!activeTabId) {
      statusText.textContent = "No active YouTube tab found.";
      return;
    }

    const seconds = Number(link.dataset.seconds || 0);
    const response = await sendMessage(activeTabId, {
      type: "SEEK_TO_TIME",
      seconds
    });

    if (!response?.ok && link.getAttribute("href") && link.getAttribute("href") !== "#") {
      await chrome.tabs.update(activeTabId, {
        url: link.href
      });
      window.close();
      return;
    }

    renderStatus(response);
  }

  function renderStatus(status) {
    statusText.textContent = status?.lastError
      ? `${status.status}. ${status.lastError}`
      : status?.status || "No page receiver.";
    transcriptState.textContent = status?.transcriptOpen ? "Open" : "Closed";
    cueCount.textContent = String(status?.cueCount ?? 0);
    flaggedCount.textContent = String(status?.flaggedCueCount ?? 0);
    muteReason.textContent = status?.lastMuteReason ? `Last mute: ${status.lastMuteReason}` : "";
    renderFlaggedWords(status?.flaggedWordEntries || [], status);
  }

  function renderFlaggedWords(entries, status) {
    const items = Array.isArray(entries) ? entries : [];
    const activeCount = items.filter((entry) => entry?.ignored !== true).length;
    flaggedWordsSummary.textContent =
      items.length > 0 && activeCount !== items.length ? `${activeCount} active / ${items.length} total` : String(items.length);
    flaggedWordsList.textContent = "";

    if (items.length === 0) {
      flaggedWordsList.hidden = true;
      flaggedWordsEmpty.hidden = false;
      flaggedWordsEmpty.textContent = status?.transcriptOpen
        ? "No flagged words found in the current transcript."
        : status?.supportedPage
          ? "Open or scan a transcript to list matched words."
          : "Open a YouTube watch page to list matched words.";
      return;
    }

    flaggedWordsEmpty.hidden = true;
    flaggedWordsList.hidden = false;

    for (const [index, entry] of items.entries()) {
      const row = document.createElement("li");
      row.className = "flagged-word-row";
      row.classList.toggle("is-ignored", entry.ignored === true);

      const timestampLink = document.createElement("a");
      timestampLink.className = "timestamp-link";
      timestampLink.href = buildTimestampHref(entry.startSeconds);
      timestampLink.dataset.seconds = String(entry.startSeconds);
      timestampLink.textContent = entry.timestamp || shared.formatSeconds(entry.startSeconds);
      timestampLink.setAttribute("aria-label", `Jump to ${timestampLink.textContent}`);

      const details = document.createElement("div");
      details.className = "flagged-word-details";

      const meta = document.createElement("div");
      meta.className = "flagged-word-meta";

      const word = document.createElement("span");
      word.className = "flagged-word";
      word.textContent = currentSettings.censorPopupWords
        ? entry.censoredMatch || shared.censorMatch(entry.displayMatch || entry.match)
        : entry.displayMatch || entry.match;

      meta.append(word);

      if (entry.ignored === true) {
        const ignoredBadge = document.createElement("span");
        ignoredBadge.className = "ignored-badge";
        ignoredBadge.textContent = "Ignored";
        meta.append(ignoredBadge);
      }

      const context = document.createElement("p");
      context.className = "flagged-context";
      context.append(buildContextFragment(entry));

      details.append(meta, context);

      const toggleIgnoreButton = document.createElement("button");
      toggleIgnoreButton.type = "button";
      toggleIgnoreButton.className = "ignore-instance-button";
      toggleIgnoreButton.dataset.instanceId = String(entry.instanceId || "");
      toggleIgnoreButton.dataset.nextIgnored = entry.ignored === true ? "false" : "true";
      toggleIgnoreButton.textContent = entry.ignored === true ? "Unignore" : "Ignore";
      toggleIgnoreButton.setAttribute(
        "aria-label",
        `${toggleIgnoreButton.textContent} ${entry.displayMatch || entry.match} at ${timestampLink.textContent}`
      );

      row.append(timestampLink, details, toggleIgnoreButton);
      row.dataset.entryId = `${entry.startSeconds}:${entry.match}:${index}`;
      flaggedWordsList.append(row);
    }
  }

  function buildContextFragment(entry) {
    const fragment = document.createDocumentFragment();
    const before = String(entry?.contextBefore || "").trim();
    const after = String(entry?.contextAfter || "").trim();
    const matchText = currentSettings.censorPopupWords
      ? entry?.censoredMatch || shared.censorMatch(entry?.displayMatch || entry?.match)
      : entry?.displayMatch || entry?.match || "";

    if (before) {
      const beforeNode = document.createElement("span");
      beforeNode.className = "context-before";
      beforeNode.textContent = `${before} `;
      fragment.append(beforeNode);
    }

    const matchNode = document.createElement("span");
    matchNode.className = "context-match";
    matchNode.textContent = matchText;
    fragment.append(matchNode);

    if (after) {
      const afterNode = document.createElement("span");
      afterNode.className = "context-after";
      afterNode.textContent = ` ${after}`;
      fragment.append(afterNode);
    }

    return fragment;
  }

  function buildTimestampHref(seconds) {
    if (!activeTabUrl) {
      return "#";
    }

    try {
      const url = new URL(activeTabUrl);
      url.searchParams.set("t", `${Math.max(0, Math.floor(Number(seconds) || 0))}s`);
      return url.toString();
    } catch (_error) {
      return "#";
    }
  }
})();
