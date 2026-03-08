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
    if (!blob || !(blob instanceof Blob)) {
        return Promise.reject(new Error('Parameter is not a Blob or is null'));
    }
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
    if (!element) return;

    // 1. Idempotency Check: Don't re-insert if text already matches (Prevents doubling/flicker)
    const currentText = (element.textContent || element.value || '').trim();
    if (currentText === text.trim() && text.length > 0) {
        console.log('[insertTextFast] Text already matches. Skipping redundant insertion.');
        return;
    }

    // HARD LOCK: Prevent concurrent text insertions (Fix for 3-video mirroring bug)
    if (window.__grokLoopInsertingText) {
        console.warn('[insertTextFast] Blocked concurrent text insertion!');
        return;
    }
    window.__grokLoopInsertingText = true;

    try {
        element.focus();
        console.log('[insertTextFast] Target element:', element.tagName, 'isContentEditable:', element.isContentEditable, 'Text length:', text.length);

        // =====================================================================
        // STRATEGY: We need to update BOTH the DOM AND React's internal state.
        // Grok's "Make Video" button reads from React state, not the DOM.
        //
        // For contentEditable: execCommand('insertText') updates DOM and fires
        // native InputEvent. We ALSO invoke React's fiber onChange directly.
        //
        // For textarea/input: Use the native setter + InputEvent approach.
        // =====================================================================

        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            // --- TEXTAREA / INPUT PATH ---
            const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value") ||
                Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");

            if (descriptor && descriptor.set) {
                descriptor.set.call(element, text);
            } else {
                element.value = text;
            }

            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));

        } else if (element.isContentEditable) {
            // --- CONTENTEDITABLE PATH (Grok's primary input) ---

            // Step 1: Select all existing content (Aggressive Selection)
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);

            // Step 2: Clear any existing children if React didn't clean up (Manual reset)
            if (element.children.length > 5) {
                console.log('[insertTextFast] Too many child nodes. Performing manual cleanup...');
                element.innerHTML = '';
                element.focus();
            }

            // Step 3: Fire beforeinput (modern React/browsers use this)
            try {
                element.dispatchEvent(new InputEvent('beforeinput', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: text
                }));
            } catch (e) {
                console.warn('[insertTextFast] beforeinput dispatch failed:', e.message);
            }

            // Step 3: Use execCommand to replace the selection (updates DOM natively)
            document.execCommand('insertText', false, text);

            // Step 4: Dispatch a proper InputEvent (not generic Event)
            // React 17+ listens for InputEvent with inputType/data on contentEditable
            await new Promise(r => setTimeout(r, 50));
            try {
                element.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: false,
                    inputType: 'insertText',
                    data: text
                }));
            } catch (e) {
                // Fallback to generic Event if InputEvent constructor fails
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Step 5: Try to invoke React's internal onChange handler directly
            // This is the nuclear option — find the React fiber on the element
            // and call its onChange with the current text.
            try {
                const reactKey = Object.keys(element).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$') || k.startsWith('__reactProps$'));
                if (reactKey) {
                    const fiber = element[reactKey];
                    // Walk up the fiber tree looking for an onChange handler
                    let current = fiber;
                    for (let i = 0; i < 10 && current; i++) {
                        const props = current.memoizedProps || current.pendingProps;
                        if (props && typeof props.onChange === 'function') {
                            console.log('[insertTextFast] Found React onChange handler on fiber. Invoking...');
                            props.onChange({
                                target: element,
                                currentTarget: element,
                                type: 'change',
                                preventDefault: () => { },
                                stopPropagation: () => { },
                                nativeEvent: new Event('change')
                            });
                            break;
                        }
                        if (props && typeof props.onInput === 'function') {
                            console.log('[insertTextFast] Found React onInput handler on fiber. Invoking...');
                            props.onInput({
                                target: element,
                                currentTarget: element,
                                type: 'input',
                                preventDefault: () => { },
                                stopPropagation: () => { },
                                nativeEvent: new Event('input')
                            });
                            break;
                        }
                        current = current.return;
                    }
                }
            } catch (e) {
                console.warn('[insertTextFast] React fiber access failed (non-critical):', e.message);
            }
        }

        // --- Settle time for React to process the state change ---
        await new Promise(r => setTimeout(r, 300));

        // Verify text was inserted
        const actualText = element.value || element.textContent || '';
        console.log('[insertTextFast] Verification - Expected:', text.substring(0, 30) + '...', 'Actual:', actualText.substring(0, 30) + '...', 'Match:', actualText.includes(text.substring(0, 20)));

        await new Promise(r => setTimeout(r, 200)); // Final settle
    } finally {
        window.__grokLoopInsertingText = false;
    }
}

/**
 * Deep search for elements across all Shadow Roots on the page.
 */
window.queryAllAcrossShadows = function (selector, root = document) {
    let elements = Array.from(root.querySelectorAll(selector));

    // Find all elements that HAVE a shadow root
    const hosts = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
    for (const host of hosts) {
        elements = elements.concat(window.queryAllAcrossShadows(selector, host.shadowRoot));
    }

    return [...new Set(elements)]; // Deduplicate
};

/**
 * Robust click simulation for complex UI frameworks (React/Radix/MUI).
 * Fires a sequence of events to ensure handlers are triggered.
 */
window.simulateClick = async function (element) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const common = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };

    element.focus();
    element.dispatchEvent(new PointerEvent('pointerdown', common));
    element.dispatchEvent(new MouseEvent('mousedown', common));
    element.dispatchEvent(new PointerEvent('pointerup', common));
    element.dispatchEvent(new MouseEvent('mouseup', common));
    element.dispatchEvent(new MouseEvent('click', common));

    // Final fallback for native click method
    if (typeof element.click === 'function') {
        element.click();
    }

    console.log(`[simulateClick] Dispatched sequence to: ${element.tagName} "${(element.innerText || '').substring(0, 20)}"`);
};

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

    // Note: The "Gentle Back" logic previously here was moved to processSegment() 
    // to ensure it triggers even when no image is being uploaded.

    if (!fileInput) {

        if (!fileInput) {
            const buttons = Array.from(document.querySelectorAll('button'));
            const uploadTrigger = buttons.find(b => {
                const ariaLabel = b.getAttribute('aria-label') || '';
                const rawText = (b.innerText || b.textContent || ariaLabel || b.title || '').toLowerCase();
                const strippedText = rawText.replace(/\s+/g, '');

                // HARD BLOCK: Never click "Make Video" while trying to upload an image.
                if (strippedText.includes('makevideo') || TRANSLATIONS.makeVideo.some(k => rawText.trim() === k)) {
                    return false;
                }

                return rawText.includes('upload') || rawText.includes('image') || rawText.includes('photo') || rawText.includes('add');
            });

            if (uploadTrigger) {
                console.log('--- DEBUG LOG --- Kliking upload trigger:', uploadTrigger.outerHTML.substring(0, 300));
                await simulateClick(uploadTrigger);
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

    console.log('--- DEBUG LOG --- Found fileInput:', fileInput.outerHTML.substring(0, 300));

    let blob = input;
    if (typeof input === 'string') blob = dataURItoBlob(input);

    const fileName = `input.${blob.type.split('/')[1]}`;
    const file = new File([blob], fileName, { type: blob.type });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    console.log('--- DEBUG LOG --- Dispatching change event on fileInput');
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('--- DEBUG LOG --- Dispatching input event on fileInput');
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));

    // NEW (March 2026): Robust Upload Validation Polling
    console.log('[Content] Waiting for image upload to reflect in UI...');
    let uploadConfirmed = false;
    for (let i = 0; i < 20; i++) { // Max 10s (500ms * 20)
        await new Promise(r => setTimeout(r, 500));
        const thumbnails = Array.from(document.querySelectorAll('img[src*="blob:"], img[src*="data:"], div[role="img"]')).filter(el => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null) return false;
            // Ensure it's in the compose/input area
            return el.closest('form') || el.closest('[role="textbox"]') || el.closest('.input-area');
        });

        if (thumbnails.length > 0) {
            console.log(`[Content] Image upload confirmed via UI thumbnail (${thumbnails.length} found).`);
            uploadConfirmed = true;
            break;
        }
    }

    if (!uploadConfirmed) {
        console.warn('[Content] Image upload thumbnail not detected after 10s. Proceeding with caution (fail-safe).');
        await new Promise(r => setTimeout(r, 1000)); // Final short grace period
    } else {
        await new Promise(r => setTimeout(r, 1000)); // stabilization
    }
}

// --- Helper: Find Grok Input Area ---
async function findGrokInputArea() {
    let timeoutMs = Number(state.config.timeout) || 120000;
    if (timeoutMs < 1000) timeoutMs *= 1000; // Convert seconds to ms if needed
    const retryDelay = 2000;
    const maxRetries = Math.ceil(timeoutMs / retryDelay);

    let inputArea = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        console.log(`Searching for input area (${attempt + 1}/${maxRetries})...`);

        // 1. Precise selectors (Updated for Feb 2026)
        inputArea = document.querySelector(SELECTORS.promptInput) ||
            document.querySelector('div[contenteditable="true"][role="textbox"]') ||
            document.querySelector('textarea[placeholder*="customize"]') ||
            document.querySelector('input[placeholder*="customize"]');

        if (inputArea) return inputArea;

        // 2. Loose selectors
        const candidates = Array.from(document.querySelectorAll('textarea, input[type="text"], div[contenteditable="true"], p[role="presentation"]'));
        const visibleCandidates = candidates.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        });

        // 2a. Strict Check
        inputArea = visibleCandidates.find(el => {
            const placeholder = (el.placeholder || el.getAttribute('aria-placeholder') || el.innerText || '').toLowerCase();
            return placeholder.includes('video') || placeholder.includes('vídeo') || placeholder.includes('customize') || placeholder.includes('prompt') || placeholder.includes('imagin');
        });

        if (inputArea) return inputArea;

        // 2b. Fallback
        if (visibleCandidates.length > 0) {
            inputArea = visibleCandidates.find(el => {
                const placeholder = (el.placeholder || el.getAttribute('aria-placeholder') || '').toLowerCase();
                return !placeholder.includes('search');
            });
        }

        if (inputArea) return inputArea;
        await new Promise(r => setTimeout(r, retryDelay));
    }
    return null;
}

async function sendPromptToGrok(text, options = {}) {
    // GLOBAL SEND LOCK: Prevent ANY duplicate send calls across all script instances.
    // Since window is shared across all content script VMs (old and new), this acts as a
    // process-wide mutex ensuring only ONE sendPromptToGrok runs at a time.
    const SEND_LOCK_KEY = '__grokSendLock';
    const SEND_LOCK_TIMEOUT = 120000; // 2 minutes max lock

    if (window[SEND_LOCK_KEY]) {
        const lockAge = Date.now() - window[SEND_LOCK_KEY];
        if (lockAge < SEND_LOCK_TIMEOUT) {
            console.warn(`[sendPromptToGrok] BLOCKED by global send lock (held for ${Math.round(lockAge / 1000)}s). Another instance is already sending. Aborting to prevent duplicate video.`);
            return; // Silently abort — another instance is handling it
        }
        // Lock expired — stale lock, take over
        console.warn(`[sendPromptToGrok] Stale send lock detected (${Math.round(lockAge / 1000)}s old). Taking over.`);
    }
    window[SEND_LOCK_KEY] = Date.now();
    console.log(`[sendPromptToGrok] Send lock acquired by gen ${typeof __myGeneration !== 'undefined' ? __myGeneration : '?'}`);

    // PRE-CHECK: Is Grok already generating? (Prevents double-generation)
    const allBtns = Array.from(document.querySelectorAll('button'));
    const progressBtn = allBtns.find(b => /^\d+%$/.test((b.innerText || '').trim()));
    const stopBtn = allBtns.find(b => {
        const lbl = (b.getAttribute('aria-label') || '').toLowerCase();
        const txt = (b.innerText || '').toLowerCase();
        return lbl.includes('stop') || lbl.includes('cancel') || txt.includes('stop') || txt.includes('cancel');
    });

    const isGenText = Array.from(document.querySelectorAll('h1, h2, h3, div, span, p')).some(el => {
        if (el.offsetParent === null) return false;
        const t = (el.innerText || '').toLowerCase();
        // Check for common generation indicators
        return (t === 'generating' || t === 'rendering' || t.startsWith('generating video') || t.includes('processing video'));
    });

    if (window.__grokLoopIsGenerating || progressBtn || stopBtn || isGenText) {
        console.log(`[sendPromptToGrok] Grok is already generating (Progress: ${!!progressBtn}, StopBtn: ${!!stopBtn}, Text: ${isGenText}). Skipping submission.`);
        delete window[SEND_LOCK_KEY];
        return;
    }

    window.__grokLoopIsGenerating = true; // Mark locally

    try {
        await new Promise(r => setTimeout(r, 1000)); // Reduced initial pause

        let inputArea = await findGrokInputArea();

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

        // NEW (March 2026): Robust prompt validation loop (Up to 3s)
        console.log('[Content] Validating prompt insertion...');
        const checkPrefix = text.substring(0, Math.min(20, text.length));
        let validated = false;
        for (let i = 0; i < 6; i++) {
            const currentText = inputArea.textContent || inputArea.value || '';
            if (currentText && currentText.includes(checkPrefix)) {
                validated = true;
                break;
            }
            console.log(`[Content] Validation attempt ${i + 1} failed. Retrying insertion...`);
            await insertTextFast(inputArea, text);
            await new Promise(r => setTimeout(r, 500));
        }

        if (!validated) {
            console.warn('[Content] Prompt validation failed after 3s. Proceeding with caution.');
        }

        // PRE-SUBMISSION: Final check right before we look for the button
        const finalInsertedText = inputArea.textContent || inputArea.value || '';
        console.log('[Content] Pre-submission check - Text in input:', finalInsertedText.substring(0, 60) + '...', 'Length:', finalInsertedText.length);

        // --- SUBMISSION LOGIC ---

        // OPTION A: STRICT MODE (Enter Key Only)
        if (state.config.strictMode) {
            console.log('STRICT MODE: Submitting via Enter Key ONLY...');
            await simulateEnterKey(inputArea);

            await new Promise(r => setTimeout(r, 1000));
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

        // OPTION B: LEGACY/DEFAULT - Button click (was working, keep it)
        console.log('Legacy Mode: Searching for Send button...');

        let sendBtn = null;
        // Scope button searches to the compose area, but fall back to document if the form doesn't
        // contain the send arrow SVG (which happens after video mode is activated).
        const candidateForm = document.querySelector('form');
        // Verify the form actually contains the send arrow before using it as scope
        const formContainsSendArrow = candidateForm &&
            (candidateForm.querySelector('svg path[d*="M6 11L12 5"]') ||
                candidateForm.querySelector('svg path[d*="M3 3"]') ||
                candidateForm.querySelector('button[aria-label="Send"]'));
        const composeArea = formContainsSendArrow ? candidateForm : document;

        console.log(`[SendBtn] composeArea = ${composeArea === document ? 'document' : 'form'}, formContainsSendArrow = ${!!formContainsSendArrow}`);

        for (let i = 0; i < 6; i++) {

            // EARLY EXIT: If Grok is already generating, the button was auto-clicked (e.g. by "Animate" click).
            // Skip looking for the send button — just let waitForVideoResponse pick it up.
            const progressBtn = Array.from(document.querySelectorAll('button')).find(b => /^\d+%$/.test((b.innerText || '').trim()));
            const isAlreadyGenerating = !!progressBtn || document.body.innerText.includes('Generating') || document.body.innerText.includes('Rendering');
            if (isAlreadyGenerating) {
                console.log(`[SendBtn] Grok is already generating (detected "${progressBtn ? progressBtn.innerText : 'Generating text'}"). Skipping send button — video will be caught by waitForVideoResponse.`);
                return;
            }

            // SVG/Labeled Button Search (Primary)

            if (!sendBtn) {
                // STRICT SVG-ONLY TARGETING FOR SUBMISSION ARROW
                const sendArrowPaths = [
                    'M6 11L12 5',
                    'M12 5L18 11',
                    'M12 5V19',
                    'M2.01 21L23 12',
                    'M3 20V14.5L14 12L3 9.5V4L22 12L3 20Z',
                    'M3 3 21 12 3 21'
                ];

                const pathSelectors = sendArrowPaths.map(p => `svg path[d*="${p}"]`).join(', ');
                const arrowPaths = Array.from(composeArea.querySelectorAll(pathSelectors));
                const sendLabeledBtns = Array.from(composeArea.querySelectorAll('button[aria-label="Send"], button[title="Send"], button[aria-label="Submit"]'));
                const potentialTargets = [...arrowPaths.map(p => p.closest('svg')), ...sendLabeledBtns];

                // Detailed log on first iteration
                if (i === 0) {
                    console.log(`[SendBtn] iter 0: arrowPaths found = ${arrowPaths.length}, sendLabeled = ${sendLabeledBtns.length}`);
                    // Dump all buttons visible on screen to help diagnose
                    const allBtns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
                    console.log(`[SendBtn] All visible buttons (${allBtns.length}):`,
                        allBtns.map(b => `[${b.getAttribute('aria-label') || b.title || b.type || '?'}] "${(b.innerText || '').trim().substring(0, 20)}"`).join(' | '));
                    // Dump all SVG paths near buttons
                    const allPaths = Array.from(document.querySelectorAll('button svg path')).slice(0, 10);
                    console.log(`[SendBtn] Sample SVG paths in buttons:`, allPaths.map(p => p.getAttribute('d')?.substring(0, 40)).join(' | '));
                }

                for (const target of potentialTargets) {
                    if (!target) continue;
                    const btn = target.closest('button[type="submit"]') || target.closest('button') || target.closest('div[role="button"]');
                    if (btn && !btn.disabled && composeArea.contains(btn)) {
                        const ariaLabel = btn.getAttribute('aria-label') || '';
                        if (ariaLabel.toLowerCase().trim() === 'edit') continue;
                        if (btn.getAttribute('role') === 'radio') continue; // Skip settings/radio buttons

                        const rawText = (btn.innerText || btn.textContent || ariaLabel || btn.title || '').toLowerCase();
                        const strippedText = rawText.replace(/\s+/g, '');
                        const isMakeVideoText = strippedText.includes('makevideo') || TRANSLATIONS.makeVideo.some(k => rawText.trim() === k);

                        if (isMakeVideoText) {
                            console.log(`[SendBtn] Rejected button (make video text): "${rawText.substring(0, 30)}"`);
                            continue;
                        } else {
                            sendBtn = btn;
                            console.log(`[SendBtn] Found via SVG path: "${btn.outerHTML.substring(0, 100)}"`);
                            break;
                        }
                    }
                }
            } // end SVG targeting

            if (!sendBtn) {
                // Generic Fallback
                const buttons = Array.from(composeArea.querySelectorAll('button, div[role="button"]'));
                for (const btn of buttons) {
                    if (btn.disabled || !composeArea.contains(btn)) continue;
                    if (btn.getAttribute('role') === 'radio') continue; // Skip settings/radio buttons

                    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
                    const rawText = (btn.innerText || btn.textContent || ariaLabel || btn.title || '').toLowerCase();
                    const strippedText = rawText.replace(/\s+/g, '');
                    const isMakeVideoText = strippedText.includes('makevideo') || TRANSLATIONS.makeVideo.some(k => rawText.trim() === k);
                    const isImagineModeText = TRANSLATIONS.imagineMode.some(k => k === 'video' ? rawText.trim() === k : rawText.includes(k));
                    if (isMakeVideoText || isImagineModeText || ariaLabel === 'edit' || ariaLabel === 'edit image') continue;

                    const isExtendButton = (txt => (txt.includes('+6s') || txt.includes('+10s')) && !txt.includes('exit'))(strippedText);

                    if (btn.type === 'submit' || ariaLabel.includes('send') || ariaLabel.includes('submit') || isExtendButton) {
                        sendBtn = btn;
                        console.log(`[SendBtn] Found via generic fallback: ariaLabel="${ariaLabel}" text="${rawText.substring(0, 30)}"`);
                        break;
                    }
                }
            }

            if (sendBtn && !sendBtn.disabled) {
                // LAST SECOND CHECK: Is Grok already generating?
                const allBtns = Array.from(document.querySelectorAll('button'));
                const isNowGen = allBtns.some(b => /^\d+%$/.test((b.innerText || '').trim())) ||
                    allBtns.some(b => {
                        const lbl = (b.getAttribute('aria-label') || '').toLowerCase();
                        return lbl.includes('stop') || lbl.includes('cancel');
                    });

                if (isNowGen) {
                    console.log('[sendPromptToGrok] Generation started at last second. Aborting manual click.');
                    window.__grokLoopIsGenerating = true;
                    return;
                }

                if (window.__grokLoopLastClick && (Date.now() - window.__grokLoopLastClick < 5000)) {
                    console.warn('Click lock active: Prevented duplicate send button click.');
                    return;
                }
                window.__grokLoopLastClick = Date.now();
                console.log('Found enabled Send button. Clicking...', sendBtn.tagName, sendBtn.getAttribute('aria-label') || (sendBtn.innerText || '').trim().substring(0, 30));
                console.log('--- DEBUG LOG --- Kliking sendBtn:', sendBtn.outerHTML.substring(0, 300));
                sendBtn.focus();
                sendBtn.click();
                console.log('Click dispatched.');

                // SMART ENTER FALLBACK (March 2026)
                // If clicking the button didn't start generation within 2.5s, try pressing Enter.
                await new Promise(r => setTimeout(r, 2500));
                const stillNotGen = !window.__grokLoopIsGenerating && !Array.from(document.querySelectorAll('button')).some(b => /^\d+%$/.test((b.innerText || '').trim()));
                if (stillNotGen) {
                    console.warn('[sendPromptToGrok] Click did not trigger generation after 2.5s. Firing Smart Enter fallback...');
                    await simulateEnterKey(inputArea);
                }
                return;
            }

            if (i % 2 === 0) console.log(`[SendBtn] Still searching... iteration ${i}/6. sendBtn = ${!!sendBtn}`);
            await new Promise(r => setTimeout(r, 500));
        } // end retry loop

        console.warn('Button not found after 3 seconds. Assuming prompt was sent via other means or UI is stuck.');
        console.warn('[SendBtn] Fallback: Simulating Enter key press since Send button was not found.');
        await simulateEnterKey(inputArea);

    } finally {
        // Release the global send lock so the next segment can send
        delete window[SEND_LOCK_KEY];
        console.log('[sendPromptToGrok] Send lock released.');
    }
}
async function clearInputAttachments() {
    // Look for "Remove" buttons (X) strictly associated with cached thumbnails
    // Strategy: Find thumbnails first, then find their adjacent 'Remove' button.
    const cachedThumbnails = Array.from(document.querySelectorAll('img[alt*="image"], img[alt*="Up"], div[role="img"]')).filter(img => {
        // Filter to likely attachment thumbnails (usually small, in input area)
        // CRITICAL FIX: Only accept Blob/Data URLs (Uploaded images). Ignore static UI icons (https://...)
        if (img.tagName === 'IMG') {
            const src = (img.src || '').toLowerCase();
            if (!src.startsWith('blob:') && !src.startsWith('data:')) {
                return false;
            }
        } else if (img.tagName === 'DIV' && img.getAttribute('role') === 'img') {
            // Strict check for DIV thumbnails: Must NOT be an avatar/user icon
            const label = (img.ariaLabel || '').toLowerCase();
            if (label.includes('user') || label.includes('profile') || label.includes('avatar') || label.includes('grok')) {
                return false;
            }
        }

        return img.closest('div[role="group"]') || img.closest('.input-area') || (img.width < 150 && img.closest('form'));
    });

    console.log(`[Attachment Debug] Found ${cachedThumbnails.length} valid cached thumbnails.`);

    const removeBtns = [];

    cachedThumbnails.forEach(thumb => {
        // Look for sibling button or parent's sibling
        const container = thumb.closest('div[role="group"]') || thumb.parentElement;
        if (container) {
            const possibleBtns = container.querySelectorAll('button');
            possibleBtns.forEach(b => {
                const label = (b.ariaLabel || b.title || '').toLowerCase();

                // Strict filters to avoid clicking X buttons for modals/sidebars
                // Skip if button is not truly part of the attachment thumbnail
                if (b.closest('nav') || b.closest('aside') || b.closest('[role="navigation"]')) {
                    return; // Skip navigation elements
                }

                // Check if label matches a remove keyword
                const isRemoveBtn = TRANSLATIONS.remove.some(k => label.includes(k));

                // Additional safety: "close" alone is too generic
                // Must match more specific keywords like "remove", "delete", "eliminate", etc.
                // OR be near the actual thumbnail element

                // We check if it matches ANY generic "close" term across languages
                const genericCloseTerms = ['close', 'cerrar', 'fermer', 'schließen', 'chiudi', 'zamknij', 'zavřít', 'fechar'];
                const isGenericCloseLabel = genericCloseTerms.some(term => label.trim() === term);
                const hasCloseKeyword = genericCloseTerms.some(term => label.includes(term));

                if (isRemoveBtn && !isGenericCloseLabel) {
                    // If it says "close" but also has other keywords, it's likely an attachment close button
                    removeBtns.push(b);
                } else if (!hasCloseKeyword && isRemoveBtn) {
                    // If it matches remove/delete without the ambiguous "close", it's safe
                    removeBtns.push(b);
                }
                // Skip if label is just "close" - too risky
            });
        }
    });

    // Filter duplicates
    const uniqueBtns = [...new Set(removeBtns)];

    if (uniqueBtns.length > 0) {
        console.log(`Found ${uniqueBtns.length} cached attachments to clear. Removing...`);
        for (let btn of uniqueBtns) {
            // Double check it's not the main upload button
            const label = (btn.ariaLabel || btn.title || '').toLowerCase();
            if (TRANSLATIONS.upload.some(k => label.includes(k))) continue;

            // Final safety check: verify button is still in DOM and visible
            if (!document.contains(btn) || btn.offsetParent === null) continue;

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
        let timeoutMs = state.config && state.config.timeout ? Number(state.config.timeout) : 120000;
        if (timeoutMs < 1000) timeoutMs *= 1000; // Convert seconds to ms if needed

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
                    const src = v.src.toLowerCase();
                    if (src.startsWith('blob:') || src.includes('video.twimg.com') || src.includes('grok.com') || src.includes('x.ai') || src.includes('grokusercontent')) {
                        console.log('New video detected:', v.src);
                        window.__grokLoopIsGenerating = false; // Clear generation flag
                        cleanup();
                        await new Promise(r => setTimeout(r, 2000));
                        resolve(v.src);
                        return;
                    }
                }
            }

            // Check for Content Moderation / Rate Limit via BROAD Text Scan
            // (More robust than finding specific elements which might change classes)
            const bodyText = document.body.innerText.toLowerCase();

            // Multi-Language Rate Limit Check
            if (TRANSLATIONS.rateLimit.some(k => bodyText.includes(k))) {
                console.warn('Rate Limit Detected (Text Scan)!');
                cleanup();
                reject(new Error('Rate Limit Reached'));
                return;
            }

            // Multi-Language Moderation Check (TEXT-BASED)
            if (TRANSLATIONS.moderation.some(k => bodyText.includes(k))) {
                // Verify it's not just in the prompt textarea
                // Find the element containing this text to be sure it's an alert/toast
                const hints = Array.from(document.querySelectorAll('div, span, p')).filter(el =>
                    el.innerText && TRANSLATIONS.moderation.some(k => el.innerText.toLowerCase().includes(k)) && el.offsetParent !== null
                );

                // If we found a visible element with this text, likely the toast
                if (hints.length > 0) {
                    console.warn('Content Moderation Detected (Text Scan)!');
                    cleanup();
                    reject(new Error('Content Moderated'));
                    return;
                }
            }

            // NEW (March 2026): Visual Moderation Detection
            // Check for blurred/thumbnail placeholders that indicate moderated content
            const allImages = Array.from(document.querySelectorAll('img'));
            const blurredImages = allImages.filter(img => {
                if (img.offsetParent === null) return false; // Skip invisible
                const style = window.getComputedStyle(img);
                // Check for blur filter (common moderation technique)
                const hasBlur = style.filter && (style.filter.includes('blur') || style.blur);
                // Check for low opacity (another moderation technique)
                const hasLowOpacity = parseFloat(style.opacity) < 0.5;
                // Check for placeholder patterns in src
                const isPlaceholder = img.src && (img.src.includes('placeholder') || img.src.includes('blur') || img.src.includes('moderate'));
                return hasBlur || hasLowOpacity || isPlaceholder;
            });

            // If we see multiple blurred images in the generation area, likely moderated
            if (blurredImages.length >= 3) {
                console.warn(`Visual Moderation Detected: ${blurredImages.length} blurred images found`);
                cleanup();
                reject(new Error('Content Moderated (Visual)'));
                return;
            }

            // NEW: Check for "Regenerate" / "Redo video" buttons that appear after moderation
            // CRITICAL FIX: Only trigger moderation if NO content exists
            const hasAnyVideo = document.querySelectorAll('video').length > 0;
            const hasCompletedImage = document.querySelectorAll('img[src*="blob:"], img[src*="grok"], img[src*="imagine"]').length > 0;
            const hasAnyContent = hasAnyVideo || hasCompletedImage;

            // If content exists, regenerate button is NORMAL (user can regenerate if they don't like it)
            if (hasAnyContent) {
                // Do NOT trigger moderation - regenerate button is expected when content exists
                // (Removed spammy log that was firing every poll interval)
            } else {
                // No content + regenerate button = likely moderation
                const regenerateBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => {
                    if (b.closest('nav') || b.closest('[role="navigation"]') || b.closest('aside')) return false;
                    if (b.offsetParent === null) return false;
                    const text = (b.innerText || b.ariaLabel || b.title || '').toLowerCase();
                    // Look for regenerate/redo buttons that appear AFTER failed generation
                    return TRANSLATIONS.regenerate.some(k => text.includes(k) && text.length < 30);
                });

                if (regenerateBtn) {
                    console.warn('Regenerate button found WITHOUT content - likely moderation');
                    cleanup();
                    reject(new Error('Content Moderated (Regenerate Button)'));
                    return;
                }
            }

            // Check for "Broken Eye" Generation Failure icon
            // The broken eye icon usually indicates a silent generation failure or error states
            const svgs = Array.from(document.querySelectorAll('svg'));
            const hasBrokenEye = svgs.some(svg => {
                // Ignore small UI buttons (like an 'X' or cancel) which might accidentally match the path heuristic
                const rect = svg.getBoundingClientRect();
                if (rect.width < 40 || rect.height < 40) return false;

                // Check if the SVG or its paths contain attributes typical of the slashed eye icon
                // We look for 'd' paths that represent a slash (often long diagonal coordinates)
                const paths = Array.from(svg.querySelectorAll('path')).map(p => p.getAttribute('d') || '');

                // The slashed eye icon typically has a path for the slash: e.g. M3 3l18 18 or similar diagonal
                // and paths for the eye. We check for a general heuristic:
                const hasSlashPath = paths.some(d => d.includes('M2 2l20 20') || d.includes('m2 2 20 20') || d.includes('M3 3l18 18') || d.includes('m3 3 18 18') || d.includes('L22 22') || d.includes('l18 18'));
                const isPotentiallyEye = paths.some(d => d.includes('A') || d.includes('a') || d.includes('c') || d.includes('C')); // Curves for the eye

                return hasSlashPath && isPotentiallyEye && svg.offsetParent !== null;
            });

            if (hasBrokenEye) {
                console.warn('Generation Failure Detected (Broken Eye Icon)!');
                cleanup();
                reject(new Error('Generation Failed (Broken UI Icon)'));
                return;
            }
        };

        const observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
        const poller = setInterval(check, 4000); // Reduced from 1000ms to 4000ms to reduce CPU usage and log spam
        const failTimer = setTimeout(() => {
            cleanup();
            console.error('Timeout waiting for video. Current videos:', Array.from(document.querySelectorAll('video')).map(v => v.src));
            reject(new Error('Timeout waiting for video generation'));
        }, timeoutMs);
    });
}

async function handleABTest() {
    // Wait briefly for UI to potentially show A/B test (Skip button)
    await new Promise(r => setTimeout(r, 2000));

    const findSkipBtn = () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => {
            const text = (b.innerText || b.ariaLabel || '').toLowerCase();
            return TRANSLATIONS.skip.some(k => text.includes(k)) && !b.disabled;
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
    if (isStaleInstance()) return null;

    const EXTRACTION_LOCK_KEY = '__grokLoopExtractionLock';
    const EXTRACTION_LOCK_TIMEOUT = 60000; // 1 minute

    if (window[EXTRACTION_LOCK_KEY]) {
        const age = Date.now() - window[EXTRACTION_LOCK_KEY];
        if (age < EXTRACTION_LOCK_TIMEOUT) {
            console.warn('[extractLastFrame] Extraction is already in progress. Aborting to prevent memory overhead.');
            return null;
        }
    }
    window[EXTRACTION_LOCK_KEY] = Date.now();

    let objectUrl = null;
    let video = null;

    try {
        console.log('Fetching video data via background script to bypass CORS...');
        let dataUrl = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'FETCH_VIDEO_AS_DATA_URL',
                payload: { url: videoUrl }
            }, (response) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                if (response && response.success) resolve(response.dataUrl);
                else reject(new Error(response?.error || 'Unknown background fetch error'));
            });
        });

        if (isStaleInstance()) return null;

        const blob = dataURItoBlob(dataUrl);
        dataUrl = null; // Clear large string ASAP

        objectUrl = URL.createObjectURL(blob);
        video = document.createElement('video');
        video.muted = true;
        video.autoplay = false;

        return await new Promise((resolve, reject) => {
            let timer = setTimeout(() => {
                cleanup();
                reject(new Error('Extraction timed out (15s)'));
            }, 15000);

            const cleanup = () => {
                clearTimeout(timer);
                if (video) {
                    video.onloadedmetadata = null;
                    video.oncanplaythrough = null;
                    video.onseeked = null;
                    video.onerror = null;
                    video.remove();
                    video = null;
                }
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    objectUrl = null;
                }
            };

            video.oncanplaythrough = async () => {
                video.oncanplaythrough = null; // FIRE ONCE ONLY
                if (isStaleInstance()) { cleanup(); reject(new Error('Stale Instance')); return; }

                try {
                    const duration = video.duration;
                    if (!duration || isNaN(duration)) {
                        cleanup();
                        reject(new Error('Invalid video duration during extraction'));
                        return;
                    }

                    const time = Math.max(0, duration - 0.1);
                    console.log(`[extractLastFrame] Duration: ${duration.toFixed(2)}s, Seeking to: ${time.toFixed(2)}s`);
                    video.currentTime = time;

                    await new Promise(r => video.onseeked = r);
                    await new Promise(r => setTimeout(r, 500)); // Settle time

                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);

                    if (canvas.width === 0 || canvas.height === 0) {
                        cleanup();
                        reject(new Error(`Invalid canvas dimensions: ${canvas.width}x${canvas.height}`));
                        return;
                    }

                    canvas.toBlob(b => {
                        cleanup();
                        if (!b) {
                            reject(new Error('Canvas extraction returned null blob'));
                        } else {
                            console.log(`[extractLastFrame] Success: ${Math.round(b.size / 1024)}KB blob extracted.`);
                            resolve(b);
                        }
                    }, 'image/jpeg', 0.95);

                } catch (e) {
                    cleanup();
                    reject(e);
                }
            };

            video.onerror = (e) => {
                cleanup();
                reject(new Error('Video failed to load for extraction'));
            };

            video.src = objectUrl;
            video.load();
        });

    } catch (err) {
        console.error('[extractLastFrame] Global failure:', err);
        throw err;
    } finally {
        delete window[EXTRACTION_LOCK_KEY];
        console.log('[extractLastFrame] Extraction lock released.');
    }
}

/**
 * Shared helper to find the "More options" (...) button near a video or in a card.
 * Uses text, aria-labels, and SVG path heuristics to be ultra-reliable.
 */
window.findMoreButton = async function (scope = document) {
    const buttons = Array.from(scope.querySelectorAll('button, [role="button"]'));
    console.log(`[findMoreButton] Searching ${buttons.length} buttons in scope...`);

    const matches = buttons.filter(b => {
        if (b.closest('.grok-loop-dashboard') || b.closest('nav') || b.closest('aside') || b.closest('[class*="history" i]')) return false;
        if (b.closest('form') || b.closest('[role="textbox"]') || b.closest('[class*="composer" i]') || b.closest('.group\\/composer') || (b.title || '').includes('aspect')) return false;
        if (b.offsetParent === null) return false;

        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        const title = (b.title || '').toLowerCase();
        const text = (b.innerText || b.textContent || '').trim().toLowerCase();

        const playerControlLabels = ['play', 'pause', 'mute', 'unmute', 'volume', 'fullscreen', 'captions', 'subtitles', 'settings', 'picture-in-picture', 'pip', 'speed'];
        if (/^\d+:\d+/.test(text) || playerControlLabels.some(k => text.includes(k))) return false;

        if (TRANSLATIONS.more.some(k => aria.includes(k) || title.includes(k)) || text === '...' || text === '…') return true;

        const svgs = b.querySelectorAll('svg');
        for (let svg of svgs) {
            const svgTitle = (svg.querySelector('title')?.textContent || '').toLowerCase();
            if (TRANSLATIONS.more.some(k => svgTitle.includes(k))) return true;
            if (svg.querySelector('circle') && svg.querySelectorAll('circle').length === 3) return true;

            const paths = Array.from(svg.querySelectorAll('path'));
            if (paths.some(p => {
                const d = p.getAttribute('d') || '';
                // Horizontal dots path heuristic (Radix / X)
                if (d.includes('M5 ') && d.includes('M12 ') && d.includes('M19 ')) return true;
                // Vertical dots path heuristic
                if (d.includes('M12 5') && d.includes('M12 12') && d.includes('M12 19')) return true;
                return false;
            })) return true;
        }
        return false;
    });

    if (matches.length > 0) {
        // Return the one closest to the bottom (the most recent/last generated usually)
        return matches[matches.length - 1];
    } else {
        console.warn(`[findMoreButton] No matches found. Buttons in scope (${buttons.length}):`, buttons.map(b => (b.ariaLabel || b.title || b.innerText || 'no-label').substring(0, 30)));
    }
    return null;
};

/**
 * Shared helper to find a specific menu item in an expanded popup.
 */
window.findMenuItemInPopups = function (translationKeys, literals = []) {
    console.log(`[findMenuItemInPopups] Deep searching: ${literals.join(', ')}`);

    const searchLiterals = literals.map(l => l.toLowerCase());
    const searchKeys = translationKeys.map(k => k.toLowerCase().replace(/\s+/g, ''));

    const matchElement = (item) => {
        const rawText = (item.innerText || item.textContent || '').trim().toLowerCase();
        const ariaLabel = (item.getAttribute('aria-label') || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        if (rawText.length > 70) return false;

        // CRITICAL: Blacklist subscription/upsell keywords to avoid clicking "Upgrade to SuperGrok" etc.
        const blacklist = ['supergrok', 'plan', 'subscription', 'subscribe', '套餐', '方案', '订阅', '升级到', 'upgrade to', 'premium'];
        if (blacklist.some(b => rawText.includes(b) || ariaLabel.includes(b))) return false;

        const strippedText = rawText.replace(/\s+/g, '');
        if (searchLiterals.some(l => rawText.includes(l) || ariaLabel.includes(l) || title.includes(l))) return true;
        if (searchKeys.some(k => strippedText.includes(k) || ariaLabel.includes(k) || title.includes(k))) return true;
        return false;
    };

    // Stage 1: RADICAL SHADOW SEARCH
    // Search everything (including inside shadow roots) for the matching text
    const allCandidates = window.queryAllAcrossShadows('button, [role="menuitem"], [role="option"], li, a, div, span, p').filter(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || el.closest?.('.grok-loop-dashboard')) return false;
        return matchElement(el);
    });

    if (allCandidates.length > 0) {
        // We have many candidates. We must pick the LEAF node to avoid clicking the whole menu.
        // Also prioritize based on roles and z-index.
        const leafNodes = allCandidates.filter(parent => {
            // A node is a leaf in our search if NONE of its descendants are in the candidate list
            return !allCandidates.some(child => child !== parent && parent.contains(child));
        });

        const targets = leafNodes.length > 0 ? leafNodes : allCandidates;

        const scored = targets.map(el => {
            const style = window.getComputedStyle(el);
            const z = parseInt(style.zIndex, 10) || 0;
            let score = 0;
            if (z > 0) score += 1000 + z;
            if (style.position === 'absolute' || style.position === 'fixed') score += 500;

            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            const text = (el.innerText || '').toLowerCase();

            // Strong match on common button tags
            if (['BUTTON', 'A', 'LI'].includes(el.tagName)) score += 200;
            if (el.getAttribute('role')?.includes('menu')) score += 300;

            // Highly value "Short" matches (likely the button text itself)
            if (text.length < 25) score += 200;

            // Penalize very broad divs
            if (el.tagName === 'DIV' && text.length > 40) score -= 500;

            return { el, score };
        });

        const winner = scored.sort((a, b) => b.score - a.score)[0].el;
        console.log(`[findMenuItemInPopups] Leaf node match: "${winner.innerText.trim()}" (Score: ${scored.find(s => s.el === winner).score})`);
        return winner;
    }

    console.warn('[findMenuItemInPopups] ❌ No deep matches found. Sample text:');
    const pageText = document.body.innerText.substring(0, 500).replace(/\s+/g, ' ');
    console.log(`[DEBUG-TEXT] ${pageText}`);
    return null;
};

/**
 * Surface Scan helper to dump all visible text/buttons to the console for debugging.
 */
window.getSurfaceDump = function (scope = document) {
    const selector = 'button, [role="button"], a[role="button"], div, span, p';
    const all = (scope === document) ? window.queryAllAcrossShadows(selector) : Array.from(scope.querySelectorAll(selector));

    const btns = all.filter(el => ['BUTTON', 'A'].includes(el.tagName) || el.getAttribute('role') === 'button')
        .filter(b => b.offsetHeight > 0 || b.offsetWidth > 0 || b.offsetParent !== null)
        .map(b => {
            const label = (b.getAttribute('aria-label') || b.title || b.innerText || '').trim();
            const classes = b.className.substring(0, 50);
            return `[${label}] class: ${classes}`;
        });

    const textElements = all.filter(el => {
        const style = window.getComputedStyle(el);
        return el.children.length === 0 && (el.innerText || '').trim().length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    })
        .map(el => (el.innerText || '').trim().substring(0, 100))
        .filter(t => t.length > 2);

    console.log(`=== SURFACE SCAN (${new Date().toLocaleTimeString()}) ===`);
    console.log(`Visible Buttons (${btns.length}):\n${btns.join('\n')}`);
    console.log(`All Visible Text Snippets:\n${[...new Set(textElements)].join(' | ')}`);
    console.log('====================================');
};

// Shared helper to detect if a Grok dropdown menu is currently visible.
window.isMenuOpen = function () {
    // Look for common Grok popup containers with high z-index or menu roles
    const menus = Array.from(document.querySelectorAll('[role="menu"], [role="listbox"], [data-radix-popper-content-wrapper], [data-state="open"]'))
        .filter(el => {
            const style = window.getComputedStyle(el);
            const z = parseInt(style.zIndex, 10);
            return (z > 50 || el.getAttribute('role') === 'menu') && el.offsetHeight > 0 && !el.closest('.grok-loop-dashboard');
        });
    return menus.length > 0;
};

// Shared helper to aggressively close any open Grok menus/popups.
window.forceClosePopups = async function () {
    if (!window.isMenuOpen()) return;
    console.log('[UI] Forcing close of open menus...');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 600));
};

// NEW (March 2026): Robustly find and click the "Exit Extend Mode" button.
window.exitExtendModeUI = async function () {
    console.log('[UI] Attempting to find and click Exit Extend or Post button...');
    const composeArea = document.querySelector('form') || document.querySelector('[role="main"]') || document.body;

    // 1. Search by common labels (Prioritize Compose/Post as definitive reset)
    const exitLabels = ['compose post', 'post', 'exit', 'cancel', 'dismiss', 'close', 'remove', 'x'];
    const buttons = Array.from(composeArea.querySelectorAll('button'));

    let targetBtn = buttons.find(b => {
        const lbl = (b.getAttribute('aria-label') || b.title || b.innerText || '').toLowerCase();
        // Priority to "Post" or "Compose Post"
        return (lbl.includes('post') || lbl.includes('compose')) && lbl.length < 25;
    });

    if (!targetBtn) {
        targetBtn = buttons.find(b => {
            const lbl = (b.getAttribute('aria-label') || b.title || b.innerText || '').toLowerCase();
            return exitLabels.some(word => lbl.includes(word)) && (lbl.includes('extend') || lbl.length < 10);
        });
    }

    // 2. Search by SVG "X" pattern
    if (!targetBtn) {
        targetBtn = buttons.find(b => {
            const paths = Array.from(b.querySelectorAll('path')).map(p => p.getAttribute('d') || '');
            return paths.some(d => d.includes('M18 6L6 18') || d.includes('M6 6l12 12') || d.includes('M4 4l16 16') || d.includes('m15.5 15.5-11-11'));
        });
    }

    if (targetBtn) {
        console.log('[UI] Found Exit/Close button. Clicking...', targetBtn.getAttribute('aria-label') || 'SVG X');
        targetBtn.click();
        await new Promise(r => setTimeout(r, 1500));
        return true;
    }

    console.warn('[UI] Could not find explicit Exit button. Trying Escape key fallback.');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 1000));
    return false;
};
