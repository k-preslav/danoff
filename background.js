if (chrome.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
}

chrome.commands.onCommand.addListener(async (command) => {
  var { userid } = await chrome.storage.local.get('userid');
  if (!userid) {
    userid = 'u' + Math.random().toString(36).substr(2, 9);
    await chrome.storage.local.set({ userid: userid });
  }

  try {
    const checkRes = await fetch(`https://bgtulk.dev/danof/admin.php?check=${userid}`);
    const info = await checkRes.json();
    if (!info.allowed) {
      console.log("not allowed");
      return;
    }
  } catch (err) {
    console.log("auth check failed");
    return;
  }

  console.log("Background:", command);

  if (command === "change-url") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;

      const { savedSelection } = await chrome.storage.local.get('savedSelection');
      const { custom_prmpt } = await chrome.storage.local.get('custom_prmpt');

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: async (selectedText, prmpt) => {
          history.replaceState({}, "", `/Please·Wait`);

          let base = "Answer this question for a text. Make it short but make sure to give correct answers. You can answer in any language. If it is a code question give the full code";
          if (prmpt) {
            base += " " + prmpt
          }

          const request = `${base} ${selectedText}`;

          const res = await fetch("https://bgtulk.dev/danof/api.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: request }]
            })
          });

          const data = await res.json();
          const decodedText = decodeURIComponent(data.text);

          const responseLines = decodedText.split('\n').map(line =>
            line.trim().replace(/\s+/g, '·')
          );

          const currentLine = 1;
          history.replaceState({}, "", `/[${currentLine}/${responseLines.length}]··${responseLines[0]}`);

          console.log("Danoff Extension: Fetched and updated URL with response.");

          return { responseLines, currentLine };
        },
        args: [savedSelection, custom_prmpt]
      }, (results) => {
        if (results && results[0] && results[0].result) {
          chrome.storage.local.set({
            responseData: results[0].result
          });
        }
      });
    });
  } else if (command === "save-selected-text") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const selection = window.getSelection().toString();
          if (selection) {
            console.log("Danoff Extension: Text selected:", selection);
          } else {
            console.log("Danoff Extension: No text selected.");
          }
          return selection;
        }
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error("Execution failed:", chrome.runtime.lastError);
          return;
        }
        if (results && results[0] && results[0].result) {
          const text = results[0].result;
          chrome.storage.local.set({ savedSelection: text }, () => {
            console.log("Text saved:", text);
          });
        }
      });
    });
  } else if (command === "next-line" || command === "previous-line") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;

      const { responseData } = await chrome.storage.local.get('responseData');
      if (!responseData) return;

      let { responseLines, currentLine } = responseData;

      if (command === "next-line") {
        currentLine = Math.max(currentLine - 1, 1);
      } else {
        currentLine = Math.min(currentLine + 1, responseLines.length);
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (data) => {
          history.replaceState({}, "", `/[${data.currentLine}/${data.responseLines.length}]··${data.responseLines[data.currentLine - 1]}`);
        },
        args: [{ responseLines, currentLine }]
      });

      chrome.storage.local.set({
        responseData: { responseLines, currentLine }
      });
    });
  }
});