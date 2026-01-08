chrome.commands.onCommand.addListener((command) => {
  console.log("Background:", command);

  if (command === "change-url") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;

      // Get the saved text
      const { savedSelection } = await chrome.storage.local.get('savedSelection');
      
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: async(selectedText) => {
          history.replaceState({}, "", `/Please·Wait`);

          const request = `Answer this question for a text. Make it short but make sure to give correct answers. If it is a code question give the full code ${selectedText}`;

          const res = await fetch("https://danoff.loophole.site/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: request }]
            })
          });

          const data = await res.json();
          const decodedText = decodeURIComponent(data.text);
          
          const responseLines = decodedText.split('\n').map(line => 
            line.replace(/\s+/g, '·').replace(/[^a-zA-Z0-9·\-_.~]/g, '')
          );
          
          const currentLine = 1;
          history.replaceState({}, "", `/[${currentLine}/${responseLines.length}]··${responseLines[0]}`);

          console.log("Danoff Extension: Fetched and updated URL with response.");
          
          // Store response data for navigation
          return { responseLines, currentLine };
        },
        args: [savedSelection]
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

      // Update stored data
      chrome.storage.local.set({ 
        responseData: { responseLines, currentLine } 
      });
    });
  }
});