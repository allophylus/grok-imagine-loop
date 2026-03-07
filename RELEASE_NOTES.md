# Release Notes - Grok Imagine Loop

## v1.6.7
- **Feature:** **Extend Mode**. New toggle in Settings to use Grok's native "Extend" feature for chaining video segments. When enabled, segments within each 5-segment window use the Extend button instead of extracting the last frame, resulting in smoother continuations and saving generation quota. The extension automatically falls back to last-frame extraction every 6th segment (or when Extend is unavailable).
  - Rolling windows of 5: Segments 1→generate, 2-5→extend, 6→extract frame, 7-10→extend, etc.
  - Upscaling is deferred to only the **last** segment in each extend window.
  - Downloads only occur after the final extended (and optionally upscaled) segment.
  - Extend compose area is kept intact — the extension no longer accidentally clicks the Video tab or "Make video" button after opening Extend.
- **Fix:** **Zero-Byte Downloads**. Fixed a critical bug where all auto-downloaded videos were 0 bytes. The content script's `fetch()` was hitting CORS restrictions on `assets.grok.com`. Downloads now use the background script to fetch video data (which has proper `host_permissions`), then convert to a Blob in the content script for anchor-tag download (which preserves custom filenames).
- **Fix:** **Filename Prefix**. Custom filename prefixes are now always applied correctly. Extend mode segments use a range format: `prefix_grok_loop_segment_1_5.mp4` (segments 1 through 5).
- **Fix:** **Multiple Video Generation on Segment 2**. Fixed several issues causing duplicate/triple video generation:
  - Proactive frame extraction no longer pre-populates `seg.inputImage` for segments that will use Extend.
  - The retry loop now correctly breaks (not continues) after a successful extend segment.
  - The "Make Video" button priority is skipped in Extend mode to prevent creating standalone videos.
- **Fix:** **Upscale Regression (SVG Search Leak)**. Constrained the Send button's SVG arrow search to the compose area, preventing accidental clicks on Upscale or other toolbar buttons.
- **Fix:** **Image Upload Reverting to Image Mode**. Moved Video mode activation to occur *before* image uploads, ensuring the Video/Imagine tab is still visible and clickable.
- **Fix:** **Menu Item Detection in Non-English Languages**. Rewrote the DOM search for both Upscale and Extend menu items. The previous "leaf node only" filter rejected menu items with child elements (e.g., `<div role="menuitem"><svg/><span>升级视频</span></div>`), causing detection to fail in Chinese, Russian, and other languages. Both searches now scan all visible elements and walk up to the closest clickable ancestor.
- **Improvement:** **Verified Multi-Language Support**. Upscale and Extend translations have been verified against actual Grok UI screenshots for 11 languages (see table below).

### Verified Language Support (Upscale & Extend)

| Language | Upscale | Extend |
|---|---|---|
| 🇬🇧 English | Upscale video | Extend video |
| 🇫🇷 French | Mise à niveau de la vidéo | Étendre la vidéo |
| 🇩🇪 German | Video hochskalieren | Video erweitern |
| 🇪🇸 Spanish | Mejorar video | Extender video |
| 🇵🇹 Portuguese | Upscale vídeo | Estender vídeo |
| 🇨🇳 Chinese (Simplified) | 升级视频 | 扩展视频 |
| 🇹🇼 Chinese (Traditional) | 升級影片 | 擴展影片 |
| 🇯🇵 Japanese | アップスケールビデオ | 動画を拡張 |
| 🇸🇦 Arabic | ترقية الفيديو | تمديد الفيديو |
| 🇨🇿 Czech | Zvětšit video | Rozšířit video |
| 🇷🇺 Russian | Масштабирование видео | Продлить видео |

## v1.6.6
- **Feature:** **Import & Export Configurations**. Added the ability to export your Saved Loops (including prompts, settings, and global images) to a JSON file and import them later for easy backups and sharing.
- **Feature:** **Smart Resume Export**. When saving a configuration during an active run, any frames automatically extracted from your videos will also be included in the export. This lets you seamlessly pick up where you left off later!
- **Fix:** **Configuration Export Missing Frames**. Extracted video frames are now correctly saved as Base64 in local storage during active runs, preventing them from being stripped out (resulting in missing images) when exporting configurations to JSON. 
- **UI:** **Settings Redesign**. Overhauled the design of the Saved Configurations section in the popup to fix layout issues and make the interface cleaner with intuitive icon buttons.

## v1.6.5 (Hotfixes)
- **Fix:** **Upscale Reliability**. Fixed an issue where the extension failed to find the Upscale button due to Grok UI changes. It now precisely targets the new "Video Settings" SVG menu and ignores history items.
- **Improvement:** **Performance Boost**. Added an 800ms debounce buffer when typing in individual Scene Prompts to completely eliminate popup UI freezing/sluggishness.
- **Fix:** **Crash Fix**. Resolved the `Message exceeded maximum allowed size of 64MiB` crash. The extension no longer attempts to send massive Base64 image strings across the Chrome IPC bridge when clicking "Start Generation", and instead reads them directly from local storage.
- **Fix:** **Rate Limit Detection**. Removed overly broad fallback text scanning that caused the extension to falsely detect a "Rate Limit Reached" error and abort waiting for a video.
- **Improvement:** **Upscale Reliability**. Added a pure legacy fallback method that sweeps the entire screen for upscale buttons if the exact SVG targeting fails.
## v1.6.4
- **Feature:** **Custom Filename Prefix**. Added a new configuration option in the Settings tab to let you prepend a custom text string to all auto-downloaded video filenames (e.g., `MyProject_Scene_`).
- **Fix:** **Firefox Radix Menu Interactions**. Significantly overhauled the simulated click engine to fully support native `PointerEvents`. This ensures buttons like "Regenerate," "Upscale," and "Send" interact consistently and reliably in stricter browsers like Firefox.

## v1.6.3
- **Feature:** **Full Multi-Language Support**. The extension now works natively across all supported Grok languages without relying on hardcoded English text.
- **Fix:** **Structural Button Detection**. Upscale buttons are now identified visually (via the `...` menu) instead of relying on keywords, fixing upscale detection across all languages.
- **Fix:** **Prompt Replacement**. Completely rewrote the text insertion logic using the Range API to guarantee the text box is cleared before typing the next scene's prompt in the React editor.
- **Fix:** **Missing `.mp4` Extensions**. Auto-downloaded videos now correctly save with the `.mp4` file extension instead of raw UUID blobs.
- **Fix:** **Generation Timeout ("Broken Eye")**. Added instant visual detection for Grok's internal server generation failures, allowing the loop to retry immediately rather than waiting 2 minutes.
- **Fix:** **Post View Escape Hatch**. Built a robust backward navigation system to ensure the loop never gets trapped inside an individual video post between scenes.
- **Fix:** **Sidebar Accident Prevention**. Improved the button detection logic to strictly ignore the main left sidebar, preventing accidental navigation away from the gallery.

## v1.6.1 (Stable)
*Consolidates all Beta 1-14 changes into a stable release.*

### Features
- **🌍 Multi-Language Support:** Works in English, Spanish, French, German, Chinese (Simplified/Traditional), Japanese, Russian, and Portuguese.
- **🧪 A/B Test Handling:** Automatically detects and skips the "Which video do you prefer?" survey in all supported languages.
- **✨ Global Suffix:** Append consistent style text to all prompts (e.g., "photorealistic, 8k").
- **⏸️ Pause After Video:** Option to stop loop after each video generation for manual review.

### Fixes
- **Resume Button Reliability:** Fixed buttons getting stuck in "Resuming..." state after loop crashes.
- **Enhanced Upscaling:** Fixed detection for German, Chinese, Spanish, and French interfaces.
- **"Clear/Delete" Misclick:** Fixed Resume accidentally clicking the X button on the toolbar.
- **Pause on Error:** Now correctly pauses when frame extraction fails.
- **Scene 1 Regeneration:** No longer re-uploads stale images from previous runs.
- **Make Video Button:** Improved detection, strictly ignores sidebar navigation.
- **Regenerate with Edits:** Now uses the edited prompt text instead of the original.
- **Frame Extraction Retries:** Automatic 3x retries for extraction failures.
- **Real-Time Config Updates:** Settings update instantly without restart.
- **Input Cleanup:** Proactive cleanup before each generation to prevent residual attachments.

---

## v1.5.3
- **Fix:** **Regenerate with Edits**: Fixed a bug where editing a prompt in the Side Panel and clicking "Regenerate" (in the Active Run list) would use the old/stale prompt. It now correctly applies your latest edits.

## v1.5.2
- **Config:** **New Defaults**: "Show Dashboard Overlay" is now **Disabled** by default (runs in background/side panel). "Show Debug Logs" is **Enabled** by default for better troubleshooting.
- **Config:** **Strict Mode**: New setting to strictly enforce "Enter Key" submission.

## v1.5.1
- **Feature:** **Skip on Moderation**: New setting to automatically skip segments that trigger moderation flags instead of pausing the workflow.
- **Improvement:** **Fast Text Entry**: Optimized prompt typing to be near-instant (simulating paste) for faster execution.
- **Fix:** **Enter Key Logic**: Resolved issue where "Strict Mode" (or previous Enter logic) was causing errors or failing silently.

## v1.5.0
- **Feature:** **Side Panel Integration**. Extension now runs natively in the Chrome Side Panel with a fully responsive Dark Mode UI.
- **Feature:** **Configuration Saving:** Save your favorite prompt loops and settings as named presets.
## v1.5.0 - The "Control" Update
- **Feature:** **New Control Buttons:** Added "Regenerate" and "Download" buttons globally (Side Panel & Main Scene View).
- **Feature:** **Optional Dashboard:** New setting to toggle the visibility of the on-page overlay.
- **UI:** **Custom Modals & Tooltips:** Complete replacement of native alerts with dark-mode UI and high-contrast tooltips.
- **Fix:** **Resume Logic:** Fixed bug where "Resume Loop" would immediately pause.
- **Fix:** **Config Sync:** Settings like "Pause on Moderation" now update in real-time without restart.
- **Fix:** **Global Image Persistence:** Fixed issue where the Global Initial Image wasn't saving correctly.
- **Feature:** **Custom Start Images:** You can now upload a unique start image for *any* scene in the loop (not just the first one), allowing for hybrid flows (Generated -> Custom -> Generated).

## v1.4.0
- **Feature:** **Pause on Moderation**. Added a new option (enabled by default) to automatically pause the loop when content is flagged or moderated. Disabling it will trigger a 5-second retry delay instead.
- **Improvement:** **Faster Regeneration**. Clicking the "Regenerate" button now bypasses the "Human-like Delay" to start processing immediately.
- **Improvement:** **Enhanced Moderation Detection**. Now detects visual "blocked" indicators (Crossed Eye icon) and "Try a different idea" text even if the error toast is missed.
- **Fix:** **Synchronization**. Added explicit waiting for the "Type to customize video" input state after uploads to prevent "ghost typing".
- **Fix:** **Prompt Injection**. Implemented a "Double Tap" strategy with React state synchronization to ensure prompts are correctly recognized by the UI.

## v1.3.1
- **Bug- **Fix**: Resolved issue where extension would sometimes type prompt into its own dashboard instead of the website.
- **UX**: Converted the extension to use the **Chrome Side Panel**. Clicking the icon now opens a persistent, docked sidebar on the right instead of a temporary popup.
- **Config**: Added "Wait (s)" setting to control the maximum delay between segments (default 60s). Logic scales the minimum delay to 33% of max.
- **UX**: Updated console logs for Retries/Attempts to be more intuitive (e.g., "1/3" instead of "1/4").
- **Feature**: Auto-detects "Rate Limit Reached" popup. Pauses the loop and alerts the user to wait 24h.
- **Feature**: **Tabbed Interface**. Organized UI into Main, Settings, and About tabs.
- **Feature**: **Bulk Prompt Input**. Restored the ability to paste a list of prompts. It automatically syncs with the Dynamic Scene List.
- **Config**: Updated default settings based on user feedback (Wait: 15s, Mod Retries: 2, High Quality & Auto-Download Enabled).
- **Feature**: **Dynamic Scene List**. Replaced single text box with a Scene List. You can now:
- **Fix**: **Upload Errors**. If an image upload fails (e.g., Server Error 500) or takes too long, the extension now correctly detects this as a failure and retries the segment, rather than trying to proceed with a broken input.
- **Fix**: **Moderation Detection**. Improved the "Content Moderated" detection logic to use a broad text scan. It now catches "Try a different idea" and other variations even if the popup structure changes.
- **Feature**: **Smart Moderation Handling**. If Grok says "Content Moderated", the extension now retries a configurable number of times (default 2) before giving up, instead of retrying infinitely.
- **Fix**: **Upload Detection**. Enhanced synchronization to explicitly look for the text field containing "Type to customize video" (as requested), coupled with a check for the enabled "Make video" button. Accurate and robust. 
- **Fix**: **Generation Error**. Fixed "undefined status" and "missing function" errors in the automation script. It now correctly waits for image uploads to finish processing.
- **Fix**: **Debug Mode**. Added detailed error alerts. If the Start or Delete buttons fail, you will now see a popup message explaining why (instead of nothing happening).
- **Fix**: **Delete Button Reliability**. Enhanced the "Delete Request" button with a larger click area and visual background to ensuring clicks register correctly.
- **Fix**: **Bulk Input Logic**. Fixed an issue where pasting text would creating extra empty scenes. The system now intelligently ignores trailing empty lines unless they contain an image.
- **UX**: **Dynamic Labels**. The "Initial Image" label now updates automatically to reflect your settings:
    -   *Initial Image (Scene 1 Only)* (Default)
    -   *Initial Image (Used for ALL Scenes)* (When Reuse is enabled)
    -   **Disabled** (Default): The initial image is used only for the first scene (Starter), then loops.
- **UX**: Improved image preview visibility for both global and scene-level images.
    - If no image is provided, it defaults to the previous video's last frame (Loop Mode).
- **Bug Fix:** Fixed an issue where the prompt was not being correctly typed into Grok's text box on some environments. Used a more aggressive text insertion method (`execCommand`) to bypass strict React input handling.

## v1.3.0
- **Feature:** Added "Continue on Error" option (disabled by default). If a segment fails (timeout/error), the loop can now automatically skip it and proceed to the next scene instead of stopping.
- **Fix:** Improved error logging for failed segments.

## v1.2.0
- **Fix:** Added error detection for "Content Moderated" popups/toasts. The loop will now fail faster instead of waiting for a timeout when content is flagged.
- **Improvement:** Minor cleanup of error handling logic.

## v1.1.0
- **Feature:** Added "Reuse Initial Image" mode. Allows generating multiple scenes from a single static source image instead of chaining them.
- **Feature:** Automated "Age Verification" handling. Detects the age confirmation modal and automatically selects a birth year (configurable) to continue generation.
- **Fix:** Hardened prompt injection logic. Improved compatibility with Grok's rich text editor to prevent "typing verification failed" errors.
- **UI:** Added "Birth Year" configuration input to the popup.
