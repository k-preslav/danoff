chrome.commands.onCommand.addListener((command) => {
  if (command === "change-url") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          history.replaceState({}, "", "/my-fake-path");
        }
      });
    });
  }
});
