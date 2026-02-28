# Danoff Extension

A simple Chrome extension that secretly helps you using the Groq AI API.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the extension folder.

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

1. Select any text on a webpage, then save it with `Ctrl+Shift+L` (`Command+Shift+L` on Mac).
2. Press the shortcut (Default: `Ctrl+Shift+K` or `Command+Shift+K`).
3. The page URL will temporarily change to display the AI's response.

