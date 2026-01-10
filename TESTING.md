# Grok Imagine Loop Extension - Testing & Usage Guide

## Installation
1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select the directory: `/Users/fen/NextCloud/apps/chrome-extension/grok-extension`.
5.  *If reinstalling due to error, click "Retry" or reload.*

## Usage Instructions
1.  **Navigate to Grok**: Go to [x.com/i/grok](https://x.com/i/grok) OR [grok.com/imagine](https://grok.com/imagine).
2.  **Open Extension**: Click the "Grok Imagine Loop" icon.
3.  **Start a Loop**:
    *   **Initial Image**: (Optional) Select a file.
    *   **Prompts**: Enter prompts for your sequence.
    *   **Loops**: Number of segments to generate.
    *   Click "Start Generation".
4.  **The Dashboard**:
    *   A floating panel will appear on the right side of the page.
    *   It shows the status of each segment.
    *   **Previews**: Watch video segments directly in the panel.
    *   **Download**: Click "Download" to save a segment to your computer.
    *   **Regenerate**: If a segment isn't right, click "Regenerate" to try again with the previous input.

## Troubleshooting
*   **"Manifest is not valid"**: This has been fixed. Please reload the extension.
*   **"File input not found"**: The extension tries to auto-click the upload button to find the input. If it fails, please click the "Image/Upload" icon in Grok manually *once* to open the dialog, then try starting again.
*   **"Could not find text input/Timeout"**: If your network is slow or the UI takes long to load, increase the **Timeout** setting in the extension popup (default is 30 seconds) to give it more time.
*   **"Receiving end does not exist"**: This should be fixed automatically. If seen, simply try clicking "Start" again.
