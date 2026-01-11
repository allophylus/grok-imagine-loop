document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const promptInput = document.getElementById('prompt');
    const loopsInput = document.getElementById('loops');
    const timeoutInput = document.getElementById('timeout');
    const fileInput = document.getElementById('initialImage');
    const statusDiv = document.getElementById('status');

    // Auto-populate loops based on lines
    promptInput.addEventListener('input', () => {
        const lines = promptInput.value.split('\n').filter(p => p.trim() !== '').length;
        if (lines > 0) {
            loopsInput.value = lines;
        }
    });

    // --- Helper Functions ---

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function sendMessageWithRetry(tabId, message, attempt = 1) {
        console.log(`[Popup] Attempt ${attempt}: Sending message to tab ${tabId}`, message);
        statusDiv.innerText = `Attempt ${attempt}: Connecting...`;

        try {
            const response = await chrome.tabs.sendMessage(tabId, message).catch(err => {
                if (chrome.runtime.lastError) throw chrome.runtime.lastError;
                throw err;
            });

            console.log('[Popup] Success response:', response);
            statusDiv.innerText = 'Process started! Check the page.';

        } catch (error) {
            console.warn(`[Popup] Attempt ${attempt} failed:`, error);
            const errorMsg = error.message || "Unknown error";

            if (errorMsg.includes("Receiving end does not exist")) {
                if (attempt === 1) {
                    statusDiv.innerText = 'Injecting script...';

                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ['content/content.js']
                        });

                        await chrome.scripting.insertCSS({
                            target: { tabId: tabId },
                            files: ['content/styles.css']
                        });

                        console.log('[Popup] Injection successful. Retrying message...');
                        statusDiv.innerText = 'Script injected. Retrying...';

                        // Wait for script to initialize
                        await new Promise(r => setTimeout(r, 1000));

                        // Retry
                        await sendMessageWithRetry(tabId, message, 2);

                    } catch (injectionError) {
                        console.error('[Popup] Injection failed:', injectionError);
                        statusDiv.innerText = 'Injection failed: ' + injectionError.message;
                    }
                    return;
                }
            }
            statusDiv.innerText = 'Error: ' + errorMsg;
        }
    }

    // --- Resume Logic ---

    chrome.storage.local.get(['grokLoopState'], (result) => {
        if (result.grokLoopState) {
            resumeBtn.style.display = 'block';
            resumeBtn.innerText = `Resume (Segment ${result.grokLoopState.currentSegmentIndex + 1})`;

            resumeBtn.onclick = async () => {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) return;

                await sendMessageWithRetry(tab.id, {
                    action: 'RESTORE_LOOP',
                    payload: result.grokLoopState
                });
            };
        }
    });

    // --- Start Button Logic ---

    startBtn.addEventListener('click', async () => {
        const promptSequence = promptInput.value.split('\n').filter(p => p.trim() !== '');
        const loops = parseInt(loopsInput.value, 10);
        const timeout = parseInt(timeoutInput.value, 10) || 30;

        if (promptSequence.length === 0) {
            statusDiv.innerText = 'Error: Please enter at least one prompt.';
            return;
        }

        let initialImageData = null;
        if (fileInput.files.length > 0) {
            initialImageData = await readFileAsDataURL(fileInput.files[0]);
        }

        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            statusDiv.innerText = 'Error: No active tab found.';
            return;
        }

        // URL Checks
        const url = tab.url || '';
        const isSupported = url.includes('x.com') || url.includes('twitter.com') || url.includes('grok.com');
        const isConfig = url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:');

        if (isConfig || !isSupported) {
            statusDiv.innerText = 'You are not on Grok. Click below to launch it.';
            startBtn.innerText = 'Go to grok.com';
            startBtn.onclick = () => {
                chrome.tabs.update(tab.id, { url: 'https://grok.com' });
                window.close();
            };
            return;
        }

        // Send 'START_LOOP'
        await sendMessageWithRetry(tab.id, {
            action: 'START_LOOP',
            payload: {
                prompts: promptSequence,
                loops: loops,
                initialImage: initialImageData,
                timeout: timeout
            }
        });
    });

    // About / Ko-Fi Link
    document.getElementById('kofiBtn').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://ko-fi.com/mrdom78' });
    });
});
