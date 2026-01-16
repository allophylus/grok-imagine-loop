# Issue Tracking

## 🐛 Known Issues

- **Selector Brittleness**: The extension relies on DOM selectors (aria-labels, specific button classes) which may break if Grok updates their UI.
- **Legacy Code Caching**: If the extension behaves unexpectedly (e.g., old delays), a full reload from `chrome://extensions` is required.

## 💡 Feature Requests / Todo

- [ ] **Cloud Sync**: Sync settings across devices (currently local only).
- [ ] **Custom CSS Selectors**: Allow advanced users to override selectors in settings if Grok UI changes.

## ✅ Resolved

- **Auto-Resume**: Extension now detects page reloads and resumes the queue automatically.
- **Debug Logs**: Fixed issue where enabling logs mid-run didn't take effect.
- **More Button**: Fixed logic that accidentally clicked the "Search" button instead of "More" for upscaling.
- **Tooltip Cropping**: Fixed tooltips going off-screen on the left side.
