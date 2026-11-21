(function () {
  const browserApi = globalThis.browser || globalThis.chrome;
  const settingKey = "keep_focused_enabled";
  const messageType = "danoff-focus-setting";

  function publish(enabled) {
    window.postMessage({ type: messageType, enabled: Boolean(enabled) }, "*");
  }

  browserApi.storage.local.get([settingKey], (result) => {
    publish(result[settingKey]);
  });

  browserApi.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[settingKey]) return;
    publish(changes[settingKey].newValue);
  });
})();
