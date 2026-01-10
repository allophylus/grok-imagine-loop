# Grok Imagine Loop Extension

A Chrome Utility Extension to automate video generation loops on [Grok.com](https://grok.com).

This tool allows you to create seamless video sequences by automatically using the last frame of a generated video as the input for the next generation, creating a continuous "flow" effect.

## Features

- **🔄 Auto-Looping:** Automatically chains video generations.
- **🖼️ Smart Frame Extraction:** Extracts the last frame of a video to use as the start of the next one.
- **⏸️ Pause & Resume:** Pause your generation to check progress, and resume later.
- **💾 State Persistence:** Safely reload your browser; your progress is saved.
- **⏱️ Human-Like Delays:** Randomized delays between actions to avoid rate limits.
- **🛠️ Smart Recovery:** Options to regenerate single segments or cascade changes to all future segments.

## Installation (Google Chrome)

1.  **Download the Code:**
    *   Clone this repository or download the ZIP file and extract it.
2.  **Open Extension Management:**
    *   Open Google Chrome.
    *   Navigate to `chrome://extensions/` (enter this in the URL bar).
3.  **Enable Developer Mode:**
    *   Toggle the **"Developer mode"** switch in the top-right corner of the page.
4.  **Load the Extension:**
    *   Click the **"Load unpacked"** button that appears in the top-left.
    *   Select the `grok-extension` folder (the folder containing `manifest.json`).
5.  **Pin the Extension:**
    *   Click the "Puzzle Piece" icon in your Chrome toolbar.
    *   Find "Grok Imagine Loop" and click the **Pin** icon to make it easily accessible.

## Usage

1.  **Open Grok:**
    *   Go to [Grok.com](https://grok.com) or the Grok tab on X.com.
    *   *Note: Ensure you are logged in.*
2.  **Launch the Extension:**
    *   Click the extension icon in your toolbar.
    *   A popup will appear.
3.  **Configure Your Loop:**
    *   **Initial Image (Optional):** Upload a starting image if you want to animate a specific picture.
    *   **Prompts:** Enter your video prompts, one per line.
    *   **Loops:** How many times to cycle through the prompts.
    *   **Timeout:** Max time to wait for generation (default 120s).
4.  **Start:**
    *   Click **Start Generation**.
    *   The "Grok Loop" dashboard will appear on the page.

**Tips:**
*   Use the **Pause** button on the dashboard if you need to inspect a video.
*   The extension automatically handles the "Upload" process for you. **Do not** close the tab while it's running.

## Support

If you find this tool useful, consider buying me a coffee!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/mrdom78)

## Disclaimer

This is a third-party extension and is not affiliated with xAI or Grok. Use responsibly and adhere to the platform's terms of service.
