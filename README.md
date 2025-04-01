# Web Content to Local LLM

A Chrome extension that extracts content from webpages and sends it to a local LLM (Language Model) running on your machine for analysis.

## Features

- Adds a floating button to webpages for easy content extraction
- Sends extracted content to a local LLM (like LM Studio) running on localhost
- Configurable system prompt to guide the LLM's response
- Customizable position for the floating button
- Adjustable parameters for the LLM (max tokens, temperature)
- Easy-to-use settings interface
- Works with any OpenAI API-compatible local LLM server

## Requirements

- Chrome browser (or other Chromium-based browsers like Edge, Brave, etc.)
- A local LLM server running on localhost (e.g., [LM Studio](https://lmstudio.ai/))
- The local LLM server must be compatible with the OpenAI API format

## Installation

### From Source

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The extension should now be installed and visible in your extensions list

### Configuration

1. Click on the extension icon in your browser toolbar to open the settings popup
2. Configure the LLM endpoint URL (default: `http://localhost:1234/v1/chat/completions`)
3. Customize the system prompt to guide how the LLM processes webpage content
4. Adjust the button position, max tokens, and temperature as needed
5. Click "Save Settings" to apply the changes

## Usage

1. Navigate to any webpage you want to analyze
2. Click the floating "Extract & Analyze" button that appears on the page
3. The extension will extract the relevant content from the page and send it to your local LLM
4. View the LLM's analysis in the popup modal
5. Use the "Copy to Clipboard" button to save the results if needed

## Setting Up LM Studio

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Download a compatible language model
3. In LM Studio, enable the local server in settings
4. Make sure the server is running on port 1234 (or update the extension settings accordingly)
5. Test the connection by clicking the extension icon and checking the LLM status

## Troubleshooting

- **Button not appearing**: Refresh the page or check if the extension is enabled
- **"Disconnected" status**: Ensure your local LLM server is running and accessible
- **Poor extraction results**: The extension tries to identify the main content of a page, but complex layouts may cause issues
- **No response from LLM**: Check if your local LLM is properly configured and has enough resources

## Customization

You can customize how the extension works by modifying the following files:

- `content.js`: Change how content is extracted from webpages
- `content.css`: Modify the appearance of the floating button and result modal
- `popup.html` and `popup.css`: Change the settings interface
- `background.js`: Adjust how the extension communicates with the LLM server

## Privacy

This extension processes webpage content locally and only communicates with a server running on your own machine. No data is sent to external servers.

## License

MIT License
