# Release Notes - Grok Imagine Loop

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
