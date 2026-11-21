# Danoff Extension

A simple Chrome and Firefox extension that helps you using the Groq AI API.

## Installation

### Chrome

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the extension folder.

### Firefox

1. Clone or download this repository.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click "Load Temporary Add-on".
4. Select `manifest.json` from the extension folder.

## Configuration

This extension requires a Groq API key to function.

### Get a Free API Key

- Go to [https://console.groq.com/keys](https://console.groq.com/keys).
- Sign up/Login and create a new API key.

### Setting Your API Key

You can now enter your API key directly in the extension popup—no need to manually edit a file!

1. Click the Danoff extension icon in your browser.
2. In the popup, expand “API key settings”.
3. Paste your API key in the input field provided.
4. Click “Save”.

**Alternative:**  
You can still use a `.env` file in the root folder (where `manifest.json` is). Add your API key like this:
```
GROQ_API_KEY=your_api_key_here
```

## Usage

1. Save input with `Ctrl+Shift+L` (`Command+Shift+L` on Mac). Depending on settings, this saves selected text, takes a screenshot, or auto-grabs the whole page text invisibly.
2. Press `Ctrl+Shift+K` (`Command+Shift+K` on Mac) to request the answer.
3. Browse lines with `Ctrl+Shift+Down` / `Ctrl+Shift+Up`.
4. Restore clean URL at any time by pressing `Escape`.
5. Refreshing or navigating the page automatically restores the clean original URL without breaking the website.

* Ensure no other shortcuts are interfering, as this will prevent it from working. You can verify if the text is being selected after using the first shortcut by checking the browser console.

## Keep sites focused

Enable **Keep sites focused in background** in the extension popup to make supported pages report
themselves as visible and focused while you work in another tab. The setting overrides the standard
and legacy visibility properties, `document.hasFocus()`, and `window.focus()`/`window.blur()`;
suppresses visibility, focus, and blur events; and prevents page scripts from changing the reported
state. It is disabled by default and stored locally in the browser.


