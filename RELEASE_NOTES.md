# Release Notes - Grok Imagine Loop

## v1.6.0.7 (Beta 7)
- **Fix:** Fixed an issue where adding new scenes to a finished loop and clicking "Resume" would incorrectly restart the loop from the beginning. It now correctly resumes processing the new scenes.

## v1.6.0.6 (Beta 6)
- **Fix:** Enhanced "Scene 1 Regeneration" fix with aggressive input cleanup. The extension now actively removes any residual image attachments in Grok's input box before starting a new generation, ensuring a completely clean state.

## v1.6.0.5 (Beta 5)
- **Fix:** Improved "Make Video" button detection to find floating footers while strictly ignoring sidebar navigation (Final fix for "Sidebar Misclick" vs "Button Not Found").
- **Fix:** Clicking "Regenerate" next to a scene now correctly uses the *edited* prompt from the text box, instead of the original prompt.
- **Fix:** Regenerating the First Scene (Scene 1) no longer accidentally re-uploads the last frame of a previous run as an input image.

## v1.6.0.4 (Beta 4)
- **Fix:** "Start Generation" button is now sticky at the bottom with a robust layout (no longer overlaps content).
- **Fix:** Resume from Pause now correctly handles finding the "Make video" prompt area.
- **Fix:** Resume loop after uploading a new Start Frame now works correctly (Fixed Blob error).
- **Fix:** Editing scenes (e.g. removing an image) no longer causes video previews to disappear.
- **Fix:** "Upscale" button search is now scoped to prevent misclicking the sidebar "More" menu.

## v1.6.0
- **Feature:** **Pause After Video:** Added Option to stop loop after each video generation (useful for manual review).
- **Fix:** Fixed Debug Log Console visibility issue on startup.
- **Fix:** Fixed "Pause Loop" button state synchronization.
- **Feature:** **Global Suffix / Style:** Added a new "Global Suffix" field. Text entered here is automatically appended to *every* scene's prompt. Perfect for maintaining consistent styles (e.g., "photorealistic, 8k") across an entire loop without manual repetition.
- **Persistence:** Global Suffix is saved/loaded with your presets.

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
