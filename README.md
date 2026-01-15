# Grok Imagine Loop Extension

A Chrome Utility Extension to automate video generation loops on [Grok.com](https://grok.com).

This tool allows you to create seamless video sequences by automatically using the last frame of a generated video as the input for the next generation, creating a continuous "flow" effect.

## Features

*   **🔄 Auto-Looping (Scenes):** Automatically chains video generations. Define how many "Scenes" you want for your story.
*   **🖼️ Smart Frame Extraction:** Extracts the last frame of a video to use as the start of the next one.
*   **⚡ Upscale Support:** Check "Upscale Result" to automatically request the High Quality version of each video.
*   **📥 Auto-Download:** Automatically saves each generated segment to your Downloads folder.
*   **💾 State Persistence:**
    *   **Input Saving:** Your Prompts, Scene counts, and settings are saved automatically.
    *   **Config Presets:** Save and load multiple "Loops" (Settings + Scenes) for easy reuse.
*   **⇱ Side Panel Workflow:**
    *   **Native Integration:** Runs directly in the Chrome Side Panel for a seamless experience.
    *   **Optional Dashboard:** Toggle the floating on-page overlay if you prefer a clean view.
*   **🛡️ Anti-Bot Protection:** Human-like typing, clicking, and randomized delays to avoid detection.
*   **🛠️ Full Control:** 
    *   **Regenerate:** Retry any specific segment directly from the list.
    *   **Resume with Edits:** Edit future prompts while paused, then resume to apply changes dynamically.

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
2.  **Launch the Extension:**
    *   Click the extension icon in your toolbar.
    *   *Optional:* Click the `⇱` button to pop the controller out into its own window.
3.  **Configure Your Loop:**
    *   **Initial Image (Optional):** Upload a starting image to begin your story on a specific frame.
    *   **Prompts:** Enter your video prompts, one per line.
    *   **Scenes:** How many times to cycle through the prompts.
    *   **Timeout:** Max time to wait for generation (default 120s).
    *   **Upscale Result:** Enable to wait for and capture the High Quality version.
    *   **Auto-Download:** Enable to save every video segment automatically.
4.  **Start:**
    *   Click **Start Generation**.
    *   The "Grok Loop" dashboard will appear on the page.

**Tips:**
*   Use the **Pause** button on the dashboard if you need to inspect a video.
*   Use **Reset Inputs** at the bottom of the popup to clear all saved settings and images.

## Support

If you find this tool useful, consider buying me a coffee!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/mrdom78)

## Disclaimer

This is a third-party extension and is not affiliated with xAI or Grok. Use responsibly and adhere to the platform's terms of service.

> [!CAUTION]
> **Use at your own risk.** Automated interactions may be flagged as bot activity by Grok/xAI. Excessive or unnatural usage patterns could lead to rate limits, account suspension, or IP bans. The authors of this extension are not responsible for any actions taken against your account.
