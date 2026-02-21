document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');

    // --- Custom Tooltip Logic ---
    const tooltip = document.createElement('div');
    tooltip.id = 'custom-tooltip';
    document.body.appendChild(tooltip);

    function showTooltip(e, text) {
        if (!text) return;
        tooltip.innerText = text;
        tooltip.style.display = 'block';

        // Position
        const x = e.clientX;
        const y = e.clientY;

        // Bounds check to keep on screen
        const rect = tooltip.getBoundingClientRect();
        let top = y + 10;
        let left = x + 10;

        if (left + rect.width > window.innerWidth) left = x - rect.width - 5;
        if (top + rect.height > window.innerHeight) top = y - rect.height - 5;

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    function hideTooltip() {
        tooltip.style.display = 'none';
    }

    // Delegate hover events for ANY element with data-tooltip or title
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[title], [data-tooltip]');
        if (target) {
            let text = target.getAttribute('data-tooltip');
            if (!text && target.hasAttribute('title')) {
                text = target.getAttribute('title');
                target.setAttribute('data-tooltip', text);
                target.removeAttribute('title'); // Remove native title to prevent double tooltip
            }
            if (text) showTooltip(e, text);
        }
    });

    document.addEventListener('mouseout', (e) => {
        hideTooltip();
    });

    // --- End Tooltip Logic ---

    // --- Custom Modal Logic ---
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    let currentConfirmCallback = null;

    function showCustomConfirm(message, onConfirm, options = {}) {
        if (modalMessage) modalMessage.innerText = message || "Are you sure?";
        if (modalTitle) modalTitle.innerText = options.title || "Confirm";
        if (modalConfirmBtn) modalConfirmBtn.innerText = options.confirmText || "Confirm";

        if (modalCancelBtn) {
            if (options.showCancel === false) {
                modalCancelBtn.style.display = 'none';
            } else {
                modalCancelBtn.style.display = 'block';
            }
        }

        currentConfirmCallback = onConfirm;
        if (modalOverlay) modalOverlay.style.display = 'flex';
    }

    function closeCustomModal() {
        if (modalOverlay) modalOverlay.style.display = 'none';
        currentConfirmCallback = null;
    }

    if (modalConfirmBtn) {
        modalConfirmBtn.onclick = () => {
            if (currentConfirmCallback) currentConfirmCallback();
            closeCustomModal();
        };
    }

    if (modalCancelBtn) {
        modalCancelBtn.onclick = () => {
            closeCustomModal();
        };
    }

    if (modalOverlay) {
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) closeCustomModal();
        };
    }
    // --- End Custom Modal Logic ---

    // resumeBtn removed

    // Scene Management Elements
    const scenesContainer = document.getElementById('scenes-container');
    const addSceneBtn = document.getElementById('addSceneBtn');
    const clearScenesBtn = document.getElementById('clearScenesBtn');
    const sceneTemplate = document.getElementById('scene-template');

    // Config Inputs
    const loopsInput = document.getElementById('loops'); // Now Readonly/Display mainly
    const timeoutInput = document.getElementById('timeout');
    const maxDelayInput = document.getElementById('maxDelay');
    const retryLimitInput = document.getElementById('retryLimit');
    const moderationRetryLimitInput = document.getElementById('moderationRetryLimit');

    const autoDownloadInput = document.getElementById('autoDownload');
    const autoSkipInput = document.getElementById('autoSkip');
    const initialImageInput = document.getElementById('initialImage');
    const initialImageLabel = document.getElementById('initialImageLabel');
    const reuseInitialImageInput = document.getElementById('reuseInitialImage');
    const showDashboardInput = document.getElementById('showDashboard');
    const birthYearInput = document.getElementById('birthYear');
    const globalPromptInput = document.getElementById('globalPrompt');
    const pauseOnErrorInput = document.getElementById('pauseOnError');
    const pauseOnModerationInput = document.getElementById('pauseOnModeration');
    const pauseAfterSceneInput = document.getElementById('pauseAfterScene');
    const upscaleInput = document.getElementById('upscale');
    const resetInputsBtn = document.getElementById('resetInputsBtn');
    const filenamePrefixInput = document.getElementById('filenamePrefix');
    const statusDiv = document.getElementById('status');
    const versionSpan = document.getElementById('version');

    // Logging
    const showDebugLogsInput = document.getElementById('showDebugLogs');
    const debugLogContainer = document.getElementById('debugLogContainer');
    const debugLogViewer = document.getElementById('debugLogViewer');

    // Saved Configs Elements
    const savedLoopsSelect = document.getElementById('savedLoopsSelect');
    const loadConfigBtn = document.getElementById('loadConfigBtn');
    const deleteConfigBtn = document.getElementById('deleteConfigBtn');
    const saveConfigNameInput = document.getElementById('saveConfigName');
    const saveConfigBtn = document.getElementById('saveConfigBtn');

    // Log Helper
    function appendLog(level, args) {
        if (!debugLogViewer || !showDebugLogsInput.checked) return;

        const line = document.createElement('div');
        line.style.marginBottom = '2px';
        line.style.color = level === 'error' ? '#f55' : (level === 'warn' ? '#fa0' : '#0f0');

        const timestamp = new Date().toLocaleTimeString();

        // Truncate long messages to prevent UI lag/spam
        const textArgs = args.map(a => {
            let str;
            if (typeof a === 'object') {
                try { str = JSON.stringify(a); } catch (e) { str = '[object]'; }
            } else {
                str = String(a);
            }
            if (str.length > 200) return str.substring(0, 200) + '...';
            return str;
        }).join(' ');

        line.textContent = `[${timestamp}] ${textArgs}`;

        debugLogViewer.appendChild(line);
        debugLogViewer.scrollTop = debugLogViewer.scrollHeight;
    }




    // Toggle Log Container visibility on change
    if (showDebugLogsInput) {
        showDebugLogsInput.addEventListener('change', () => {
            if (debugLogContainer) {
                debugLogContainer.style.display = showDebugLogsInput.checked ? 'block' : 'none';
            }
        });
    }

    // Download Logs
    const downloadLogsBtn = document.getElementById('downloaddebugLogsButton');
    if (downloadLogsBtn) {
        downloadLogsBtn.onclick = () => {
            if (!debugLogViewer) return;

            const logs = debugLogViewer.innerText;
            const configDump = {
                timestamp: new Date().toISOString(),
                extensionVersion: chrome.runtime.getManifest().version,
                settings: {
                    timeout: timeoutInput.value,
                    maxDelay: maxDelayInput.value,
                    retryLimit: retryLimitInput.value,
                    moderationRetryLimit: moderationRetryLimitInput.value,
                    upscale: upscaleInput.checked,
                    autoDownload: autoDownloadInput.checked,
                    autoSkip: autoSkipInput.checked,
                    reuseInitialImage: reuseInitialImageInput.checked,
                    continueOnFailure: !pauseOnErrorInput.checked,
                    pauseOnModeration: pauseOnModerationInput.checked,
                    pauseAfterScene: pauseAfterSceneInput.checked,
                    birthYear: birthYearInput.value,
                    globalPrompt: globalPromptInput.value,
                    filenamePrefix: filenamePrefixInput ? filenamePrefixInput.value : ''
                },
                scenes: scenes.map(s => ({
                    prompt: s.prompt,
                    hasImage: !!s.image,
                    imageName: s.image ? s.image.fileName : null
                })),
                rawLogs: logs.split('\n')
            };

            const blob = new Blob([JSON.stringify(configDump, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `grok_debug_log_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
    }

    // State
    let scenes = []; // Array of { prompt: string, image: { dataUrl, fileName } | null }
    let savedConfigs = {}; // { "Name": { scenes, settings, timestamp } }

    // --- Helper for Dynamic Label ---
    function updateInitialImageLabel() {
        if (!initialImageLabel || !reuseInitialImageInput) return;
        if (reuseInitialImageInput.checked) {
            initialImageLabel.innerText = "Initial Image (Used for ALL Scenes)";
            initialImageLabel.style.color = "var(--primary)";
        } else {
            initialImageLabel.innerText = "Initial Image (Scene 1 Only)";
            initialImageLabel.style.color = "#ddd";
        }
    }

    // Display Version
    const manifest = chrome.runtime.getManifest();
    const manifestVersion = manifest.version;
    const versionNumber = document.getElementById('versionNumber'); // Assuming this is the new ID for the main version display

    try {
        // Auto-detect beta: 4-part version (e.g., 1.6.0.14) = Beta, 3-part (e.g., 1.6.1) = Stable
        const isBeta = manifestVersion.split('.').length > 3;
        const displayVer = `v${manifestVersion}${isBeta ? ' (Beta)' : ''}`;

        if (versionNumber) {
            versionNumber.textContent = displayVer;
        }

        if (versionSpan) versionSpan.innerText = displayVer;
        const aboutVer = document.getElementById('aboutVersion');
        if (aboutVer) aboutVer.innerText = `Version ${manifestVersion}${isBeta ? ' (Beta)' : ''}`;
    } catch (e) { console.error(e); }

    const bulkPromptsInput = document.getElementById('bulkPrompts');

    // --- Tab Logic ---
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activate clicked
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- Scene Logic ---

    // Event Delegation for Scene Actions (Delete, Clear Image)
    scenesContainer.addEventListener('click', (e) => {
        try {
            const removeBtn = e.target.closest('.remove-scene-btn');
            if (removeBtn) {
                const item = removeBtn.closest('.scene-item');
                if (!item) return;

                const index = parseInt(item.dataset.index);
                console.log(`Request to delete scene index: ${index}`);

                if (isNaN(index) || index < 0 || index >= scenes.length) {
                    showCustomConfirm('Error: Invalid scene index. Please reload.', null, { title: "Error", showCancel: false, confirmText: "OK" });
                    return;
                }

                showCustomConfirm(`Delete Scene ${index + 1}?`, () => {
                    scenes.splice(index, 1);
                    saveScenes();
                    renderScenes();
                    updateBulkFromScenes();
                }, { title: "Delete Scene", confirmText: "Delete" });
                return;
            }

            // Insert Scene Logic
            const insertBtn = e.target.closest('.insert-scene-btn');
            if (insertBtn) {
                const item = insertBtn.closest('.scene-item');
                const index = parseInt(item.dataset.index);

                if (!isNaN(index) && index >= 0) {
                    // Insert NEW scene at this index (pushes current down)
                    scenes.splice(index, 0, { prompt: '', image: null });
                    saveScenes();
                    renderScenes();
                    updateBulkFromScenes();
                }
                return;
            }

            const clearImgBtn = e.target.closest('.scene-clear-img-btn');
            if (clearImgBtn) {
                const item = clearImgBtn.closest('.scene-item');
                const index = parseInt(item.dataset.index);
                if (scenes[index]) {
                    scenes[index].image = null;
                    saveScenes();
                    renderScenes();
                }
            }
        } catch (err) {
            console.error('Scene Action Error:', err);
            showCustomConfirm('Action Failed: ' + err.message, null, { title: "Error", showCancel: false, confirmText: "OK" });
        }
    });

    function renderScenes() {
        scenesContainer.innerHTML = '';

        // Sync Bulk Input (only if not focused to avoid cursor jumps)
        if (document.activeElement !== bulkPromptsInput) {
            bulkPromptsInput.value = scenes.map(s => s.prompt).join('\n');
        }

        if (scenes.length === 0) {
            // Default empty scene if none
            scenes.push({ prompt: '', image: null });
        }

        scenes.forEach((scene, index) => {
            const clone = sceneTemplate.content.cloneNode(true);
            const item = clone.querySelector('.scene-item');
            item.dataset.index = index;

            // Number
            item.querySelector('.scene-number').innerText = `Scene ${index + 1}`;

            // Remove Button (Handled by delegation)

            // Prompt Input (Individual)
            const textarea = item.querySelector('.scene-prompt');
            textarea.value = scene.prompt;
            textarea.addEventListener('input', (e) => {
                scene.prompt = e.target.value;
                autoResize(e.target);
                saveScenes();
                updateBulkFromScenes(); // Sync back to bulk
            });
            // Auto-resize textarea
            setTimeout(() => autoResize(textarea), 0);

            // Image Input
            const fileInput = item.querySelector('.scene-file-input');
            const previewWrapper = item.querySelector('.scene-preview-wrapper');
            const imgPreview = item.querySelector('.scene-img-preview');
            const clearImgBtn = item.querySelector('.scene-clear-img-btn');
            const imgLabel = item.querySelector('.scene-img-label');

            if (scene.image) {
                imgPreview.src = scene.image.dataUrl;
                previewWrapper.style.display = 'block';
                fileInput.style.display = 'none'; // Hide input when image exists

                // User Logic: "Override frame if custom start frame is uploaded"
                if (imgLabel) imgLabel.textContent = "Overriding Start Frame (Custom Image)";
            } else {
                previewWrapper.style.display = 'none';
                fileInput.style.display = 'block';

                // User Logic: "update... to Last Frame... depending on whether..."
                if (imgLabel) {
                    if (index === 0) {
                        imgLabel.textContent = "Start Frame (Use Global Initial Image)";
                    } else {
                        // Check Reuse State
                        const reuseGlobal = document.getElementById('reuseInitialImage')?.checked;
                        if (reuseGlobal) {
                            imgLabel.textContent = "Start Frame (Use Global Initial Image)";
                        } else {
                            imgLabel.textContent = "Start Frame (Last Frame of Previous Scene)";
                        }
                    }
                }
            }

            fileInput.addEventListener('change', async () => {
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const dataUrl = await readFileAsDataURL(file);

                    scene.image = {
                        dataUrl: dataUrl,
                        fileName: file.name
                    };

                    // Update state
                    saveScenes();
                    renderScenes(); // Re-render to toggle UI state
                }
            });

            clearImgBtn.onclick = () => {
                scene.image = null;
                fileInput.value = ''; // Reset input value so change event fires again if same file picked
                saveScenes();
                renderScenes(); // Re-render to toggle UI state
            };

            scenesContainer.appendChild(item);
        });

        // Update Scenes/Loops Counter
        if (loopsInput) {
            loopsInput.value = scenes.length;
            loopsInput.readOnly = true; // Controlled by list size
        }

        // Restore video previews if state exists
        if (lastKnownState && typeof updateScenePreviews === 'function') {
            updateScenePreviews(lastKnownState);
        }
    }

    function updateBulkFromScenes() {
        bulkPromptsInput.value = scenes.map(s => s.prompt).join('\n');
    }

    // Bulk Input Listener
    // Bulk Input Listener
    bulkPromptsInput.addEventListener('input', () => {
        const rawLines = bulkPromptsInput.value.split('\n');

        // Intelligent Filter: Remove trailing empty lines ONLY if they don't map to a scene with an image
        while (rawLines.length > 0) {
            const lastIdx = rawLines.length - 1;
            const line = rawLines[lastIdx];

            // If text is present, keep it.
            if (line.trim() !== '') break;

            // If text is empty...
            const correspondingScene = scenes[lastIdx];
            if (correspondingScene && correspondingScene.image) {
                // Keep it (it has an image)
                break;
            }

            // Otherwise, it's a phantom empty line. Remove it.
            rawLines.pop();
        }

        // Sync lines to scenes
        // 1. Update existing/Add new
        rawLines.forEach((line, i) => {
            if (i < scenes.length) {
                scenes[i].prompt = line;
            } else {
                scenes.push({ prompt: line, image: null });
            }
        });

        // 2. Remove extra scenes
        if (rawLines.length < scenes.length) {
            scenes.splice(rawLines.length);
        }

        saveScenes();
        renderScenes();
    });

    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    addSceneBtn.onclick = () => {
        scenes.push({ prompt: '', image: null });
        renderScenes();
        saveScenes();
        updateBulkFromScenes();
    };

    clearScenesBtn.onclick = () => {
        showCustomConfirm('Clear all scenes?', () => {
            scenes = [{ prompt: '', image: null }];
            renderScenes();
            saveScenes();
            updateBulkFromScenes();
        }, { title: "Clear All", confirmText: "Clear" });
    };

    // --- Configuration Management ---

    function loadSavedConfigs() {
        chrome.storage.local.get(['grokLoopSavedConfigs'], (result) => {
            savedConfigs = result.grokLoopSavedConfigs || {};
            renderSavedConfigsList();
        });
    }

    function renderSavedConfigsList() {
        savedLoopsSelect.innerHTML = '<option value="">-- Select a Preset --</option>';
        Object.keys(savedConfigs).sort().forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.innerText = name;
            savedLoopsSelect.appendChild(opt);
        });
    }

    saveConfigBtn.onclick = () => {
        const name = saveConfigNameInput.value.trim();
        if (!name) {
            showCustomConfirm('Please enter a name for this configuration.', null, { showCancel: false, title: "Error", confirmText: "OK" });
            return;
        }

        const configSnapshot = {
            timestamp: Date.now(),
            scenes: scenes, // Current scenes
            settings: {
                timeout: timeoutInput.value,
                maxDelay: maxDelayInput.value,
                retryLimit: retryLimitInput.value,
                moderationRetryLimit: moderationRetryLimitInput.value,
                birthYear: birthYearInput.value,
                globalPrompt: globalPromptInput.value,
                upscale: upscaleInput.checked,
                autoDownload: autoDownloadInput.checked,
                autoSkip: autoSkipInput.checked,
                reuseInitialImage: reuseInitialImageInput.checked,
                continueOnFailure: continueOnFailureInput.checked,
                pauseOnModeration: pauseOnModerationInput.checked,
                showDashboard: showDashboardInput.checked,
                filenamePrefix: filenamePrefixInput ? filenamePrefixInput.value : ''
                // Also save global image if present?
                // For now, let's keep it simple. Local file blobs are large.
                // We'll trust scenes.image logic (dataURL) but global initial image logic is separate.
                // NOTE: popup.js lines 390+ handle initialImage. We should capture it if possible.
                // But `initialImageInput` is a file input, we can't restore it directly to the INPUT.
                // We can restore it to storage. 
            }
        };

        savedConfigs[name] = configSnapshot;
        chrome.storage.local.set({ 'grokLoopSavedConfigs': savedConfigs }, () => {
            renderSavedConfigsList();
            saveConfigNameInput.value = ''; // Clear input
            showCustomConfirm(`Saved configuration: "${name}"`, null, { showCancel: false, title: "Saved", confirmText: "OK" });
            savedLoopsSelect.value = name; // Select it
        });
    };

    loadConfigBtn.onclick = () => {
        const name = savedLoopsSelect.value;
        if (!name || !savedConfigs[name]) return;

        showCustomConfirm(`Load preset "${name}"? This will overwrite your current prompts and settings.`, () => {
            const data = savedConfigs[name];

            // 1. Restore Scenes
            scenes = data.scenes || [];
            renderScenes();
            updateBulkFromScenes();
            saveScenes(); // Persist to storage immediately

            // 2. Restore Settings
            if (data.settings) {
                if (data.settings.timeout) timeoutInput.value = data.settings.timeout;
                if (data.settings.maxDelay) maxDelayInput.value = data.settings.maxDelay;
                if (data.settings.retryLimit) retryLimitInput.value = data.settings.retryLimit;
                if (data.settings.moderationRetryLimit) moderationRetryLimitInput.value = data.settings.moderationRetryLimit;
                if (data.settings.birthYear) birthYearInput.value = data.settings.birthYear;
                if (data.settings.globalPrompt) globalPromptInput.value = data.settings.globalPrompt;
                if (data.settings.filenamePrefix !== undefined && filenamePrefixInput) filenamePrefixInput.value = data.settings.filenamePrefix;

                upscaleInput.checked = !!data.settings.upscale;
                autoDownloadInput.checked = !!data.settings.autoDownload;
                autoSkipInput.checked = !!data.settings.autoSkip;
                reuseInitialImageInput.checked = !!data.settings.reuseInitialImage;
                pauseOnErrorInput.checked = !data.settings.continueOnFailure;
                pauseOnModerationInput.checked = !!data.settings.pauseOnModeration;
                if (data.settings.pauseAfterScene !== undefined) pauseAfterSceneInput.checked = data.settings.pauseAfterScene;
                if (data.settings.showDashboard !== undefined) {
                    showDashboardInput.checked = data.settings.showDashboard;
                    // Trigger immediate update if tab is active
                    updateDashboardVisibility();
                }
                if (data.settings.showDebugLogs !== undefined) {
                    showDebugLogsInput.checked = data.settings.showDebugLogs;
                    // Toggle visibility of container immediately
                    if (debugLogContainer) debugLogContainer.style.display = showDebugLogsInput.checked ? 'block' : 'none';
                }

                updateInitialImageLabel(); // Logic helper
                saveConfigs(); // Persist settings
            }

            // Switch to Main tab to show results
            document.querySelector('.tab-btn[data-tab="tab-main"]').click();
        }, { title: "Load Preset", confirmText: "Load" });
    };

    deleteConfigBtn.onclick = () => {
        const name = savedLoopsSelect.value;
        if (!name || !savedConfigs[name]) return;

        showCustomConfirm(`Permanently delete preset "${name}"?`, () => {
            delete savedConfigs[name];
            chrome.storage.local.set({ 'grokLoopSavedConfigs': savedConfigs }, () => {
                renderSavedConfigsList();
            });
        }, { title: "Delete Preset", confirmText: "Delete" });
    };

    // Load presets on startup
    loadSavedConfigs();


    // --- Persistence ---

    function saveScenes() {
        chrome.storage.local.set({ 'grokLoopScenes': scenes });
    }

    function saveConfigs() {
        const config = {
            timeout: timeoutInput.value,
            maxDelay: maxDelayInput.value,
            retryLimit: retryLimitInput.value,
            moderationRetryLimit: moderationRetryLimitInput.value,
            upscale: upscaleInput.checked,
            autoDownload: autoDownloadInput.checked,
            autoSkip: autoSkipInput.checked,
            reuseInitialImage: reuseInitialImageInput.checked,
            continueOnFailure: !document.getElementById('pauseOnError').checked, // Inverted Logic
            pauseOnModeration: pauseOnModerationInput.checked,
            pauseAfterScene: pauseAfterSceneInput.checked,
            showDashboard: showDashboardInput.checked,
            pauseOnModeration: pauseOnModerationInput.checked,
            showDashboard: showDashboardInput.checked,
            showDebugLogs: showDebugLogsInput.checked,
            birthYear: birthYearInput.value,
            globalPrompt: globalPromptInput.value,
            filenamePrefix: filenamePrefixInput ? filenamePrefixInput.value : ''
        };
        chrome.storage.local.set({ 'grokLoopConfig': config });
    }

    // Save Global Image
    const globalFileInput = document.getElementById('initialImage');
    globalFileInput.addEventListener('change', async () => {
        if (globalFileInput.files.length > 0) {
            const file = globalFileInput.files[0];
            const dataUrl = await readFileAsDataURL(file);

            // Save in legacy/global key
            chrome.storage.local.set({
                'grokLoopImage': {
                    dataUrl: dataUrl,
                    fileName: file.name
                }
            });

            document.getElementById('restoredImageText').textContent = `✓ ${file.name}`;
            document.getElementById('restoredImagePreview').src = dataUrl;
            document.getElementById('restoredImageIndicator').style.display = 'flex';
        }
    });

    document.getElementById('clearImageBtn').addEventListener('click', () => {
        document.getElementById('restoredImagePreview').src = '';
        chrome.storage.local.remove('grokLoopImage');
        document.getElementById('restoredImageIndicator').style.display = 'none';
        globalFileInput.value = '';
    });


    // Attach Config Listeners
    // const pauseOnErrorInput = document.getElementById('pauseOnError'); // Moved to top
    [timeoutInput, maxDelayInput, retryLimitInput, moderationRetryLimitInput, upscaleInput, autoDownloadInput, autoSkipInput, birthYearInput, globalPromptInput, filenamePrefixInput, pauseOnErrorInput, pauseOnModerationInput, pauseAfterSceneInput, reuseInitialImageInput, showDashboardInput, showDebugLogsInput].forEach(el => {
        if (el) {
            el.addEventListener('input', saveConfigs);
            el.addEventListener('change', saveConfigs);
        }
    });

    // Special Listener for Dashboard Visibility
    if (showDashboardInput) {
        showDashboardInput.addEventListener('change', updateDashboardVisibility);
    }

    async function updateDashboardVisibility() {
        const visible = showDashboardInput.checked;
        const tab = await findGrokTab();
        if (tab) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'SET_DASHBOARD_VISIBILITY',
                payload: { visible: visible }
            });
        }
    }

    // Special Listener for Debug Logs Visibility
    if (showDebugLogsInput) {
        showDebugLogsInput.addEventListener('change', () => {
            if (debugLogContainer) debugLogContainer.style.display = showDebugLogsInput.checked ? 'block' : 'none';
        });
    }

    // Special listener for Label Update
    if (reuseInitialImageInput) {
        reuseInitialImageInput.addEventListener('change', () => {
            updateInitialImageLabel();
            renderScenes(); // Re-render scene labels
        });
    }

    // Load Data
    chrome.storage.local.get(['grokLoopScenes', 'grokLoopConfig', 'grokLoopInputs', 'grokLoopImage'], (result) => {
        // Load Configs
        if (result.grokLoopConfig) {
            const c = result.grokLoopConfig;
            if (c.timeout) timeoutInput.value = c.timeout;
            if (c.maxDelay) maxDelayInput.value = c.maxDelay;
            if (c.retryLimit) retryLimitInput.value = c.retryLimit;
            if (c.moderationRetryLimit) moderationRetryLimitInput.value = c.moderationRetryLimit;
            if (c.upscale !== undefined) upscaleInput.checked = c.upscale;
            if (c.autoDownload !== undefined) autoDownloadInput.checked = c.autoDownload;
            if (c.autoSkip !== undefined) autoSkipInput.checked = c.autoSkip;
            if (c.reuseInitialImage !== undefined) reuseInitialImageInput.checked = c.reuseInitialImage;

            // Logic Inversion: continueOnFailure (true) = pauseOnError (false)
            if (c.continueOnFailure !== undefined) {
                // If continueOnFailure is true, Pause on Error should be false
                // If continueOnFailure is false (default), Pause on Error should be true
                // Check if element exists (renamed)
                const pauseOnErrorInput = document.getElementById('pauseOnError');
                if (pauseOnErrorInput) pauseOnErrorInput.checked = !c.continueOnFailure;
            } else {
                // Default: continueOnFailure is undefined (falsy) -> Pause on Error = True
                const pauseOnErrorInput = document.getElementById('pauseOnError');
                if (pauseOnErrorInput) pauseOnErrorInput.checked = true;
            }

            if (c.pauseOnModeration !== undefined) pauseOnModerationInput.checked = c.pauseOnModeration;
            if (c.pauseAfterScene !== undefined) pauseAfterSceneInput.checked = c.pauseAfterScene;
            if (c.showDashboard !== undefined) showDashboardInput.checked = c.showDashboard;
            if (c.showDebugLogs !== undefined) {
                showDebugLogsInput.checked = c.showDebugLogs;
                if (debugLogContainer) debugLogContainer.style.display = c.showDebugLogs ? 'block' : 'none';
            }
            if (c.birthYear) birthYearInput.value = c.birthYear;
            if (c.globalPrompt) globalPromptInput.value = c.globalPrompt;
            if (c.filenamePrefix !== undefined && filenamePrefixInput) filenamePrefixInput.value = c.filenamePrefix;

            updateInitialImageLabel(); // Sync label on load
            if (c.birthYear) birthYearInput.value = c.birthYear;
        } else {
            // Fallback to legacy config or defaults
            if (result.grokLoopInputs) {
                const l = result.grokLoopInputs;
                if (l.timeout) timeoutInput.value = l.timeout;
                if (l.maxDelay) maxDelayInput.value = l.maxDelay;
                // ... other legacy migrations if needed
            }
        }

        // Load Global Image
        if (result.grokLoopImage) {
            const img = result.grokLoopImage;
            const previewEl = document.getElementById('restoredImagePreview');
            const indicatorEl = document.getElementById('restoredImageIndicator'); // Now just the wrapper
            const inputEl = document.getElementById('initialImage');

            if (typeof img === 'string') {
                previewEl.src = img;
            } else {
                previewEl.src = img.dataUrl;
            }

            // Show wrapper, Hide input
            indicatorEl.style.display = 'block';
            previewEl.style.display = 'block';
            inputEl.style.display = 'none';
        }

        // Load Scenes (or migrate legacy)
        if (result.grokLoopScenes && Array.isArray(result.grokLoopScenes)) {
            scenes = result.grokLoopScenes;
        } else {
            // Migration logic
            scenes = [];
            // Check legacy prompt
            const legacyPrompt = result.grokLoopInputs?.prompt || '';

            if (legacyPrompt) {
                const lines = legacyPrompt.split('\n').filter(p => p.trim() !== '');
                lines.forEach((line, i) => {
                    scenes.push({ prompt: line, image: null });
                });
            } else {
                scenes.push({ prompt: '', image: null });
            }
        }

        renderScenes();
    });

    // Reset All
    resetInputsBtn.onclick = () => {
        showCustomConfirm('Reset EVERYTHING to defaults?', () => {
            chrome.storage.local.clear(() => {
                location.reload();
            });
        }, { title: "Reset All", confirmText: "Reset" });
    };

    // --- Helper ---
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // --- Logic ---
    async function findGrokTab() {
        console.log('Finding Grok Tab (Robust Mode)...');

        try {
            // 1. Query ALL tabs and filter manually for maximum reliability
            // This avoids issues with strict pattern matching differences between browsers
            // Requires "tabs" permission in manifest
            const allTabs = await chrome.tabs.query({});

            // Robust Filter: Includes www, no-www, http, https, trailing slashes, etc.
            const strictTabs = allTabs.filter(t => t.url && (
                t.url.includes('grok.com/imagine')
            ));

            if (strictTabs.length > 1) {
                console.warn('Multiple Imagine tabs found:', strictTabs.length);
                showCustomConfirm(
                    `Multiple "grok.com/imagine" tabs detected (${strictTabs.length}).\n\nPlease close all but one to prevent conflicts.`,
                    null,
                    { title: "Multiple Tabs", showCancel: false, confirmText: "OK" }
                );
                return null;
            }

            if (strictTabs.length === 1) {
                console.log('Found exactly one Imagine tab:', strictTabs[0].id);
                return strictTabs[0];
            }

            // 2. If NO strict match, check for generic Grok/X tabs to give a better error
            const genericTabs = allTabs.filter(t => t.url && (
                t.url.includes('grok.com') ||
                t.url.includes('x.com') ||
                t.url.includes('twitter.com')
            ));

            if (genericTabs.length > 0) {
                // User has Grok open but not on /imagine
                console.warn('Found generic Grok tabs but not /imagine');
                showCustomConfirm(
                    "Found open Grok tab, but not on the Imagine page.\n\nPlease navigate to:\ngrok.com/imagine",
                    null,
                    { title: "Wrong Page", showCancel: false, confirmText: "OK" }
                );
                return null;
            }

            // 3. No tabs found at all
            console.warn('No Grok tabs found.');
            showCustomConfirm(
                "No Grok tab found.\n\nPlease open:\ngrok.com/imagine",
                null,
                { title: "Tab Not Found", showCancel: false, confirmText: "Open" }
            );
            return null;

        } catch (e) {
            console.error('Tab Search Error', e);
            statusDiv.innerText = 'Error searching tabs: ' + e.message;
            return null;
        }
    }

    async function sendMessageWithRetry(tabId, message, attempt = 1) {
        console.log(`[Popup] Attempt ${attempt}: Sending message to tab ${tabId}`);
        statusDiv.innerText = `Attempt ${attempt}: Connecting to tab ${tabId}...`;
        statusDiv.style.color = '#888'; // Reset color

        try {
            // Ensure tab still exists
            await chrome.tabs.get(tabId);

            await chrome.tabs.sendMessage(tabId, message).catch(err => {
                // Check runtime error
                if (chrome.runtime.lastError) throw chrome.runtime.lastError;
                throw err;
            });

            statusDiv.innerText = '✓ Process started! Check the web page.';
            statusDiv.style.color = 'var(--success)';
        } catch (error) {
            const errorMsg = error.message || "Unknown error";
            console.warn('Message Send Warning:', error);

            // Connection failed usually means content script isn't there
            if (errorMsg.includes("Receiving end does not exist") || errorMsg.includes("Could not establish connection")) {
                if (attempt === 1) {
                    statusDiv.innerText = 'Injecting script into page...';
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ['content/content.js']
                        });
                        // Inject CSS safely
                        chrome.scripting.insertCSS({
                            target: { tabId: tabId },
                            files: ['content/styles.css']
                        }).catch(() => { });

                        await new Promise(r => setTimeout(r, 800)); // Wait for script to init
                        await sendMessageWithRetry(tabId, message, 2);
                    } catch (e) {
                        console.error("Injection Failed", e);
                        statusDiv.innerText = 'Injection failed: ' + e.message;
                        statusDiv.style.color = 'var(--danger)';
                    }
                    return;
                }
            }

            statusDiv.innerText = 'Error: ' + errorMsg;
            statusDiv.style.color = 'var(--danger)';
        }
    }

    // Track global state
    let lastKnownState = null;

    // Start / Pause / Resume Logic
    startBtn.onclick = async () => {
        try {
            // Case 1: Running -> PAUSE
            if (lastKnownState && lastKnownState.isRunning) {
                console.log('Sending PAUSE command...');
                startBtn.innerText = 'Pausing...';
                const tab = await findGrokTab();
                if (tab) chrome.tabs.sendMessage(tab.id, { action: 'PAUSE_LOOP' });
                return;
            }

            // Case 2: Paused -> RESUME (With Updates)
            // OR Case 2b: Finished -> RESUME (New Scenes Added)
            const isPaused = lastKnownState && !lastKnownState.isRunning;
            const hasMoreScenes = lastKnownState && scenes.length > lastKnownState.segments.length;
            const isFinished = lastKnownState && lastKnownState.currentSegmentIndex === -1;

            // Trigger Resume if:
            // 1. Paused mid-loop (index >= 0)
            // 2. Finished (-1) BUT we added new scenes (length > prev length)
            if (isPaused && (lastKnownState.currentSegmentIndex >= 0 || (isFinished && hasMoreScenes))) {
                console.log('Sending RESUME command with updates...');

                if (isFinished && hasMoreScenes) {
                    statusDiv.innerText = 'Resuming (New Scenes)...';
                } else {
                    statusDiv.innerText = 'Resuming...';
                }

                // Re-gather scenes to capture edits
                const validScenes = scenes.filter(s => s && (s.prompt.trim() !== '' || s.image));

                const tab = await findGrokTab();
                if (tab) {
                    // Pass the updated scenes so the loop knows about changes
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'RESUME_LOOP',
                        payload: {
                            scenes: validScenes.map(s => ({
                                prompt: s.prompt,
                                inputImage: s.image ? s.image.dataUrl : null
                            }))
                        }
                    });
                }
                return;
            }

            // Case 3: Stopped/New -> START
            statusDiv.innerText = 'Initializing...';
            statusDiv.style.color = '#888';
            console.log('Start Button Clicked (New Run)');

            // Validate Scenes
            if (!Array.isArray(scenes)) {
                showCustomConfirm('Error: Scenes data is corrupted. Please clear scenes and try again.', null, { title: "Error", showCancel: false, confirmText: "OK" });
                return;
            }

            const validScenes = scenes.filter(s => s && (s.prompt.trim() !== '' || s.image));

            if (validScenes.length === 0) {
                statusDiv.innerText = 'Please add at least one scene with a prompt.';
                statusDiv.style.color = 'var(--danger)';
                showCustomConfirm('Please add at least one scene with a prompt.', null, { title: "Error", showCancel: false, confirmText: "OK" });
                return;
            }

            const tab = await findGrokTab();
            if (!tab) {
                statusDiv.innerText = 'No Grok tab found! Please open grok.com.';
                statusDiv.style.color = 'var(--danger)';
                showCustomConfirm("Could not find an open Grok or X.com tab.\nPlease open one and try again.", null, { title: "Tab Not Found", showCancel: false, confirmText: "OK" });
                return;
            }

            console.log('Target Tab:', tab.id, tab.url);

            // Config payload
            const payload = {
                timeout: parseInt(timeoutInput.value) || 120,
                maxDelay: parseInt(maxDelayInput.value) || 15,
                retryLimit: parseInt(retryLimitInput.value) || 3,
                moderationRetryLimit: parseInt(moderationRetryLimitInput.value) || 2,
                upscale: upscaleInput.checked,
                autoDownload: autoDownloadInput.checked,
                autoSkip: autoSkipInput.checked,
                reuseInitialImage: reuseInitialImageInput.checked,
                continueOnFailure: !pauseOnErrorInput.checked,
                pauseOnModeration: pauseOnModerationInput.checked,
                pauseAfterScene: pauseAfterSceneInput.checked,
                showDashboard: showDashboardInput.checked,
                showDebugLogs: showDebugLogsInput.checked,
                birthYear: birthYearInput.value || '2000',
                globalPrompt: globalPromptInput.value || '',

                // NEW Payload Structure
                scenes: validScenes.map(s => ({
                    prompt: s.prompt,
                    inputImage: s.image ? s.image.dataUrl : null
                })),

                // Legacy Backwards Compat
                prompts: validScenes.map(s => s.prompt),
                initialImage: null
            };

            // Pass global Initial Image if loaded
            const previewEl = document.getElementById('restoredImagePreview');
            if (previewEl && previewEl.src && previewEl.style.display !== 'none') {
                payload.initialImage = previewEl.src;
            }

            statusDiv.innerText = 'Sending command...';
            await sendMessageWithRetry(tab.id, {
                action: 'START_LOOP',
                payload: payload
            });

        } catch (e) {
            console.error('Start Button Error:', e);
            showCustomConfirm('Start Error: ' + e.message, null, { title: "Error", showCancel: false, confirmText: "OK" });
            statusDiv.innerText = 'Error: ' + e.message;
        }
    };

    chrome.storage.local.get(['grokLoopState'], (result) => {
        if (result.grokLoopState) {
            resumeBtn.style.display = 'block';
            resumeBtn.innerText = `Resume (Segment ${result.grokLoopState.currentSegmentIndex + 1})`;
            resumeBtn.onclick = async () => {
                const tab = await findGrokTab();
                if (tab) {
                    sendMessageWithRetry(tab.id, {
                        action: 'RESTORE_LOOP',
                        payload: result.grokLoopState
                    });
                }
            };
        }
    });

    // External Links
    document.getElementById('kofiBtn').addEventListener('click', () => chrome.tabs.create({ url: 'https://ko-fi.com/mrdom78' }));
    document.getElementById('githubBtn').addEventListener('click', () => chrome.tabs.create({ url: 'https://github.com/allophylus/grok-imagine-loop' }));

    // --- SIDE PANEL DASHBOARD LOGIC ---
    const runTab = document.getElementById('tab-run');
    const mainTab = document.getElementById('tab-main');
    const runScenesList = document.getElementById('runScenesList');
    const runStatusText = document.getElementById('runStatusText');
    const runPauseBtn = document.getElementById('runPauseBtn');
    const runResumeBtn = document.getElementById('runResumeBtn');
    const runStopBtn = document.getElementById('runStopBtn');

    // Message Listener
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'LOOP_STATE_UPDATE') {
            console.log('Received State Update:', msg.payload);
            renderRunDashboard(msg.payload);
            updateScenePreviews(msg.payload); // Sync to main list
        } else if (msg.action === 'LOG_ENTRY') {
            appendLog(msg.payload.level, msg.payload.args);
        }
    });

    async function updateScenePreviews(state) {
        const sceneItems = document.querySelectorAll('.scene-item');
        if (!state.segments) return;
        const tab = await findGrokTab();
        if (!tab) return;

        state.segments.forEach((seg, i) => {
            if (i >= sceneItems.length) return;

            const item = sceneItems[i];

            // 1. Highlight Active Scene
            if (i === state.currentSegmentIndex && state.isRunning) {
                item.classList.add('active-scene');
                // Scroll into view if needed? Maybe too intrusive.
            } else {
                item.classList.remove('active-scene');
            }

            // 2. Update Video Preview
            const resultDiv = item.querySelector('.scene-result-video');
            const videoEl = resultDiv?.querySelector('video');

            if (seg.videoUrl && seg.status === 'done' && resultDiv && videoEl) {
                // Only update if source changed to avoid flickering
                if (videoEl.src !== seg.videoUrl) {
                    videoEl.src = seg.videoUrl;
                    resultDiv.style.display = 'block';
                }
            } else if (resultDiv) {
                // resultDiv.style.display = 'none'; // Keep optional
            }

            // 3. Update Header Buttons (Regen/Download)
            const downBtn = item.querySelector('.header-download-btn');
            const regenBtn = item.querySelector('.header-regen-btn');

            if (downBtn) {
                if (seg.videoUrl && seg.status === 'done') {
                    downBtn.style.display = 'flex';
                    downBtn.onclick = (e) => {
                        e.stopPropagation();
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'DOWNLOAD_SEGMENT',
                            payload: { index: i }
                        });
                    };
                } else {
                    downBtn.style.display = 'none';
                }
            }

            if (regenBtn) {
                // Regen is valid if scene is done OR error
                if (seg.status === 'done' || seg.status === 'error') {
                    regenBtn.style.display = 'flex';
                    regenBtn.onclick = (e) => {
                        e.stopPropagation();
                        // Prompt Sync: Use the current value from the scenes array
                        let promptToSend = null;
                        if (scenes && scenes[i] && scenes[i].prompt) {
                            promptToSend = scenes[i].prompt;
                        }

                        chrome.tabs.sendMessage(tab.id, {
                            action: 'REGENERATE_SEGMENT',
                            payload: {
                                index: i,
                                prompt: promptToSend
                            }
                        });
                    };
                } else {
                    regenBtn.style.display = 'none';
                }
            } else if (resultDiv) {
                // Keep visible if it WAS done, unless reset.
                if (!seg.videoUrl) {
                    resultDiv.style.display = 'none';
                }
            }
        });
    }

    function renderRunDashboard(state) {
        lastKnownState = state; // Update global tracker for Button Logic

        // 1. DISABLE Auto-Switch to Run Tab (User wants to stay on Main for edits)
        // if (state.segments.length > 0 && !runTab.classList.contains('active')) { ... } 

        // 2. Update Start Button Text (Main Tab)
        if (state.isRunning) {
            startBtn.innerText = 'Pause Loop';
            startBtn.style.background = '#e6a800'; // Orange/Yellow
            startBtn.style.color = '#000';

            // Also update Dashboard
            runStatusText.innerText = 'Running...';
            runStatusText.style.color = 'var(--success)';
            runPauseBtn.style.display = 'block';
            runResumeBtn.style.display = 'none';

        } else {
            // Paused or Finished?
            if (state.currentSegmentIndex === -1) {
                startBtn.innerText = 'Start Loop';
                startBtn.style.background = 'var(--primary)';
                startBtn.style.color = '#fff';

                runStatusText.innerText = 'Idle';
            } else {
                startBtn.innerText = 'Resume Loop (Apply Edits)';
                startBtn.style.background = 'var(--success)'; // Green
                startBtn.style.color = '#fff';

                runStatusText.innerText = 'Paused';
                runStatusText.style.color = '#f55';
                runPauseBtn.style.display = 'none';
                runResumeBtn.style.display = 'block';
            }
        }

        // Render List
        runScenesList.innerHTML = '';
        state.segments.forEach((seg, i) => {
            const div = document.createElement('div');
            div.style.background = '#222';
            div.style.padding = '8px';
            div.style.borderRadius = '4px';
            div.style.border = (i === state.currentSegmentIndex) ? '1px solid var(--primary)' : '1px solid #333';

            // Status Color
            let statusColor = '#888';
            if (seg.status === 'working') statusColor = 'var(--primary)';
            if (seg.status === 'done') statusColor = 'var(--success)';
            if (seg.status === 'error') statusColor = 'var(--danger)';
            if (seg.status.includes('moderated')) statusColor = '#orange';

            let html = `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="font-size:11px; font-weight:bold; color:${statusColor}">Scene ${i + 1} • ${seg.status.toUpperCase()}</span>
                </div>
                <div style="font-size:11px; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${seg.prompt}</div>
            `;

            // Controls (Regenerate)
            if (seg.status === 'done' || seg.status === 'error') {
                html += `
                <div style="margin-top:6px; display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                    <button class="regen-btn" data-index="${i}" title="Regenerate this segment" 
                        style="background:transparent; border:none; padding:4px; cursor:pointer; color:#888; transition:color 0.2s;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6"></path>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                    </button>
                    ${seg.videoUrl ? `
                    <button class="dl-btn" data-index="${i}" title="Download video"
                        style="background:transparent; border:none; padding:4px; cursor:pointer; color:#888; transition:color 0.2s;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>` : ''}
                </div>`;
            }

            div.innerHTML = html;
            runScenesList.appendChild(div);
        });

        // Attach Listeners to dynamic buttons
        runScenesList.querySelectorAll('.regen-btn').forEach(btn => {
            btn.onclick = async () => {
                const idx = parseInt(btn.dataset.index);
                const tab = await findGrokTab();

                let promptToSend = null;
                // Attempt to sync from editor state if available
                if (scenes && scenes[idx] && scenes[idx].prompt) {
                    promptToSend = scenes[idx].prompt;
                    console.log(`Sending updated prompt for scene ${idx + 1}:`, promptToSend);
                }

                if (tab) chrome.tabs.sendMessage(tab.id, {
                    action: 'REGENERATE_SEGMENT',
                    payload: {
                        index: idx,
                        prompt: promptToSend
                    }
                });
            };
        });

        runScenesList.querySelectorAll('.dl-btn').forEach(btn => {
            btn.onclick = async () => {
                const idx = parseInt(btn.dataset.index);
                const tab = await findGrokTab();
                if (tab) chrome.tabs.sendMessage(tab.id, { action: 'DOWNLOAD_SEGMENT', payload: { index: idx } });
            };
        });
    }

    // Control Buttons
    runPauseBtn.onclick = async () => {
        const tab = await findGrokTab();
        if (tab) chrome.tabs.sendMessage(tab.id, { action: 'PAUSE_LOOP' });
    };

    runResumeBtn.onclick = async () => {
        const tab = await findGrokTab();
        if (tab) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'RESUME_LOOP',
                payload: { scenes: scenes }
            });
        }
    };

    runStopBtn.onclick = () => {
        showCustomConfirm("Stop Run and return to Editor?", () => {
            // Reload to reset
            location.reload();
        }, { title: "Stop Run", confirmText: "Stop" });
    };
});
