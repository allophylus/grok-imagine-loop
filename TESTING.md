# Grok Imagine Loop Extension - Comprehensive Test Plan

Use this document to systematically verify the extension's functionality.

## 🟢 T01: Installation & Basic Setup
| ID | Test Case | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **01.01** | Load Extension | 1. Open `chrome://extensions`<br>2. Enable Developer Mode<br>3. "Load Unpacked" -> Select extension folder | Icon appears in toolbar; no error badges. |
| **01.02** | Open Side Panel | 1. Click Extension Icon<br>2. Select "Open Side Panel" (if configured in manifest to drop down) or click browser Side Panel icon and choose "Grok Loop" | Side Panel opens with dark UI, tabs (Main, Settings, About) visible. |
| **01.03** | Verify Version | 1. Go to **About** tab | Version matches `manifest.json`. Text is legible. |

## 🔵 T02: UI Components & Responsive Design
| ID | Test Case | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **02.01** | Tab Navigation | 1. Click **Settings**<br>2. Click **About**<br>3. Click **Main** | Content switches instantly. Active tab button is highlighted. |
| **02.02** | Custom Tooltips | 1. Hover over any Input, Button, or Scene Label | Dark, high-contrast tooltip appears with description. Disappears on mouse out. |
| **02.03** | Side Panel Scroll | 1. Add 10+ scenes to overflow the view<br>2. Scroll up/down | Scrollbar appears. All content is accessible. Footer (if any) or Main Tabs remain accessible. |
| **02.04** | Dashboard Toggle | 1. Go to **Settings**<br>2. Uncheck "Show Dashboard Overlay"<br>3. Start a Run | Floating black box on page is **HIDDEN**. Control is via Side Panel only. |
| **02.05** | Dashboard Toggle (On) | 1. Check "Show Dashboard Overlay" | Floating black box appears on page immediately (or on next run). |

## 🟣 T03: Configuration Management
| ID | Test Case | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **03.01** | Save Config | 1. Set specific inputs (Timeout: 99, 3 Scenes)<br>2. Enter name "TestConfig"<br>3. Click **Save As New** | "Saved" modal appears. "TestConfig" is selected in dropdown. |
| **03.02** | Load Config | 1. Change inputs randomly<br>2. Select "TestConfig"<br>3. Click **Load**<br>4. Confirm Modal | Inputs revert to saved values (Timeout: 99, 3 Scenes). |
| **03.03** | Delete Config | 1. Select "TestConfig"<br>2. Click **Delete (X)**<br>3. Confirm Modal | Config removed from dropdown. |
| **03.04** | Persist Settings | 1. Change "Wait (s)" to 25<br>2. Reload Extension | "Wait (s)" remains 25. |
| **03.05** | Global Image Save | 1. Upload "Initial Image"<br>2. Save Config "ImgConfig"<br>3. Clear Image<br>4. Load "ImgConfig" | Image preview reappears. |
| **03.06** | Reset Defaults | 1. Click "Reset to Defaults"<br>2. Confirm Modal | All inputs reset to standard values (Timeout 120, etc). Scenes cleared. |

## 🟠 T04: Scene Management
| ID | Test Case | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **04.01** | Add Scene | 1. Click "+ Add Scene" | New empty scene appears at bottom. Scrolled to view. |
| **04.02** | Insert Scene | 1. Click small "+" icon on Scene 1 | New empty scene inserted *between* 1 and 2. Numbering updates (Scene 2 becomes Scene 3). |
| **04.03** | Remove Scene | 1. Click "X" on Scene 1<br>2. Confirm Modal | Scene 1 removed. Scene 2 becomes Scene 1. |
| **04.04** | Clear All | 1. Click "Clear" (Top right of list)<br>2. Confirm Modal | All scenes removed. List resets to 1 empty scene. |
| **04.05** | Scene Image | 1. Upload image to Scene 2 (Custom Start Frame)<br>2. Verify Label | Label changes to "CUSTOM START IMAGE (OVERRIDE)". Preview shown. |

## 🔴 T05: Core Automation Loop
| ID | Test Case | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **05.01** | Start Generation | 1. Setup 2 Scenes<br>2. Go to Grok Page<br>3. Click **Start Generation** | Status changes to "Running". Side Panel switches to "Active Run" view. |
| **05.02** | Pause/Resume | 1. Click **Pause**<br>2. Click **Resume** | Loop pauses (Wait/Status update). Resumes correctly from current step. |
| **05.03** | Resume with Edit | 1. Pause<br>2. Edit Prompt of next scene<br>3. Click **Resume Loop (Apply Edits)** | Loop continues. Next scene uses the *new* prompt text. |
| **05.04** | Regenerate | 1. Wait for segment completion (Done)<br>2. Click **Regenerate (Cycle Icon)** in Side Panel List | Segment status resets to Pending -> Working. Reruns generation. |
| **05.05** | Manual Stop | 1. Click **Stop** | Loop aborts. View returns to Editor mode. |

## 🟤 T06: Error Handling & Resilience
| ID | Test Case | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **06.01** | Pause on Moderation | 1. Enable "Pause on Mod"<br>2. Submit banned prompt (e.g., NSFW)<br>3. Trigger Mod Error | Loop Pauses immediately. Alert/Status shows "Moderated". |
| **06.02** | Auto-Retry (Mod) | 1. **Disable** "Pause on Mod"<br>2. Submit banned prompt | Extension waits 5s, clicks Retry/Regenerate button (up to Mod Retry Limit). |
| **06.03** | Timeout | 1. Set Timeout to 10s<br>2. Run slow generation | After 10s, segment marked "Error" (or retried if retries > 0). |
| **06.04** | Continue on Fail | 1. Enable "Skip Failed Segments"<br>2. Force a failure/timeout | Loop proceeds to next segment instead of stopping completely. |

## ⚫ T07: Advanced Features
| ID | Test Case | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **07.01** | Auto-Download | 1. Enable "Auto-Download"<br>2. Complete a segment | MP4 file automatically saves to Chrome's download folder. |
| **07.02** | Upscale | 1. Enable "Upscale"<br>2. Run generation | Extension waits for "Upscale" button, clicks it, waits for result (Hires), then finishes. |
| **07.03** | Auto-Skip A/B | 1. (Mock) Trigger A/B Test Modal | Extension detects and closes it automatically. |
