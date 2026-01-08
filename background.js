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
  } else if (command === "save-selected-text") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => window.getSelection().toString()
      }, (results) => {
        if (results && results[0] && results[0].result) {
          const text = results[0].result;
          chrome.storage.local.set({ savedSelection: text }, () => {
             console.log("Text saved:", text);
          });
        }
      });
    });
  }
});
