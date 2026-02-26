# Danoff Extension

A simple Chrome extension that secretly helps you using the Groq AI API.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the extension folder.

## Configuration

This extension requires a Groq API key to function.

1. **Get a Free API Key**:
   - Go to [https://console.groq.com/keys](https://console.groq.com/keys).
   - Sign up/Login and create a new API key.

2. **Setup Environment**:
   - Create a new file named `.env` in the root folder of the extension (where `manifest.json` is).
   - Add your API key to the file like this:
     ```
     GROQ_API_KEY=your_api_key_here
     ```
   - Save the file.

3. **Reload Extension**:
   - Go back to `chrome://extensions/` and click the reload icon for Danoff.

## Usage

1. Select any text on a webpage save it with ctrl+shift+l (`Command+Shift+L`).
2. Press the shortcut (Default: `Ctrl+Shift+K` or `Command+Shift+K`).
3. The page URL will temporarily change to display the AI's response.      