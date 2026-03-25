(function initDom(root) {
  const app = root.BleepBloopContent;

  if (!app) {
    return;
  }

  app.isSupportedPage = function isSupportedPage() {
    return location.hostname === "www.youtube.com" && location.pathname === "/watch";
  };

  app.getCurrentVideoId = function getCurrentVideoId() {
    try {
      return new URL(location.href).searchParams.get("v") || "";
    } catch (_error) {
      return "";
    }
  };

  app.syncTranscriptRoot = function syncTranscriptRoot() {
    const nextRoot = app.findTranscriptRoot();

    if (nextRoot === app.state.transcriptRoot) {
      return;
    }

    app.disconnectTranscriptObserver();
    app.state.transcriptRoot = nextRoot;

    if (!app.state.transcriptRoot) {
      return;
    }

    app.state.transcriptObserver = new MutationObserver(() => {
      window.setTimeout(() => app.rescanTranscript("transcript-mutation"), 150);
    });

    app.state.transcriptObserver.observe(app.state.transcriptRoot, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };

  app.disconnectTranscriptObserver = function disconnectTranscriptObserver() {
    if (app.state.transcriptObserver) {
      app.state.transcriptObserver.disconnect();
      app.state.transcriptObserver = null;
    }

    app.state.transcriptRoot = null;
  };

  app.syncCaptionRoot = function syncCaptionRoot() {
    const nextRoot = app.findCaptionRoot();

    if (nextRoot === app.state.captionRoot) {
      return;
    }

    app.disconnectCaptionObserver();
    app.state.captionRoot = nextRoot;

    if (!app.state.captionRoot) {
      return;
    }

    app.state.captionObserver = new MutationObserver(app.handleCaptionMutation);
    app.state.captionObserver.observe(app.state.captionRoot, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };

  app.disconnectCaptionObserver = function disconnectCaptionObserver() {
    if (app.state.captionObserver) {
      app.state.captionObserver.disconnect();
      app.state.captionObserver = null;
    }

    app.state.captionRoot = null;
  };

  app.findTranscriptRoot = function findTranscriptRoot() {
    for (const selector of app.transcriptSelectors) {
      const nodes = [...document.querySelectorAll(selector)];
      const visible = nodes.find(app.isVisible);

      if (visible) {
        return visible;
      }
    }

    return null;
  };

  app.findCaptionRoot = function findCaptionRoot() {
    for (const selector of app.captionSelectors) {
      const node = document.querySelector(selector);

      if (node && app.isVisible(node)) {
        return node;
      }
    }

    return null;
  };

  app.isVisible = function isVisible(node) {
    if (!node || !(node instanceof HTMLElement)) {
      return false;
    }

    const styles = window.getComputedStyle(node);

    return styles.display !== "none" && styles.visibility !== "hidden" && node.offsetHeight > 0 && node.offsetWidth > 0;
  };

  app.ensureTranscriptOpen = async function ensureTranscriptOpen(force) {
    if (!app.state.settings.autoOpenTranscript && !force) {
      return false;
    }

    if (app.findTranscriptRoot()) {
      return true;
    }

    const now = Date.now();

    if (!force && now - app.state.transcriptOpenAttemptAt < 4000) {
      return false;
    }

    app.state.transcriptOpenAttemptAt = now;
    app.state.lastStatus = "Trying to open transcript";

    if (app.clickTranscriptButton()) {
      return true;
    }

    if (await app.expandDescriptionForTranscript()) {
      if (app.clickTranscriptButton()) {
        return true;
      }
    }

    const moreActionsButton = app.findMoreActionsButton();
    if (moreActionsButton) {
      moreActionsButton.click();
      await app.wait(350);

      if (app.clickTranscriptButton()) {
        return true;
      }
    }

    app.state.lastStatus = "Transcript may need manual opening";
    return false;
  };

  app.clickTranscriptButton = function clickTranscriptButton() {
    const transcriptButton = app.findClickableByText(/show transcript/i) || app.findClickableByAria(/show transcript/i);

    if (!transcriptButton) {
      return false;
    }

    transcriptButton.click();
    return true;
  };

  app.expandDescriptionForTranscript = async function expandDescriptionForTranscript() {
    const expandButton = app.findDescriptionExpandButton();

    if (!expandButton) {
      return false;
    }

    app.state.lastStatus = "Expanding description";
    expandButton.click();
    await app.wait(350);
    return true;
  };

  app.findDescriptionExpandButton = function findDescriptionExpandButton() {
    const containerSelectors = [
      "#description-inline-expander",
      "ytd-text-inline-expander",
      "ytd-expandable-video-description-body-renderer"
    ];
    const buttonSelectors = [
      "#expand",
      "button",
      "[role='button']",
      "tp-yt-paper-button",
      "yt-button-shape button"
    ];

    for (const containerSelector of containerSelectors) {
      const containers = [...document.querySelectorAll(containerSelector)].filter(app.isVisible);

      for (const container of containers) {
        const nodes = [...container.querySelectorAll(buttonSelectors.join(","))];
        const expandButton = nodes.find((node) => {
          if (!app.isVisible(node)) {
            return false;
          }

          const text = (node.innerText || node.textContent || "").trim();
          const ariaLabel = (node.getAttribute("aria-label") || "").trim();
          const combined = `${text} ${ariaLabel}`.trim().toLowerCase();

          if (!combined && node.id !== "expand") {
            return false;
          }

          if (/show transcript|more actions/.test(combined)) {
            return false;
          }

          return node.id === "expand" || /\bmore\b/.test(combined);
        });

        if (expandButton) {
          return expandButton;
        }
      }
    }

    return null;
  };

  app.findMoreActionsButton = function findMoreActionsButton() {
    return app.findClickableByAria(/more actions/i) || app.findClickableByText(/more actions/i);
  };

  app.findClickableByText = function findClickableByText(pattern) {
    const selectors = [
      "button",
      "[role='button']",
      "tp-yt-paper-item",
      "ytd-menu-service-item-renderer",
      "yt-button-shape button"
    ];

    const nodes = [...document.querySelectorAll(selectors.join(","))];
    return nodes.find((node) => app.isVisible(node) && pattern.test((node.innerText || node.textContent || "").trim()));
  };

  app.findClickableByAria = function findClickableByAria(pattern) {
    const selectors = ["button", "[role='button']", "yt-button-shape button"];
    const nodes = [...document.querySelectorAll(selectors.join(","))];

    return nodes.find((node) => app.isVisible(node) && pattern.test(node.getAttribute("aria-label") || ""));
  };

  app.wait = function wait(delayMs) {
    return new Promise((resolve) => window.setTimeout(resolve, delayMs));
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
