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
      const { savedScreenshot } = await chrome.storage.local.get('savedScreenshot')

      var base_txt = "Act as a specialized assistant. Follow instructions precisely and provide concise, accurate answers. Constraint: Every line of your output must contain a maximum of 8 words. If a sentence is longer, you must use a line break. Language: Respond in the same language as the provided instructions (Default: English)."

      if (custom_prmpt) {
        base_txt += " " + custom_prmpt
      }

      var final_prmpt = base_txt + " " + savedSelection


      const { api_key_val } = await chrome.storage.local.get('api_key_val')
      var api_k = api_key_val || ""

      if (!api_k) {
        try {
          const env_req = await fetch('./.env')
          const env_txt = await env_req.text()
          const match = env_txt.match(/GROQ_API_KEY=(.*)/)
          if (match) api_k = match[1].trim()
        } catch (e) {
          console.log("no env")
        }
      }
      var url = "https://api.groq.com/openai/v1/chat/completions"

      var model_name = "llama-3.3-70b-versatile"
      var messages = [{ "role": "user", "content": final_prmpt }]

      if (savedScreenshot) {
        model_name = "meta-llama/llama-4-scout-17b-16e-instruct"
        messages = [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": final_prmpt
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": savedScreenshot
                }
              }
            ]
          }
        ]
      }

      var pay_load = {
        "model": model_name,
        "messages": messages
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
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;

      const { screenshot_enabled } = await chrome.storage.local.get('screenshot_enabled');
      if (screenshot_enabled) {
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.log("Capture failed: " + chrome.runtime.lastError.message);
            chrome.storage.local.remove('savedScreenshot');
          } else {
            chrome.storage.local.set({ savedScreenshot: dataUrl });
            console.log("Screenshot captured and saved.");
          }
        });
      } else {
        chrome.storage.local.remove('savedScreenshot');
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const selection = window.getSelection().toString();
          if (selection) {
            console.log("Danoff Extension: Text selected:", selection);
            try {
              const el = document.createElement('textarea');
              el.value = selection;
              el.setAttribute('readonly', '');
              el.style.position = 'absolute';
              el.style.left = '-9999px';
              document.body.appendChild(el);
              el.select();
              document.execCommand('copy');
              document.body.removeChild(el);
              console.log("Text copied to clipboard.");
            } catch (e) {
              console.log("Clipboard copy failed: " + e);
            }
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