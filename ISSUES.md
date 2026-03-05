# Issue Tracking

## 🐛 Known Issues
- **Background Tab Throttling**: Performance slows significantly when user navigates away from grok.com/imagine tab (Chrome browser limitation)
- **Selector Brittleness**: The extension relies on DOM selectors which may break if Grok updates their UI

## 💡 Feature Requests / TODO

- [ ] **Export/Import Config**: Allow users to backup and restore their settings and presets
- [ ] **Safari Port**: Adapt extension for Safari Web Extensions
- [ ] **Popup Z-Index**: Ensure all popups/modals always appear on top
- [ ] **Fix Persistence Issues**: Add debounce for `saveScenes` and `saveConfigs` to prevent storage flooding
- [ ] **Complete Multi-Language**: Add missing keyword translations for all supported languages
- [ ] **Cloud Sync**: Sync settings across devices (currently local only)
- [ ] **Custom CSS Selectors**: Allow advanced users to override selectors in settings if Grok UI changes

## ✅ Resolved (v1.7.0)

- **X Button Misclick**: Fixed by adding stricter DOM filters to avoid clicking modal/nav close buttons; "close" alone is now rejected as too generic

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
