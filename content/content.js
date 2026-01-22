// Prevent duplicate injection
if (window.GrokLoopInjected) {
    console.log('Grok Imagine Loop content script already loaded. Skipping re-initialization.');
} else {
    window.GrokLoopInjected = true;
    console.log('Grok Imagine Loop content script (V2) Initializing...');

    // --- Selectors ---
    const SELECTORS = {
        textArea: 'textarea, div[contenteditable="true"], div[role="textbox"]',
        uploadButton: 'button[aria-label="Add photos or video"], button[title="Add image"], button svg rect',
        sendButton: 'button[aria-label="Send"], button[aria-label="Post"], button[type="submit"]',
        // Common grok.com specific
        grokUpload: 'button[aria-label="Upload file"]'
    };

    // --- State ---
    let state = {
        segments: [],
        isRunning: false,
        currentSegmentIndex: -1,
        config: {
            timeout: 30000,
            pauseOnError: true, // Default enabled
            strictMode: false, // Default disabled (Legacy Button-First)
            showDashboard: false, // Default disabled per user request
            showDebugLogs: true, // Default enabled per user request
            skipOnModeration: false
        }
    };

    // ... (lines 28-316 unchanged) ...

    // COPY OF REST OF FILE TO ENSURE CONTEXT (I must include everything I am not changing if I span a large block, but replace_file_content works on chunks).
    // I will target specific functions instead of the whole file to be safe.

    // This tool call is modifying STATE (above) and will modify DASHBOARD and SENDPROMPTTOGROK below.
    // Since I cannot modify multiple non-contiguous blocks, I have to assume the above 'state' change requires a separate call or I must include the intervening code.
    // The intervening code is lines 28-321 (300 lines). That's too much to copy-paste blindly.
    // I will switch to `multi_replace_file_content` if possible? No, sticking to `replace_file_content`.
    // I will do the STATE update first, then the Logic/UI update.

    // Actually, I'll update the State INIT and Dashboard/Logic in one go if I can find a way, but they are far apart.
    // I'll update STATE first.


    // Load saved config immediately for logging/persistence
    chrome.storage.local.get(['grokLoopConfig'], (res) => {
        if (res.grokLoopConfig) {
            state.config = { ...state.config, ...res.grokLoopConfig };
            console.log('[Content] Loaded initial config:', state.config);
        }
    });

    // --- Console Override (Log Streaming) ---
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };

    function broadcastLog(level, args) {
        // Only send if configured
        const shouldSend = state.config && state.config.showDebugLogs;

        // Debug the debugger:
        // originalConsole.log('[Content Debug] Broadcast?', shouldSend, state.config);

        if (shouldSend) {
            try {
                const safeArgs = args.map(a => {
                    try {
                        if (typeof a === 'object') return JSON.parse(JSON.stringify(a));
                        return a;
                    } catch (e) {
                        return String(a);
                    }
                });

                chrome.runtime.sendMessage({
                    action: 'LOG_ENTRY',
                    payload: { level: level, args: safeArgs }
                }).catch(err => {
                    // originalConsole.warn('[Content Debug] Send failed:', err);
                });
            } catch (e) {
                // originalConsole.error('[Content Debug] Broadcast Error:', e);
            }
        }
    }

    console.log = (...args) => {
        originalConsole.log.apply(console, args);
        broadcastLog('log', args);
    };
    console.warn = (...args) => {
        originalConsole.warn.apply(console, args);
        broadcastLog('warn', args);
    };
    console.error = (...args) => {
        originalConsole.error.apply(console, args);
        broadcastLog('error', args);
    };

    // --- DOM Utilities ---
    function createEl(tag, className, text = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    // --- Helper Functions ---
    function dataURItoBlob(dataURI) {
        const split = dataURI.split(',');
        const byteString = atob(split[1]);
        const mimeString = split[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
        return new Blob([ab], { type: mimeString });
    }

    function debugBtn(b) {
        return `[${b.tagName}] text="${b.textContent.trim().substring(0, 20)}..." aria="${b.ariaLabel || ''}" title="${b.title || ''}" class="${b.className}"`;
    }

    function blobToBase64(blob) {
        return new Promise((r, j) => {
            const rx = new FileReader();
            rx.onloadend = () => r(rx.result);
            rx.onerror = j;
            rx.readAsDataURL(blob);
        });
    }

    // --- Anti-Bot Helper Functions ---
    // --- Anti-Bot Helper Functions ---
    // Renamed/Refactored for speed per user request ("Copy and Paste")
    async function insertTextFast(element, text) {
        element.focus();

        // Clear first
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.value = '';
        } else if (element.isContentEditable) {
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
        }

        await new Promise(r => setTimeout(r, 50));

        // Fast Insertion (Simulate Paste)
        if (element.tagName === 'DIV' && element.isContentEditable) {
            // execCommand 'insertText' mimics a user typing or pasting plain text
            // It triggers input events automatically and works well with React
            document.execCommand('insertText', false, text);
        } else {
            // For Textarea/Input, we need to be careful with React state
            const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value") ||
                Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");

            if (descriptor && descriptor.set) {
                descriptor.set.call(element, text);
            } else {
                element.value = text;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        await new Promise(r => setTimeout(r, 100)); // Short settle time
    }

    async function simulateClick(element) {
        if (!element) return;

        // 1. Move to element (hover)
        element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
        // ... (rest of simulateClick is fine)
        element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true, view: window }));

        // Reduced hover time for speed
        await new Promise(r => setTimeout(r, Math.random() * 100 + 50));

        // 2. Down
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        element.focus();

        // Hold time
        await new Promise(r => setTimeout(r, Math.random() * 50 + 20));

        // 3. Up & Click
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        element.click();
    }

    async function simulateEnterKey(element) {
        element.focus();
        await new Promise(r => setTimeout(r, 100));

        // STRATEGY 1: Direct React Handler Invocation
        try {
            const reactKey = Object.keys(element).find(key => key.startsWith('__reactProps$'));
            if (reactKey) {
                const props = element[reactKey];
                if (props && typeof props.onKeyDown === 'function') {
                    console.log('Found React onKeyDown handler. Invoking directly...');

                    const mockEvent = {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        charCode: 13,
                        bubbles: true,
                        cancelable: true,
                        preventDefault: () => { },
                        stopPropagation: () => { },
                        nativeEvent: new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }),
                        currentTarget: element,
                        target: element
                    };

                    props.onKeyDown(mockEvent);

                    if (typeof props.onKeyPress === 'function') {
                        props.onKeyPress(mockEvent);
                    }

                    await new Promise(r => setTimeout(r, 50));
                    console.log('React handler invoked.');
                }
            }
        } catch (e) {
            console.warn('React handler invocation failed:', e);
        }

        // STRATEGY 2: Enhanced Native Events
        const eventInit = {
            bubbles: true,
            cancelable: true,
            composed: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            charCode: 13,
            view: window
        };

        const down = new KeyboardEvent('keydown', eventInit);
        Object.defineProperty(down, 'keyCode', { value: 13 });
        Object.defineProperty(down, 'which', { value: 13 });
        element.dispatchEvent(down);

        const press = new KeyboardEvent('keypress', eventInit);
        Object.defineProperty(press, 'keyCode', { value: 13 });
        Object.defineProperty(press, 'which', { value: 13 });
        element.dispatchEvent(press);

        await new Promise(r => setTimeout(r, 50));

        const up = new KeyboardEvent('keyup', eventInit);
        Object.defineProperty(up, 'keyCode', { value: 13 });
        Object.defineProperty(up, 'which', { value: 13 });
        element.dispatchEvent(up);

        if (element.form) {
            // element.form.requestSubmit(); 
        }
    }

    async function uploadImageToGrok(input) {
        let fileInput = document.querySelector('input[type="file"]');

        // Gentle Back Logic
        if (!fileInput) {
            console.log('File input not found. Checking for Modal/Lightbox close...');
            const closeButton = document.querySelector('button[aria-label="Close"]') || document.querySelector('button[aria-label="Back"]');

            if (closeButton) {
                console.log('In Post View. Navigation is required to upload next image.');
                closeButton.click();
                await new Promise(r => setTimeout(r, 1500));

                fileInput = document.querySelector('input[type="file"]');
                if (fileInput) console.log('File input found after navigation.');
            }

            if (!fileInput) {
                const buttons = Array.from(document.querySelectorAll('button'));
                const uploadTrigger = buttons.find(b => {
                    const label = (b.ariaLabel || b.title || '').toLowerCase();
                    return label.includes('upload') || label.includes('image') || label.includes('photo') || label.includes('add');
                });

                if (uploadTrigger) {
                    console.log('Clicking upload trigger to reveal input...');
                    uploadTrigger.click();
                    await new Promise(r => setTimeout(r, 500));
                    fileInput = document.querySelector('input[type="file"]');
                }
            }
        }

        if (!fileInput) {
            const hiddenInput = document.querySelector('input[type="file"]');
            if (hiddenInput) fileInput = hiddenInput;
        }

        if (!fileInput) throw new Error('File input not found. Please ensure you are on the main Compose screen.');

        let blob = input;
        if (typeof input === 'string') blob = dataURItoBlob(input);

        const fileName = `input.${blob.type.split('/')[1]}`;
        const file = new File([blob], fileName, { type: blob.type });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 2000));
    }

    async function sendPromptToGrok(text) {
        await new Promise(r => setTimeout(r, 1000)); // Reduced initial pause

        let inputArea = null;
        const timeoutMs = state.config.timeout;
        const retryDelay = 2000;
        const maxRetries = Math.ceil(timeoutMs / retryDelay);

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            // ... (selector logic same as before) ...
            console.log(`Searching for input area (${attempt + 1}/${maxRetries})...`);

            // 1. Precise selectors
            inputArea = document.querySelector('div[contenteditable="true"][role="textbox"]') ||
                document.querySelector('textarea[placeholder*="customize"]') ||
                document.querySelector('input[placeholder*="customize"]');

            if (inputArea) break;

            // 2. Loose selectors
            const candidates = Array.from(document.querySelectorAll('textarea, input[type="text"], div[contenteditable="true"]'));
            const visibleCandidates = candidates.filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            });

            // 2a. Strict Check
            inputArea = visibleCandidates.find(el => {
                const placeholder = (el.placeholder || el.getAttribute('aria-placeholder') || el.innerText || '').toLowerCase();
                return placeholder.includes('video') || placeholder.includes('customize') || placeholder.includes('prompt');
            });

            // 2b. Fallback
            if (!inputArea && visibleCandidates.length > 0) {
                inputArea = visibleCandidates.find(el => {
                    const placeholder = (el.placeholder || el.getAttribute('aria-placeholder') || '').toLowerCase();
                    return !placeholder.includes('search');
                });
            }

            if (inputArea) break;
            await new Promise(r => setTimeout(r, retryDelay));
        }

        // Final fallback
        if (!inputArea) {
            const visibleInputs = Array.from(document.querySelectorAll('textarea, input[type="text"]')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            });
            if (visibleInputs.length === 1) {
                inputArea = visibleInputs[0];
            }
        }

        if (!inputArea) throw new Error('Could not find text input area.');

        console.log('Inserting text (Fast Method)...');
        await insertTextFast(inputArea, text);

        await new Promise(r => setTimeout(r, 500)); // Reduced post-type delay

        // --- SUBMISSION LOGIC ---

        // OPTION A: STRICT MODE (Enter Key Only)
        if (state.config.strictMode) {
            console.log('STRICT MODE: Submitting via Enter Key ONLY...');
            await simulateEnterKey(inputArea);

            await new Promise(r => setTimeout(r, 1000));
            // Success check: Input detached or cleared?
            if (!inputArea.isConnected || (inputArea.value || inputArea.textContent || '').trim() === '') {
                console.log('Strict Enter submission successful.');
                return;
            }

            // Retry once
            console.warn('Strict Enter failed. Retrying one time...');
            await simulateEnterKey(inputArea);
            await new Promise(r => setTimeout(r, 1000));

            if (!inputArea.isConnected || (inputArea.value || inputArea.textContent || '').trim() === '') {
                return;
            }

            throw new Error('Strict Mode: Enter Key Submission Failed. (Button fallback disabled)');
        }

        // OPTION B: LEGACY/DEFAULT (Button First -> Enter Fallback)
        console.log('Legacy Mode: Searching for Send/Make Video button...');

        let sendBtn = null;

        for (let i = 0; i < 20; i++) {
            // Revert to global search to catch floating footers, but EXCLUDE Nav/Sidebar
            const buttons = Array.from(document.querySelectorAll('button'));
            sendBtn = buttons.find(b => {
                // EXCLUSION: Ignore buttons in Sidebar/Nav
                if (b.closest('nav') || b.closest('aside') || b.closest('[role="navigation"]')) return false;

                const label = (b.textContent || b.ariaLabel || b.title || '').trim().toLowerCase();
                return label === 'make video' || label === 'send' || label === 'generate';
            });

            if (sendBtn) {
                if (!sendBtn.disabled && !sendBtn.classList.contains('disabled')) {
                    console.log('Found enabled Send button. Clicking humanly...');
                    await simulateClick(sendBtn);
                    return;
                }
            }
            await new Promise(r => setTimeout(r, 500));
        }

        console.warn('Could not find enabled Send button after 10s. Falling back to Enter key...');
        inputArea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, keyCode: 13, key: 'Enter' }));
    }

    async function clearInputAttachments() {
        // Look for "Remove" buttons (X) on thumbnails in the input area
        // Strategy 1: Aria Label / Title
        const labels = ['Remove', 'Remove attachment', 'Close', 'Delete'];
        let removeBtns = Array.from(document.querySelectorAll('button')).filter(b =>
            labels.some(l => (b.ariaLabel === l || b.title === l))
        );

        // Strategy 2: SVG Path (X icon common path)
        if (removeBtns.length === 0) {
            // Find inputs/thumbnails logic...
            const thumbnails = document.querySelectorAll('div[role="group"] img, .input-area img');
            thumbnails.forEach(img => {
                // The button is usually a sibling or parent's sibling
                const container = img.closest('div[role="group"]') || img.parentElement;
                if (container) {
                    const btns = container.querySelectorAll('button');
                    btns.forEach(b => removeBtns.push(b));
                }
            });
        }

        // Strategy 2 (Backup): Find any button inside the input area that isn't the file upload or send button
        // This is risky, but effective if styled with an X

        const attachmentCloseBtns = removeBtns.filter(btn => {
            // Ensure button is near the input area or in a thumbnail container
            return btn.closest('.input-area') || btn.closest('div[role="group"]') || (btn.parentElement && btn.parentElement.innerText === ''); // Empty parents often hold icon-only buttons
        });

        if (attachmentCloseBtns.length > 0) {
            console.log(`Found ${attachmentCloseBtns.length} attachments to clear. Removing...`);
            for (let btn of attachmentCloseBtns) {
                // Ensure it's not the main upload button (usually has 'Attach' or specific icon)
                if (btn.ariaLabel === 'Attach media') continue;

                btn.click();
                await new Promise(r => setTimeout(r, 200));
            }
        }
    }

    async function waitForVideoResponse() {
        // Snapshot existing video URLs to ignore them
        const existingVideos = new Set(
            Array.from(document.querySelectorAll('video'))
                .map(v => v.src)
                .filter(s => s)
        );

        console.log('Waiting for new video... Existing:', existingVideos);

        return new Promise((resolve, reject) => {
            const timeoutMs = state.config && state.config.timeout ? state.config.timeout : 120000;
            let resolved = false;

            const cleanup = () => {
                resolved = true;
                observer.disconnect();
                clearInterval(poller);
                clearTimeout(failTimer);
            };

            const check = async () => {
                if (resolved) return;
                const videos = Array.from(document.querySelectorAll('video'));

                for (let v of videos) {
                    if (v.src && !existingVideos.has(v.src)) {
                        if (v.src.startsWith('blob:') || v.src.includes('video.twimg.com') || v.src.includes('grok.com')) {
                            console.log('New video detected:', v.src);
                            cleanup();
                            await new Promise(r => setTimeout(r, 2000));
                            resolve(v.src);
                            return;
                        }
                    }
                }

                // Check for Content Moderation / Rate Limit via BROAD Text Scan
                // (More robust than finding specific elements which might change classes)
                const bodyText = document.body.innerText;

                if (bodyText.includes('Rate limit reached') || bodyText.includes('Upgrade to unlock more')) {
                    console.warn('Rate Limit Detected (Text Scan)!');
                    cleanup();
                    reject(new Error('Rate Limit Reached'));
                    return;
                }

                if (bodyText.includes('Content Moderated') || bodyText.includes('Try a different idea')) {
                    // Verify it's not just in the prompt textarea
                    // Find the element containing this text to be sure it's an alert/toast
                    const hints = Array.from(document.querySelectorAll('div, span, p')).filter(el =>
                        el.innerText && (el.innerText.includes('Content Moderated') || el.innerText.includes('Try a different idea'))
                        && el.offsetParent !== null
                    );

                    // If we found a visible element with this text, likely the toast
                    if (hints.length > 0) {
                        console.warn('Content Moderation Detected (Text Scan)!');
                        cleanup();
                        reject(new Error('Content Moderated'));
                        return;
                    }
                }
            };

            const observer = new MutationObserver(check);
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
            const poller = setInterval(check, 1000);
            const failTimer = setTimeout(() => {
                cleanup();
                console.error('Timeout waiting for video. Current videos:', Array.from(document.querySelectorAll('video')).map(v => v.src));
                reject(new Error('Timeout waiting for video generation'));
            }, timeoutMs);
        });
    }

    async function upscaleVideo() {
        await new Promise(r => setTimeout(r, 2000)); // Wait for UI to settle

        // 1. Scope Search to Main Content Area (to avoid Sidebar)
        const mainContent = document.querySelector('main') || document.body;

        // Helper to find button/menuitem by text (Scoped optional)
        const findBtn = (text, scope = document) => {
            const elements = Array.from(scope.querySelectorAll('button, div[role="button"], div[role="menuitem"]'));
            return elements.find(el => {
                const content = (el.innerText || el.ariaLabel || el.textContent || '').toLowerCase();
                return content.includes(text.toLowerCase()) && !el.disabled;
            });
        };

        // 1. Try finding 'Upscale' directly (Search global or main? Main is safer for buttons, Global for menus)
        // Let's try Main first, then Global if needed?
        // Actually, direct buttons are usually in Main.
        let upscaleBtn = findBtn('Upscale', mainContent);

        if (!upscaleBtn) {
            console.log('Upscale button not found directly. Checking "More" menu...');

            // 2. Find "More" button (...) - Scoped to Main
            // Strategy A: Aria Label (More, Options, etc.)
            let moreBtn = Array.from(mainContent.querySelectorAll('button')).find(b => {
                const label = (b.ariaLabel || b.title || '').toLowerCase();
                // Ensure it's NOT in a navigation sidebar
                if (b.closest('nav') || b.closest('[role="navigation"]')) return false;

                return (label.includes('more') || label.includes('option')) && !b.disabled;
            });

            // Strategy C: Inner Text "..." (Loosened)
            if (!moreBtn) {
                console.log('Strategy A failed. Trying Strategy C (Inner Text "...")...');
                moreBtn = Array.from(mainContent.querySelectorAll('button')).find(b => {
                    if (b.closest('nav') || b.closest('[role="navigation"]')) return false;
                    const text = (b.innerText || '').trim();
                    return text.includes('...') || text.includes('…');
                });
            }

            // Strategy B: Proximity to "Edit" (Refined)
            if (!moreBtn) {
                console.log('Strategy A/C failed. Trying Strategy B (Proximity)...');
                const editBtn = Array.from(mainContent.querySelectorAll('button')).find(b =>
                    (b.innerText || '').toLowerCase().includes('edit') // broader match
                );

                if (editBtn) {
                    const container = editBtn.parentElement;
                    if (container) {
                        const siblings = Array.from(container.querySelectorAll('button'));
                        // The "More" button is usually the last one
                        const lastBtn = siblings[siblings.length - 1];
                        if (lastBtn && lastBtn !== editBtn) {
                            console.log('Found potential "More" button via proximity (last sibling).');
                            moreBtn = lastBtn;
                        }
                    }
                }
            }

            // Strategy D: Proximity to "Redo" or "Retry" (if Edit not found)
            if (!moreBtn) {
                console.log('Strategy A/B/C failed. Trying Strategy D (Redo/Retry Proximity)...');
                const actionBtn = Array.from(mainContent.querySelectorAll('button')).find(b => {
                    const text = (b.innerText || '').toLowerCase();
                    return text.includes('redo') || text.includes('retry') || text.includes('vary');
                });

                if (actionBtn) {
                    const container = actionBtn.parentElement;
                    if (container) {
                        const siblings = Array.from(container.querySelectorAll('button'));
                        const lastBtn = siblings[siblings.length - 1];
                        if (lastBtn && lastBtn !== actionBtn) {
                            console.log('Found potential "More" button via Redo/Retry proximity.');
                            moreBtn = lastBtn;
                        }
                    }
                }
            }

            if (moreBtn) {
                console.log('Found "More" menu button. Clicking...', moreBtn);

                // Attempt 1: Standard Click
                await simulateClick(moreBtn);
                await new Promise(r => setTimeout(r, 1000));

                // Verify if menu opened (Radix uses aria-expanded or data-state)
                let isOpen = moreBtn.getAttribute('aria-expanded') === 'true' || moreBtn.getAttribute('data-state') === 'open';

                if (!isOpen) {
                    console.log('Menu did not open. Retrying with native click() and Pointer events...');
                    // Attempt 2: Native Click + Force
                    moreBtn.click();
                    const pointerOpts = { bubbles: true, cancelable: true, view: window, pointerId: 1, isPrimary: true, button: 0 };
                    moreBtn.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
                    moreBtn.dispatchEvent(new PointerEvent('pointerup', pointerOpts));
                    await new Promise(r => setTimeout(r, 1000));
                }

                await new Promise(r => setTimeout(r, 1000)); // Extra settle time

                // 3. Search for Upscale again inside the new menu (Global Scope for Portals)
                upscaleBtn = findBtn('Upscale', document); // This will use the "Upscale" or "Upscale video" logic we have
            } else {
                console.warn('Could not find "More" button via any strategy.');

                // DIAGNOSTIC DUMP
                console.log('%c --- DIAGNOSTIC DUMP ---', 'color: cyan; font-weight: bold;');
                const likelyToolbar = document.querySelector('button')?.parentElement;
                if (likelyToolbar) {
                    console.log('Sample Toolbar HTML:', likelyToolbar.innerHTML);
                }
                const allButtons = Array.from(document.querySelectorAll('button'));
                console.log('All Buttons:', allButtons.map(b => ({
                    text: b.innerText,
                    aria: b.ariaLabel,
                    svg: b.querySelector('svg') ? 'Has SVG' : 'No SVG'
                })));
            }
        }

        if (!upscaleBtn) {
            console.warn('Upscale button not found anywhere.');
            throw new Error('Upscale button not found.');
        }

        console.log('Found Upscale button. Clicking...');
        await simulateClick(upscaleBtn);

        // Wait for the NEW video
        console.log('Waiting for upscaled video generation...');
        return waitForVideoResponse();
    }

    async function handleABTest() {
        // Wait briefly for UI to potentially show A/B test (Skip button)
        await new Promise(r => setTimeout(r, 2000));

        const findSkipBtn = () => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => {
                const text = (b.innerText || b.ariaLabel || '').toLowerCase();
                return text === 'skip' && !b.disabled;
            });
        };

        const skipBtn = findSkipBtn();

        if (skipBtn) {
            console.log('A/B Test detected (Skip button found).');

            if (state.config.autoSkip) {
                console.log('Auto-Skip enabled. Clicking Skip...');
                await simulateClick(skipBtn);
                // Wait for skip to process
                await new Promise(r => setTimeout(r, 2000));

                // Do NOT wait for a new video. The video is likely already there (the one we just generated).
                // Returning null keeps the previously detected videoUrl in processSegment.
                return null;
            } else {
                console.log('Auto-Skip disabled. Waiting for user selection...');
                // Poll until Skip button is GONE (meaning user selected something)
                return new Promise((resolve) => {
                    const check = setInterval(async () => {
                        if (!findSkipBtn()) {
                            clearInterval(check);
                            console.log('User selection detected (Skip button gone). Resuming...');
                            await new Promise(r => setTimeout(r, 1000));
                            // Use whatever video is now current
                            const videoUrl = await waitForVideoResponse();
                            resolve(videoUrl);
                        }
                    }, 1000);
                });
            }
        }

        return null; // No A/B test detected
    }

    async function extractLastFrame(videoUrl) {
        console.log('Fetching video data via background script to bypass CORS...');
        const dataUrl = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'FETCH_VIDEO_AS_DATA_URL',
                payload: { url: videoUrl }
            }, (response) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                if (response && response.success) resolve(response.dataUrl);
                else reject(new Error(response?.error || 'Unknown background fetch error'));
            });
        });

        const blob = dataURItoBlob(dataUrl);
        const objectUrl = URL.createObjectURL(blob);
        const video = document.createElement('video');
        video.muted = true;
        video.autoplay = false;

        return new Promise((resolve, reject) => {
            video.onloadedmetadata = async () => {
                try {
                    const time = Math.max(0, video.duration - 0.1);
                    video.currentTime = time;
                    await new Promise(r => video.onseeked = r);

                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);

                    canvas.toBlob(b => {
                        URL.revokeObjectURL(objectUrl);
                        video.remove();
                        resolve(b);
                    }, 'image/jpeg', 0.95);

                } catch (e) {
                    URL.revokeObjectURL(objectUrl);
                    reject(e);
                }
            };
            video.onerror = (e) => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Video load error'));
            };
            video.src = objectUrl;
        });
    }

    // --- Dashboard UI ---
    class Dashboard {
        constructor() {
            const existing = document.getElementById('grok-loop-dashboard');
            if (existing) existing.remove();

            this.root = createEl('div', '');
            this.root.id = 'grok-loop-dashboard';
            this.render();

            const append = () => {
                document.body.appendChild(this.root);
                console.log('Dashboard appended to body.');
                this.root.style.border = '5px solid yellow';
                setTimeout(() => this.root.style.border = '1px solid rgba(255,255,255,0.2)', 2000);
            };

            if (document.body) {
                append();
            } else {
                window.addEventListener('DOMContentLoaded', append);
            }

            // Init visibility from storage
            chrome.storage.local.get(['grokLoopConfig'], (res) => {
                const cfg = res.grokLoopConfig || {};
                console.log('[Content] Dashboard checking storage. Show?', cfg.showDashboard);

                // Strict check: Only hide if explicitly false
                if (cfg.showDashboard === false) {
                    this.setVisibility(false);
                } else {
                    // Default is visible (flex)
                }
            });
        }

        setVisibility(visible) {
            if (this.root) {
                this.root.style.display = visible ? '' : 'none';
            }
        }

        render() {
            this.root.innerHTML = '';

            // Header
            const header = createEl('div', 'dashboard-header');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.appendChild(createEl('h3', '', 'Grok Loop'));

            // Drag Logic (Simplified for readability in replace)
            let isDragging = false;
            let currentX, currentY, initialX, initialY;
            let xOffset = 0, yOffset = 0;

            header.onmousedown = (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; // Don't drag on controls
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                isDragging = true;
            };

            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    xOffset = currentX;
                    yOffset = currentY;
                    this.root.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
                }
            });

            document.addEventListener('mouseup', () => { isDragging = false; });

            // Controls Container
            const controls = createEl('div', 'dashboard-controls');
            controls.style.display = 'flex';
            controls.style.gap = '8px';

            // Settings Button
            const settingsBtn = createEl('button', 'icon-btn', '⚙');
            settingsBtn.title = 'Settings';
            settingsBtn.onclick = () => {
                const panel = this.root.querySelector('.settings-panel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            };
            controls.appendChild(settingsBtn);

            // Collapse Button
            const collapseBtn = createEl('button', 'icon-btn', '⇄');
            collapseBtn.title = 'Collapse/Expand';
            collapseBtn.onclick = () => {
                this.root.classList.toggle('collapsed');
                if (this.root.classList.contains('collapsed')) {
                    this.root.style.transform = '';
                    xOffset = 0; yOffset = 0;
                }
            };
            controls.appendChild(collapseBtn);
            header.appendChild(controls);
            this.root.appendChild(header);

            // Settings Panel
            const settingsPanel = createEl('div', 'settings-panel');
            settingsPanel.style.display = 'none';
            settingsPanel.style.padding = '10px';
            settingsPanel.style.background = 'rgba(0,0,0,0.3)';
            settingsPanel.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            settingsPanel.style.fontSize = '12px';

            // Option: Strict Mode
            const strictRow = createEl('div', 'setting-row');
            strictRow.style.display = 'flex';
            strictRow.style.alignItems = 'center';
            strictRow.style.gap = '8px';

            const strictCb = createEl('input', '');
            strictCb.type = 'checkbox';
            strictCb.id = 'setting-strict-mode';
            strictCb.checked = state.config.strictMode || false;

            strictCb.onchange = (e) => {
                state.config.strictMode = e.target.checked;
                console.log('Strict Mode toggled:', state.config.strictMode);
                // Save to storage
                chrome.storage.local.get(['grokLoopConfig'], (res) => {
                    const cfg = res.grokLoopConfig || {};
                    cfg.strictMode = state.config.strictMode;
                    chrome.storage.local.set({ 'grokLoopConfig': cfg });
                });
            };

            const strictLabel = createEl('label', '', 'Strict Enter Mode (No Fallback)');
            strictLabel.htmlFor = 'setting-strict-mode';
            strictLabel.title = "If enabled, forces use of Enter key purely. If disabled (default), tries button click first.";

            strictRow.appendChild(strictCb);
            strictRow.appendChild(strictLabel);
            settingsPanel.appendChild(strictRow);

            // Option: Skip on Moderation
            const skipModRow = createEl('div', 'setting-row');
            skipModRow.style.display = 'flex';
            skipModRow.style.alignItems = 'center';
            skipModRow.style.gap = '8px';
            skipModRow.style.marginTop = '4px';

            const skipModCb = createEl('input', '');
            skipModCb.type = 'checkbox';
            skipModCb.id = 'setting-skip-mod';
            skipModCb.checked = state.config.skipOnModeration || false;

            skipModCb.onchange = (e) => {
                state.config.skipOnModeration = e.target.checked;
                console.log('Skip on Moderation toggled:', state.config.skipOnModeration);
                chrome.storage.local.get(['grokLoopConfig'], (res) => {
                    const cfg = res.grokLoopConfig || {};
                    cfg.skipOnModeration = state.config.skipOnModeration;
                    chrome.storage.local.set({ 'grokLoopConfig': cfg });
                });
            };

            const skipModLabel = createEl('label', '', 'Skip on Moderation Failure');
            skipModLabel.htmlFor = 'setting-skip-mod';
            skipModLabel.title = "If enabled, heavily moderated segments will be marked as 'error' and skipped instead of pausing the workflow.";

            skipModRow.appendChild(skipModCb);
            skipModRow.appendChild(skipModLabel);
            settingsPanel.appendChild(skipModRow);

            this.root.appendChild(settingsPanel);


            // List
            const list = createEl('div', 'segments-list');
            if (state.segments.length === 0) {
                const empty = createEl('div', 'segment-info', 'Ready to start...');
                empty.style.padding = '10px';
                list.appendChild(empty);
            } else {
                state.segments.forEach((seg, index) => {
                    const card = createEl('div', `segment-card ${seg.status} ${index === state.currentSegmentIndex ? 'active' : ''}`);

                    const info = createEl('div', 'segment-info');
                    info.textContent = `Segment ${index + 1} • ${seg.status.toUpperCase()}`;
                    card.appendChild(info);

                    const prompt = createEl('div', 'segment-prompt', seg.prompt);
                    card.appendChild(prompt);

                    if (seg.inputImage || seg.videoUrl) {
                        const mediaContainer = createEl('div', 'segment-media');
                        if (seg.videoUrl) {
                            const video = createEl('video', 'preview-video');
                            video.src = seg.videoUrl;
                            video.controls = true;
                            video.muted = true;
                            mediaContainer.appendChild(video);
                        }
                        card.appendChild(mediaContainer);
                    }

                    const actions = createEl('div', 'segment-actions');
                    if (seg.videoUrl) {
                        const dlBtn = createEl('button', 'action-btn secondary', '⬇');
                        dlBtn.title = 'Download Video';
                        dlBtn.style.fontSize = '14px';
                        dlBtn.style.padding = '2px 6px';
                        dlBtn.onclick = () => window.LoopManager.downloadSegment(index);
                        actions.appendChild(dlBtn);
                    }
                    if (seg.status !== 'working') {
                        // Icon Button for Regen
                        const regenBtn = createEl('button', 'action-btn', '↻');
                        regenBtn.title = `Regenerate Scene ${index + 1}`;
                        regenBtn.style.fontSize = '14px';
                        regenBtn.style.padding = '2px 6px';

                        regenBtn.onclick = () => {
                            // "Act similar to the pop up to allow user to regen a scene or all the scenes after"
                            if (confirm(`Regenerate Scene ${index + 1}?\n\n• OK: Regenerate this scene AND cascaded updates for subsequent scenes.\n• Cancel: Abort.`)) {
                                window.LoopManager.regenerateSegment(index);
                            }
                        };
                        actions.appendChild(regenBtn);
                    }
                    card.appendChild(actions);

                    list.appendChild(card);
                });
            }
            this.root.appendChild(list);

            // Status Bar
            const status = createEl('div', 'status-bar');
            status.style.display = 'flex';
            status.style.justifyContent = 'space-between';
            status.style.alignItems = 'center';
            status.style.gap = '8px';

            const statusText = createEl('span', '', state.isRunning ? 'Running...' : 'Paused/Idle');
            status.appendChild(statusText);

            if (state.segments.length > 0) {
                const pauseBtn = createEl('button', 'action-btn', state.isRunning ? 'Pause' : 'Resume');
                pauseBtn.style.padding = '4px 8px';
                pauseBtn.style.fontSize = '12px';
                pauseBtn.onclick = () => window.LoopManager.togglePause();
                status.appendChild(pauseBtn);
            }

            this.root.appendChild(status);
        }

        update() {
            this.render();
            // Broadcast state to Popup
            try {
                chrome.runtime.sendMessage({
                    action: 'LOOP_STATE_UPDATE',
                    payload: {
                        isRunning: state.isRunning,
                        currentSegmentIndex: state.currentSegmentIndex,
                        segments: state.segments.map(s => ({
                            prompt: s.prompt,
                            status: s.status,
                            videoUrl: s.videoUrl
                        }))
                    }
                }).catch(() => {
                    // Popup likely closed, ignore error
                });
            } catch (e) { }
        }
    }

    // --- Loop Manager ---
    window.LoopManager = {
        dashboard: null,

        init() {
            this.dashboard = new Dashboard();
            console.log('LoopManager initialized dashboard');
        },

        async start(payload) {
            console.log('LoopManager starting...', payload);
            if (state.isRunning) return;

            state.config = {
                ...state.config, // Preserve existing (like storage loaded debug flags)
                timeout: (payload.timeout || 30) * 1000,
                maxDelay: payload.maxDelay || 15,
                upscale: payload.upscale,
                autoDownload: payload.autoDownload,
                autoSkip: payload.autoSkip,
                reuseInitialImage: payload.reuseInitialImage,
                pauseOnModeration: payload.pauseOnModeration,
                showDebugLogs: payload.showDebugLogs !== undefined ? payload.showDebugLogs : state.config.showDebugLogs,
                showDashboard: payload.showDashboard !== undefined ? payload.showDashboard : state.config.showDashboard,
                moderationRetryLimit: payload.moderationRetryLimit || 2,
                initialImage: payload.initialImage ? dataURItoBlob(payload.initialImage) : null
            };

            // Map Payload scenes to Segments (Convert DataURLs to Blobs)
            state.segments = payload.scenes ? payload.scenes.map((s, i) => ({
                id: i,
                prompt: s.prompt,
                inputImage: s.inputImage ? dataURItoBlob(s.inputImage) : null,
                videoUrl: null,
                status: 'pending'
            })) : payload.prompts.map((p, i) => ({ // Fallback for legacy calls
                id: i,
                prompt: p,
                inputImage: null,
                videoUrl: null,
                status: 'pending'
            }));

            // Handle Scene 1 Fallback if no specific input image but global exists (and NOT reuse, to behave like legacy "Start with Image")
            // Actually, processSegment handles this via state.config.initialImage logic. 
            // But strict "Scene 1 Only" logic usually implies Scene 1 gets it explicitly.
            if (!state.config.reuseInitialImage && state.config.initialImage && !state.segments[0].inputImage) {
                state.segments[0].inputImage = state.config.initialImage;
            }

            // REMOVED: Legacy Loop Expansion (was causing crash)

            state.isRunning = true;
            state.currentSegmentIndex = 0;
            this.dashboard.update();

            // Respect user preference for dashboard visibility
            // Default to true if undefined (for back-compat), but popup sends it now.
            const shouldShow = (state.config.showDashboard !== false);
            this.dashboard.setVisibility(shouldShow);

            await this.processQueue();
        },

        async restore(savedState) {
            console.log('Restoring loop state...', savedState);
            state.segments = savedState.segments;
            state.currentSegmentIndex = savedState.currentSegmentIndex;
            state.config = savedState.config;
            state.isRunning = true;

            if (state.currentSegmentIndex >= 0 && state.currentSegmentIndex < state.segments.length) {
                const seg = state.segments[state.currentSegmentIndex];
                if (seg.status === 'working' || seg.status === 'error') {
                    seg.status = 'pending';
                }
            }

            this.dashboard.update();
            if (this.dashboard.root.style.display === 'none') {
                this.dashboard.root.style.display = 'flex';
            }

            await this.processQueue();
        },

        saveState() {
            const segmentsToSave = state.segments.map(s => ({
                id: s.id,
                prompt: s.prompt,
                videoUrl: s.videoUrl,
                status: s.status,
                inputImage: null
            }));

            const savePayload = {
                segments: segmentsToSave,
                currentSegmentIndex: state.currentSegmentIndex,
                config: state.config
            };

            chrome.storage.local.set({ 'grokLoopState': savePayload });
        },

        togglePause(shouldResume, resumePayload) {
            state.isRunning = shouldResume;

            if (shouldResume) {
                console.log('Resuming loop...');

                // Merge Payload Updates (if provided)
                if (resumePayload && resumePayload.scenes) {
                    console.log('Merging updated scenes from Resume payload...');

                    // 1. Update Existing Segments
                    resumePayload.scenes.forEach((updatedScene, i) => {
                        // If this is an existing segment
                        if (i < state.segments.length) {
                            // Only update future or current segments. Don't touch history.
                            if (i >= state.currentSegmentIndex && state.currentSegmentIndex !== -1) {
                                state.segments[i].prompt = updatedScene.prompt;
                                if (updatedScene.inputImage !== undefined) {
                                    if (typeof updatedScene.inputImage === 'string' && updatedScene.inputImage.startsWith('data:')) {
                                        state.segments[i].inputImage = dataURItoBlob(updatedScene.inputImage);
                                    } else {
                                        state.segments[i].inputImage = updatedScene.inputImage;
                                    }
                                }
                            }
                        } else {
                            // 2. Append New Segments
                            console.log(`Appending new scene ${i + 1} from Resume payload...`);
                            const newSeg = {
                                id: i,
                                prompt: updatedScene.prompt,
                                inputImage: updatedScene.inputImage ? (typeof updatedScene.inputImage === 'string' && updatedScene.inputImage.startsWith('data:') ? dataURItoBlob(updatedScene.inputImage) : updatedScene.inputImage) : null,
                                videoUrl: null,
                                status: 'pending'
                            };
                            state.segments.push(newSeg);
                        }
                    });

                    // 3. Handle Resume Logic (If we were finished but now have more work)
                    if (state.currentSegmentIndex === -1 && state.segments.length > 0) {
                        // Find the first pending segment
                        const firstPending = state.segments.findIndex(s => s.status === 'pending');
                        if (firstPending !== -1) {
                            console.log(`Resume requested on finished loop. Found new pending segment at ${firstPending}. Restarting queue...`);
                            state.currentSegmentIndex = firstPending;
                            // Ensure strict mode isn't blocked? existing isRunning=true handles it.
                        }
                    }
                }

                this.dashboard.update();

                // If we were stuck in a loop/delay, state.isRunning=true will unlock it.
                // If we were effectively stopped, we might need to kick processQueue?
                // But loop is usually:
                // while(state.isRunning) { ... }
                // If we set isRunning=false, the loop exits `break`.
                // So we DO need to re-trigger `processQueue` if it fully stopped.

                // Check if loop is active
                // A simple way is to check if we are 'working'

                // Actually, if we Pause, the `start()` loop breaks (line 917: `if (!state.isRunning) break;`).
                // So valid Resume must restart the queue from current index.
                this.processQueue();
            } else {
                console.log('Pausing loop...');
                this.dashboard.update();
                // The running loop will hit `if (!state.isRunning)` and break.
            }
        },


        async waitForVideoInputState() {
            // Wait for the UI to recognize the image upload
            console.log('Waiting for image upload to process (Looking for Placeholder/Button)...');

            // Allow up to 20 seconds for upload processing
            for (let i = 0; i < 40; i++) {
                // 1. Placeholder Check (Targeted)
                const inputs = Array.from(document.querySelectorAll('textarea, input[type="text"]'));
                const foundPlaceholder = inputs.some(el => {
                    const ph = el.getAttribute('placeholder');
                    return ph && (ph.includes('Type to customize video') || ph.includes('Customize video'));
                });

                // 2. Button State Check (Backup)
                const makeBtn = Array.from(document.querySelectorAll('button')).find(b =>
                    b.innerText.includes('Make video') && !b.disabled && !b.classList.contains('disabled')
                );

                if (foundPlaceholder || makeBtn) {
                    console.log('Upload success confirmed.');
                    await new Promise(r => setTimeout(r, 1000)); // Safety cooldown
                    return;
                }
                await new Promise(r => setTimeout(r, 500));
            }

            console.warn('Timed out waiting for upload indicator.');
            throw new Error('Image Upload Failed (Timeout)');
        },

        async processQueue() {
            for (let i = state.currentSegmentIndex; i < state.segments.length; i++) {
                state.currentSegmentIndex = i;

                if (!state.isRunning) {
                    console.log('Loop paused.');
                    this.saveState();
                    this.dashboard.update();
                    break;
                }

                if (state.segments[i].status === 'done') continue;



                if (!state.isRunning) {
                    console.log('Loop paused during delay.');
                    this.saveState();
                    this.dashboard.update();
                    break;
                }

                await this.processSegment(i);

                // Pause After Scene (Step Mode)
                if (state.config.pauseAfterScene && state.isRunning) {
                    console.log('Pause After Scene active. Pausing loop...');
                    state.isRunning = false;
                    this.dashboard.update(); // Broadcast "Paused" state
                }

                this.saveState();

                if (!state.isRunning) break;
            }

            if (state.currentSegmentIndex >= state.segments.length - 1 && state.segments[state.segments.length - 1].status === 'done') {
                state.isRunning = false;
                state.currentSegmentIndex = -1;
                this.dashboard.update();
                chrome.storage.local.remove('grokLoopState');
                console.log('Loop finished. State cleared.');
            }
        },

        async processSegment(index) {
            const seg = state.segments[index];
            const maxRetries = 2;
            let modAttempts = 0; // Track moderation retries separately

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                if (!state.isRunning) return;

                try {
                    console.log(`Processing Segment ${index + 1} (Attempt ${attempt + 1}/${maxRetries + 1})...`);

                    seg.status = 'working';
                    this.dashboard.update();

                    // 0. Clean Input State (Likely fixes "Leaked Image" bug)
                    await clearInputAttachments();

                    // 1. Input Image
                    // 1. Input Image (Late Extraction for chaining)
                    // Only extract if we are NOT reusing the global image
                    if (!seg.inputImage && index > 0 && !state.config.reuseInitialImage) {
                        const prevSeg = state.segments[index - 1];
                        if (prevSeg.videoUrl) {
                            console.log(`Extracting last frame from Segment ${index} (Late Extract)...`);
                            seg.inputImage = await extractLastFrame(prevSeg.videoUrl);
                        } else {
                            throw new Error(`Previous segment ${index} has no output video to chain from.`);
                        }
                    }

                    // 1. Upload/Prepare Image
                    const isFirst = (index === 0);
                    const reuseImage = state.config.reuseInitialImage;

                    // Determine which image to use
                    // Priority: 
                    // 1. Custom Image for this segment (User Uploaded)
                    // 2. Extracted Frame (Loop Mode) - implicitly stored in seg.inputImage by previous step
                    // 3. Global Initial Image (If Reuse is ON, or if First Segment)

                    let imageToUpload = seg.inputImage;

                    // Fallbacks
                    if (!imageToUpload) {
                        if (reuseImage && state.config.initialImage) { // Only use initial image if reuse is ON and it exists
                            imageToUpload = state.config.initialImage;
                            console.log('[Debug-Image] Selected: Global initial image (Reuse ON)');
                        } else if (isFirst && state.config.initialImage) { // If first segment and initial image exists
                            imageToUpload = state.config.initialImage;
                            console.log('[Debug-Image] Selected: Global initial image (First Segment)');
                        } else {
                            // Loop Mode fallback (if extraction failed or wasn't set)
                            // FIX: Only use fallback for subsequent scenes (index > 0). 
                            // Scene 1 should NOT inherit a stale lastGeneratedImage unless explicitly configured (reuseInitialImage handled above).
                            if (index > 0 && state.lastGeneratedImage) {
                                console.log('[Debug-Image] Selected: Last generated frame (Fallback, Index > 0)');
                                imageToUpload = state.lastGeneratedImage;
                            } else {
                                console.log(`[Debug-Image] Selected: NULL. (Index: ${index}, LastGen: ${!!state.lastGeneratedImage}, ConfigInit: ${!!state.config.initialImage})`);
                            }
                        }
                    } else {
                        console.log('[Debug-Image] Selected: Pre-defined input image (Custom or Extracted)');
                    }

                    if (imageToUpload) {
                        console.log(`Uploading input image for Segment ${index + 1}...`);
                        const base64 = await blobToBase64(imageToUpload);
                        await uploadImageToGrok(base64);
                        await this.waitForVideoInputState();
                    } else {
                        console.log('No input image found for this segment. Proceeding text-only (or starting fresh)...');
                    }

                    // 2. Prompt
                    let finalPrompt = seg.prompt || '';
                    if (state.config.globalPrompt && state.config.globalPrompt.trim().length > 0) {
                        const suffix = state.config.globalPrompt.trim();
                        // Append with a space if prompt is not empty
                        finalPrompt = finalPrompt ? `${finalPrompt} ${suffix}` : suffix;
                        console.log(`Applied Global Suffix: "${suffix}" -> Final: "${finalPrompt}"`);
                    }

                    console.log(`Sending prompt for Segment ${index + 1}...`);
                    await sendPromptToGrok(finalPrompt);

                    // 3. Status
                    let videoUrl = await waitForVideoResponse();

                    // --- A/B Test Handling ---
                    const abVideoUrl = await handleABTest();
                    if (abVideoUrl) {
                        videoUrl = abVideoUrl;
                    }

                    // --- Upscaling (Optional) ---
                    if (state.config.upscale) {
                        try {
                            console.log('Upscaling requested. Looking for Upscale button...');
                            const upscaledUrl = await upscaleVideo();
                            if (upscaledUrl) {
                                console.log('Upscale successful. Replacing video URL.');
                                videoUrl = upscaledUrl;
                            }
                        } catch (upscaleErr) {
                            console.warn('Upscaling failed (skipping, using original):', upscaleErr);
                        }
                    }

                    seg.videoUrl = videoUrl;
                    seg.status = 'done';

                    // --- Auto-Download (Optional) ---
                    if (state.config.autoDownload && videoUrl) {
                        try {
                            console.log(`Auto-downloading Segment ${index + 1}...`);
                            // Add a small delay to ensure internal state handles it
                            window.LoopManager.downloadSegment(index);
                        } catch (dlErr) {
                            console.warn('Auto-download failed:', dlErr);
                        }
                    }

                    // Proactive Extraction (Only if NOT reusing initial image)
                    if (index + 1 < state.segments.length && !state.config.reuseInitialImage) {
                        const nextSeg = state.segments[index + 1];

                        // IMPORTANT: Do NOT overwrite if user provided a custom image!
                        if (!nextSeg.inputImage) {
                            console.log(`Proactively extracting frame for Segment ${index + 2}...`);
                            try {
                                const nextFrame = await extractLastFrame(videoUrl);
                                nextSeg.inputImage = nextFrame;
                                state.lastGeneratedImage = nextFrame; // Update global backup
                            } catch (e) {
                                console.warn('Proactive extraction failed (will retry on next step):', e);
                            }
                        } else {
                            console.log(`Segment ${index + 2} has a custom image. Skipping frame extraction.`);
                            // Still update lastGeneratedImage for backup
                            try {
                                state.lastGeneratedImage = await extractLastFrame(videoUrl);
                            } catch (e) { }
                        }
                    }

                    // Human-like Delay (Random 33% to 100% of Max Delay)
                    if (state.config.maxDelay > 0) {
                        const minDelay = state.config.maxDelay * 0.33;
                        const randomFactor = Math.random() * 0.67; // 0 to 0.67
                        const delaySec = minDelay + (randomFactor * state.config.maxDelay);
                        const delayMs = Math.floor(delaySec * 1000);

                        console.log(`Human-like Wait: ${Math.round(delayMs / 1000)}s (Max: ${state.config.maxDelay}s)`);

                        // Breakable delay loop using 100ms chunks to allow immediate Pause/Stop
                        for (let t = 0; t < delayMs; t += 100) {
                            if (!state.isRunning) break;
                            await new Promise(r => setTimeout(r, 100));
                        }
                    }

                    console.log(`Segment ${index + 1} complete.`);
                    this.dashboard.update();
                    return;

                } catch (err) {
                    console.error('Segment Error:', err);

                    // 1. Specific Handlers (Priority)

                    // Rate Limit
                    if (err.message === 'Rate Limit Reached') {
                        console.error('Rate Limit Reached. Creating Alert...');
                        state.isRunning = false;
                        seg.status = 'paused (rate limit)';
                        this.dashboard.update();
                        alert("Grok Rate Limit Reached!\n\nPlease wait 24 hours or switch accounts to continue.\nThe loop has been paused.");
                        return; // Stop.
                    }

                    // Content Moderation
                    if (err.message === 'Content Moderated') {
                        // Check if Pause on Moderation is ENABLED
                        if (state.config.pauseOnModeration) {
                            console.warn('Content Moderation hit & Pause on Mod Enabled. Pausing...');
                            state.isRunning = false;
                            seg.status = 'paused (moderation)';
                            this.dashboard.update();
                            alert("Loop Paused: Content Moderated.\n\nOption 'Pause on Moderation' is enabled.");
                            return;
                        }

                        modAttempts++;
                        const limit = state.config.moderationRetryLimit || 2; // Default 2

                        if (modAttempts <= limit) {
                            console.warn(`Content Moderation hit (${modAttempts}/${limit}). Waiting 5s then clicking Redo...`);
                            seg.status = `moderated (${modAttempts}/${limit})`;
                            this.dashboard.update();

                            await new Promise(r => setTimeout(r, 5000));

                            // Try to find and click Redo/Regenerate button
                            const redoBtn = Array.from(document.querySelectorAll('button')).find(b =>
                                (b.innerText.includes('Redo') || b.innerText.includes('Regenerate') || b.getAttribute('aria-label')?.includes('Regenerate'))
                                && !b.disabled
                            );

                            if (redoBtn) {
                                console.log('Clicking Redo/Regenerate button...');
                                redoBtn.click();
                            } else {
                                console.warn('Redo button not found. Falling back to full retry loop.');
                            }

                            // Decrement attempt to not count against crash retries
                            attempt--;
                            continue;
                        } else {
                            console.error('Moderation Limit Reached.');

                            if (state.config.skipOnModeration) {
                                console.warn('Skip on Moderation enabled. Marking segment as error and continuing...');
                                seg.status = 'error (moderated)';
                                this.dashboard.update();
                                return; // Continue to next segment
                            } else {
                                state.isRunning = false;
                                seg.status = 'paused (moderation limit)';
                                this.dashboard.update();
                                alert("Loop Paused: Content Moderation Limit Reached.\n\nPlease adjust your prompt/image and click Resume.");
                                return;
                            }
                        }
                    }

                    // 2. Generic Global Pause on Error (User Requested)
                    // Only triggers if NOT handled above
                    if (state.config.pauseOnError) {
                        console.error('Pause on Error enabled. Stopping loop.');
                        state.isRunning = false;
                        seg.status = 'error';
                        this.dashboard.update();
                        alert(`Workflow Paused due to Error:\n${err.message}`);
                        return;
                    }


                    console.error(`Segment ${index + 1} failed on attempt ${attempt + 1}:`, err);

                    if (attempt < maxRetries) {
                        console.log('Retrying in 5 seconds...');
                        await new Promise(r => setTimeout(r, 5000));
                    } else {
                        seg.status = 'error';
                        this.dashboard.update();
                        if (!state.config.continueOnFailure) {
                            state.isRunning = false;
                            throw err;
                        } else {
                            console.warn('Max retries reached. Skipping segment (Continue on Failure ON).');
                        }
                    }
                }
            }
        },

        async regenerateSegment(index, newPrompt) {
            if (state.isRunning) { alert("Please Pause first."); return; }

            const cascade = confirm("Regenerate all subsequent segments too?\nOK = Cascade (Everything after this changes)\nCancel = Single (Just this one)");

            const seg = state.segments[index];
            if (newPrompt && typeof newPrompt === 'string') {
                console.log(`Updating prompt for Segment ${index + 1} before regeneration.`);
                seg.prompt = newPrompt;
            }

            seg.status = 'pending';
            seg.videoUrl = null;

            if (cascade) {
                // ...
            }
            // ... (rest is same, but I need to include it or carefully target)
            if (cascade) {
                for (let i = index + 1; i < state.segments.length; i++) {
                    state.segments[i].status = 'pending';
                    state.segments[i].videoUrl = null;
                    state.segments[i].inputImage = null;
                }
            }

            state.isRunning = true;
            state.currentSegmentIndex = index;
            this.dashboard.update();

            await this.processQueue();
        },

        downloadSegment(index) {
            // ...
            const seg = state.segments[index];
            if (seg.videoUrl) {
                chrome.runtime.sendMessage({
                    action: 'DOWNLOAD_VIDEO',
                    payload: { url: seg.videoUrl, filename: `grok_loop_segment_${index + 1}.mp4` }
                });
            }
        }
    };

    // --- Init ---
    window.LoopManager.init();

    // Listener - Messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[Content] Received message:', message);

        if (message.action === 'START_LOOP') {
            window.LoopManager.start(message.payload);
            sendResponse({ status: 'STARTED' });
        }
        else if (message.action === 'PAUSE_LOOP') {
            window.LoopManager.togglePause(false);
        }
        else if (message.action === 'RESUME_LOOP') {
            if (!state.isRunning) window.LoopManager.togglePause(true, message.payload);
        }
        else if (message.action === 'REGENERATE_SEGMENT') {
            window.LoopManager.regenerateSegment(message.payload.index, message.payload.prompt);
        }
        else if (message.action === 'DOWNLOAD_SEGMENT') {
            window.LoopManager.downloadSegment(message.payload.index);
        }
        else if (message.action === 'SET_DASHBOARD_VISIBILITY') {
            window.LoopManager.dashboard.setVisibility(message.payload.visible);
        }
    });

    // Listener - Storage (Sync Config Runtime)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.grokLoopConfig) {
            const newConfig = changes.grokLoopConfig.newValue;
            if (newConfig) {
                console.log('[Content] Config updated from storage:', newConfig);
                // Update specific keys relevant to runtime
                if (state.config) {
                    if (newConfig.pauseOnModeration !== undefined) state.config.pauseOnModeration = newConfig.pauseOnModeration;
                    if (newConfig.showDebugLogs !== undefined) state.config.showDebugLogs = newConfig.showDebugLogs;
                    if (newConfig.moderationRetryLimit !== undefined) state.config.moderationRetryLimit = newConfig.moderationRetryLimit;
                    // Other runtime configs can be synced here if needed
                }
            }
        }
    });
}
