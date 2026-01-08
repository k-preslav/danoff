chrome.commands.onCommand.addListener((command) => {
  if (command === "change-url") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: async() => {
          history.replaceState({}, "", `/Please·Wait`);

          const res = await fetch("https://danoff.loophole.site/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: "Hello from extension" }]
            })
          });

          const data = await res.json();
          const decodedText = decodeURIComponent(data.text);
          const text = decodedText.replace(/\s+/g, '·').replace(/[^a-zA-Z0-9·\-_.~]/g, '');
          history.replaceState({}, "", `/${text}`);
        }
      });
    });
  }
});
