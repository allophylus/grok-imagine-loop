# Issue Tracking

## 🐛 Known Issues
- **Background Tab Throttling**: Performance slows significantly when user navigates away from grok.com/imagine tab (Chrome browser limitation)
- **Selector Brittleness**: The extension relies on DOM selectors which may break if Grok updates their UI
- **Prompt Insertion Reliability**: Prompt insertion sometimes fails on the first segment of a new run.
- **Settings Toggling**: Toggling between 480p/720p and 6s/10s settings occasionally fails to register in the Grok UI.
- **First Frame Upload Detection**: Image upload detection for the first segment sometimes fails, leaving the prompt in a persistent "pending" state.
- **Multilingual Mode Swap**: In non-English interfaces, the extension occasionally misidentifies the "Image" vs "Video" toggle, leading to accidental image generations instead of videos.

## 💡 Feature Requests / TODO

- [ ] **Export/Import Config**: Allow users to backup and restore their settings and presets
- [ ] **Safari Port**: Adapt extension for Safari Web Extensions
- [ ] **Popup Z-Index**: Ensure all popups/modals always appear on top
- [ ] **Fix Persistence Issues**: Add debounce for `saveScenes` and `saveConfigs` to prevent storage flooding
## ✅ Resolved (v1.6.7)

- **Massive Multilingual Support**: 11 verified languages increased to 28+ verified languages including Arabic, Bengali, Hindi, etc.
- **Imagine Mode Localized**: Full support for localized placeholders and toggle buttons globally.
- **Initial Settings Fix**: Fixed issue where `6s` and `480p` settings were not applied correctly before the first generation.
- **Extend Logic Fix**: Resolved segment chaining bug (3rd segment regenerating from 1st).
- **UI Alignment**: Fixed "Extend Segments" dropdown alignment in the popup.
- **X Button Misclick**: Fixed by adding stricter DOM filters to avoid clicking modal/nav close buttons.

## ✅ Resolved (v1.6.1)


- **Multi-Language Support**: Extension now supports 8 languages (EN, ES, FR, DE, ZH, JA, RU, PT)
- **A/B Test Handling**: Automatically skips "Which video do you prefer?" survey
- **Resume Button State**: No longer gets stuck in "Resuming..." after crashes
- **Upscale Detection**: Fixed for German, Chinese, Spanish, French interfaces
- **Clear/Delete Misclick**: Resume no longer accidentally clicks the X button
- **Scene 1 Regeneration**: No longer re-uploads stale images from previous runs
- **Regenerate with Edits**: Now uses the edited prompt text
- **Frame Extraction Retries**: Auto-retries 3x on failures
- **Real-Time Config**: Settings update instantly, no restart needed
- **Global Prompt Support**: Implemented "Global Suffix" field
- **More Button**: Fixed logic that accidentally clicked "Search" instead of "More"

## 🔄 In Progress (v1.7.1 - March 2026 UI Update)

- **Grok UI Redesign**: Updated selectors for new "Type to imagine" input bar and arrow send button (↑)
- **Text Insertion Validation**: Added verification that text was inserted before clicking send
- **Timing Buffers**: Increased post-insertion wait from 500ms to 800-1000ms
- **Send Button Detection**: Added SVG arrow icon detection for new UI
- **Issue #9**: "Prompt not working" - Fixed with new selectors + validation
- **Issue #8**: "Text pasting out of sync" - Fixed with validation + increased timing
