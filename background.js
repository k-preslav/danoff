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




  console.log("Background:", command);


  if (command === "change-url") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => { history.replaceState({}, "", "/Please·Wait") }
      })

      const { savedSelection } = await chrome.storage.local.get('savedSelection')
      var { custom_prmpt } = await chrome.storage.local.get('custom_prmpt')

      var base_txt = "Answer this question for a text. Make it short but make sure to give correct answers. You can answer in any language. If it is a code question give the full code"

      if (custom_prmpt) {
        base_txt += " " + custom_prmpt
      }

      var final_prmpt = base_txt + " " + savedSelection



      var api_k = "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"
      var url = "https://api.groq.com/openai/v1/chat/completions"

      var pay_load = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
          { "role": "user", "content": final_prmpt }
        ]
      }

      try {
        var res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_k
          },
          body: JSON.stringify(pay_load)
        })

        var json_d = await res.json()
        var got_txt = "err"

        if (json_d.choices && json_d.choices[0].message) {
          got_txt = json_d.choices[0].message.content
        } else if (json_d.error) {
          got_txt = "API Error: " + json_d.error.message
        } else {
          got_txt = "Unknown Error: " + JSON.stringify(json_d)
        }

        console.log("Groq API Response:", json_d)

        var lines_arr = got_txt.split('\n').map(l => l.trim().replace(/\s+/g, '·'))

        var curr_l = 1

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (l_arr, c_l) => {
            history.replaceState({}, "", `/[${c_l}/${l_arr.length}]··${l_arr[0]}`)
          },
          args: [lines_arr, curr_l]
        })

        chrome.storage.local.set({
          responseData: { responseLines: lines_arr, currentLine: curr_l }
        })


      } catch (e) {
        console.log("err:: " + e)
      }


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