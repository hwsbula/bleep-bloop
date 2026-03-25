(function initSharedIndex(root) {
  const namespace = root.BleepBloopShared || {};

  root.BleepBloopShared = namespace;

  if (typeof module !== "undefined" && module.exports) {
    Object.assign(namespace, require("./constants.js"));
    Object.assign(namespace, require("./settings.js"));
    Object.assign(namespace, require("./detector.js"));
    Object.assign(namespace, require("./formatting.js"));
    module.exports = namespace;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
