window.LoopManager = {
    dashboard: null,

    init() {
        this.dashboard = new Dashboard();
        console.log('LoopManager initialized dashboard');
    },

    async start(payload) {
        console.log('LoopManager starting...', payload);
        if (state.isRunning) return;

        // Fetch images from storage since they are no longer in payload due to 64MiB limit
        let storedScenes = [];
        let storedGlobalImageUrl = null;
        try {
            const result = await chrome.storage.local.get(['grokLoopScenes', 'grokLoopImage']);
            storedScenes = result.grokLoopScenes || [];
            if (result.grokLoopImage) {
                storedGlobalImageUrl = typeof result.grokLoopImage === 'string'
                    ? result.grokLoopImage
                    : result.grokLoopImage.dataUrl;
            }
        } catch (err) {
            console.error('Error fetching images from storage', err);
        }

        state.config = {
            ...state.config,
            timeout: (Number(payload.timeout) || 30) * 1000,
            maxDelay: payload.maxDelay || 15,
            upscale: payload.upscale,
            autoDownload: payload.autoDownload,
            autoSkip: payload.autoSkip,
            reuseInitialImage: payload.reuseInitialImage,
            pauseOnModeration: payload.pauseOnModeration,
            showDebugLogs: payload.showDebugLogs !== undefined ? payload.showDebugLogs : state.config.showDebugLogs,
            showDashboard: payload.showDashboard !== undefined ? payload.showDashboard : state.config.showDashboard,
            moderationRetryLimit: payload.moderationRetryLimit || 2,
            filenamePrefix: payload.filenamePrefix || '',
            globalPrompt: payload.globalPrompt || '',
            useExtend: payload.useExtend || false,
            maxExtendSegments: (payload.maxExtendSegments !== undefined) ? payload.maxExtendSegments : 5,
            duration: payload.duration || '6s',
            resolution: payload.resolution || '480p',
            initialImage: payload.hasInitialImage && storedGlobalImageUrl ? dataURItoBlob(storedGlobalImageUrl) : (payload.initialImage ? dataURItoBlob(payload.initialImage) : null)
        };

        state.segments = payload.scenes ? payload.scenes.map((s, i) => {
            let imgDataUrl = s.inputImage || null;
            if (s.hasImage && !imgDataUrl && storedScenes[i] && storedScenes[i].image) {
                imgDataUrl = storedScenes[i].image.dataUrl;
            }
            return {
                id: i,
                prompt: s.prompt,
                inputImage: imgDataUrl ? dataURItoBlob(imgDataUrl) : null,
                videoUrl: null,
                appliedPrompt: null,
                status: 'pending'
            };
        }) : payload.prompts.map((p, i) => ({
            id: i,
            prompt: p,
            inputImage: null,
            videoUrl: null,
            appliedPrompt: null,
            status: 'pending'
        }));

        if (!state.config.reuseInitialImage && state.config.initialImage && !state.segments[0].inputImage) {
            state.segments[0].inputImage = state.config.initialImage;
        }

        chrome.storage.local.remove('grokLoopExtractedFrames');

        state.isRunning = true;
        state.currentSegmentIndex = 0;
        this.dashboard.update();

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

    async togglePause(shouldResume, resumePayload) {
        if (shouldResume === undefined) shouldResume = !state.isRunning;
        state.isRunning = shouldResume;

        if (shouldResume) {
            console.log('Resuming loop...');
            if (resumePayload) {
                if (resumePayload.globalPrompt !== undefined) state.config.globalPrompt = resumePayload.globalPrompt;
                if (resumePayload.useExtend !== undefined) state.config.useExtend = resumePayload.useExtend;
                if (resumePayload.maxExtendSegments !== undefined) state.config.maxExtendSegments = resumePayload.maxExtendSegments;
                if (resumePayload.timeout !== undefined) {
                    let t = Number(resumePayload.timeout);
                    if (t < 1000) t *= 1000;
                    state.config.timeout = t;
                }
                if (resumePayload.duration !== undefined) state.config.duration = resumePayload.duration;
                if (resumePayload.resolution !== undefined) state.config.resolution = resumePayload.resolution;
            }

            if (!state.config.initialImage) {
                try {
                    const imgResult = await chrome.storage.local.get(['grokLoopImage']);
                    if (imgResult.grokLoopImage) {
                        const imgUrl = typeof imgResult.grokLoopImage === 'string' ? imgResult.grokLoopImage : imgResult.grokLoopImage.dataUrl;
                        if (imgUrl) state.config.initialImage = dataURItoBlob(imgUrl);
                    }
                } catch (err) { }
            }

            if (resumePayload && resumePayload.scenes) {
                let storedScenes = [];
                try {
                    const result = await chrome.storage.local.get(['grokLoopScenes']);
                    storedScenes = result.grokLoopScenes || [];
                } catch (err) { }

                resumePayload.scenes.forEach((updatedScene, i) => {
                    let imgDataUrl = null;
                    if (updatedScene.hasImage && storedScenes[i] && storedScenes[i].image) imgDataUrl = storedScenes[i].image.dataUrl;
                    else if (updatedScene.inputImage) imgDataUrl = updatedScene.inputImage;

                    if (i < state.segments.length) {
                        if (i >= state.currentSegmentIndex) {
                            state.segments[i].prompt = updatedScene.prompt;
                            if (updatedScene.inputImage) state.segments[i].inputImage = dataURItoBlob(imgDataUrl);
                        }
                    } else {
                        state.segments.push({
                            id: i, prompt: updatedScene.prompt,
                            inputImage: imgDataUrl ? dataURItoBlob(imgDataUrl) : null,
                            videoUrl: null, appliedPrompt: null, status: 'pending'
                        });
                    }
                });

                if (state.currentSegmentIndex === -1 || (state.currentSegmentIndex >= state.segments.length - 1 && ['done', 'error'].some(s => state.segments[state.segments.length - 1].status.includes(s)))) {
                    let connectionPoint = state.segments.findIndex(s => s.status === 'pending');
                    if (connectionPoint === -1) connectionPoint = state.segments.findIndex(s => s.status.includes('error'));
                    if (connectionPoint === -1) connectionPoint = 0;
                    state.currentSegmentIndex = connectionPoint;
                }
            }
            this.dashboard.update();
            this.processQueue();
        } else {
            console.log('Pausing loop...');
            this.dashboard.update();
        }
    },

    async waitForVideoInputState() {
        console.log('Waiting for image upload to process...');
        for (let i = 0; i < 80; i++) {
            const inputs = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"], p[data-placeholder]'));
            const foundPlaceholder = inputs.some(el => {
                const ph = (el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || el.innerText || '').toLowerCase();
                return ph.includes('type to customize') || ph.includes('type to imagine') || ph.includes('customize video') || ph.includes('imagin') || ph.includes('tapez pour modifier');
            });

            const makeBtn = Array.from(document.querySelectorAll('button')).find(b => {
                const text = (b.innerText || '').toLowerCase();
                return TRANSLATIONS.makeVideo.some(k => text.includes(k)) && !b.disabled;
            });

            const form = document.querySelector('form') || document.body;
            const uploadedThumb = form.querySelector('img[src^="blob:"], img[src^="data:"]');
            const thumbSettings = form.querySelector('button[aria-label="Settings"], button[title="Settings"]');

            const progressBtn = Array.from(document.querySelectorAll('button')).find(b => /^\d+%$/.test((b.innerText || '').trim()));
            const isGenerating = !!progressBtn || document.body.innerText.includes('Generating') || document.body.innerText.includes('Rendering');

            if (foundPlaceholder || makeBtn || uploadedThumb || thumbSettings || isGenerating) {
                await new Promise(r => setTimeout(r, 500));
                return;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        throw new Error('Image Upload Failed (Timeout)');
    },

    async processQueue() {
        const QUEUE_LOCK_KEY = '__grokLoopQueueLock';
        const QUEUE_LOCK_TIMEOUT = 300000; // 5 minutes

        if (window[QUEUE_LOCK_KEY]) {
            const age = Date.now() - window[QUEUE_LOCK_KEY];
            if (age < QUEUE_LOCK_TIMEOUT) {
                console.warn('[processQueue] Queue is already locked! Another instance is running. Aborting.');
                return;
            }
            console.warn('[processQueue] Stale queue lock detected. Taking over.');
        }
        window[QUEUE_LOCK_KEY] = Date.now();

        try {
            for (let i = state.currentSegmentIndex; i < state.segments.length; i++) {
                if (isStaleInstance()) break;
                state.currentSegmentIndex = i;

                if (!state.isRunning) {
                    this.saveState();
                    this.dashboard.update();
                    break;
                }

                if (state.segments[i].status === 'done') continue;

                try {
                    await this.processSegment(i);
                } catch (err) {
                    console.error('Loop Error:', err);
                    state.isRunning = false;
                    if (!state.segments[i].status.includes('error')) state.segments[i].status = 'error';
                    this.dashboard.update();
                    this.saveState();
                    break;
                }

                if (state.config.pauseAfterScene && state.isRunning) {
                    state.isRunning = false;
                    this.dashboard.update();
                }

                this.saveState();
                if (!state.isRunning || isStaleInstance()) break;
            }

            if (state.currentSegmentIndex >= state.segments.length - 1) {
                const lastSeg = state.segments[state.segments.length - 1];
                if (lastSeg.status === 'done' || lastSeg.status.includes('error')) {
                    state.isRunning = false;
                    state.currentSegmentIndex = -1;
                    this.dashboard.update();
                    chrome.storage.local.remove('grokLoopState');
                }
            }
        } finally {
            delete window[QUEUE_LOCK_KEY];
            console.log('[processQueue] Queue lock released.');
        }
    },

    async processSegment(index) {
        if (isStaleInstance()) return;
        const seg = state.segments[index];
        const maxRetries = 2;
        let modAttempts = 0;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (!state.isRunning || isStaleInstance()) return;

            try {
                console.log(`Processing Segment ${index + 1} (Attempt ${attempt + 1})...`);
                seg.status = `processing (${attempt + 1})`;
                this.dashboard.update();

                // 1. Image selection
                const isFirst = (index === 0);
                let imageToUpload = seg.inputImage;
                let imageSource = 'None';

                if (imageToUpload) {
                    imageSource = 'Explicitly defined for segment (or Extracted)';
                } else {
                    if (state.config.reuseInitialImage && state.config.initialImage) {
                        imageToUpload = state.config.initialImage;
                        imageSource = 'Initial image (Reused via config)';
                    } else if (isFirst && state.config.initialImage) {
                        imageToUpload = state.config.initialImage;
                        imageSource = 'Initial image (First segment)';
                    } else if (index > 0 && state.lastGeneratedImage) {
                        imageToUpload = state.lastGeneratedImage;
                        imageSource = 'Extracted frame from previous video';
                    }
                }
                console.log(`[Debug-Image] Segment ${index + 1} Image Selection: ${imageSource}`);

                // 2. Prepare Prompt
                let finalPrompt = seg.prompt || '';
                if (state.config.globalPrompt && state.config.globalPrompt.trim().length > 0) {
                    const suffix = state.config.globalPrompt.trim();
                    finalPrompt = finalPrompt ? `${finalPrompt} ${suffix}` : suffix;
                }
                seg.appliedPrompt = finalPrompt;
                this.dashboard.update();

                let extendHandled = false;
                if (state.config.useExtend && index > 0 && state.segments[index - 1].videoUrl) {
                    const prevChainStart = state.segments[index - 1].chainStart !== undefined ? state.segments[index - 1].chainStart : 0;
                    const currentChainLength = index - prevChainStart + 1;
                    const maxExtend = state.config.maxExtendSegments || 5;

                    if (currentChainLength < maxExtend) {
                        console.log(`[Extend] Attempting to extend Segment ${index + 1} (Chain Length: ${currentChainLength}/${maxExtend})...`);
                        const success = await window.extendVideo(state.segments[index - 1].videoUrl);
                        if (success) {
                            console.log('[Extend] Extend UI triggered successfully.');
                            extendHandled = true;
                        } else {
                            console.warn('[Extend] Native extend failed. Falling back to image upload.');
                        }
                    } else {
                        console.log(`[Extend] Chain limit reached (${maxExtend}). Starting new chain for Segment ${index + 1}.`);
                    }

                    // Fallback to extraction if extension wasn't handled (either failed or limit reached)
                    if (!extendHandled && !imageToUpload) {
                        console.log('[Extend] Proactively extracting last frame for fallback...');
                        const frame = await extractLastFrame(state.segments[index - 1].videoUrl);
                        if (frame) {
                            imageToUpload = frame;
                            state.lastGeneratedImage = frame;
                            imageSource = 'Extracted frame (Chain limit/Fallback)';
                        }
                    }
                }
                seg.chainStart = extendHandled ? (state.segments[index - 1].chainStart || index) : index + 1;

                if (extendHandled) {
                    // --- BRANCH 1: EXTENSION ---
                    console.log('[VideoMode] Prompting for EXTENSION (Waiting 2.5s for UI)...');
                    await new Promise(r => setTimeout(r, 2500)); // Wait for extension UI to stabilize
                    const extInput = await findGrokInputArea();
                    if (extInput) await insertTextFast(extInput, finalPrompt);
                    await sendPromptToGrok(seg.appliedPrompt);

                } else if (imageToUpload) {
                    // --- BRANCH 2: IMAGE UPLOAD (Start New Chain) ---
                    // [RESET] March 2026: If we just finished an extension chain or reached the limit,
                    // Grok might still be in "Extend" state. We MUST proactively exit that mode.
                    try {
                        if (window.exitExtendModeUI) {
                            const found = await window.exitExtendModeUI();
                            if (found) {
                                console.log('[VideoMode] Successfully cleared Extend UI. Waiting 2.5s for DOM reset...');
                                await new Promise(r => setTimeout(r, 2500));
                            }
                        }

                        // Always clear any stale attachments (images/videos) before a new upload
                        if (window.clearInputAttachments) {
                            console.log('[VideoMode] Clearing stale attachments...');
                            await window.clearInputAttachments();
                        }

                        if (window.forceClosePopups) await window.forceClosePopups();
                    } catch (e) {
                        console.warn('[VideoMode] Error during proactive UI reset:', e);
                    }

                    const preInput = await findGrokInputArea();
                    if (preInput) await insertTextFast(preInput, finalPrompt);

                    console.log(`Uploading image for Segment ${index + 1}...`);
                    const base64 = await blobToBase64(imageToUpload);
                    await uploadImageToGrok(base64);
                    await this.waitForVideoInputState();

                    const postInput = await findGrokInputArea();
                    if (postInput) {
                        console.log('[VideoMode] Refreshing prompt after image upload...');
                        await insertTextFast(postInput, finalPrompt);
                    }

                    // Mode/Submission Detection setup
                    let alreadySubmitted = false;
                    const checkGenStatus = async () => {
                        console.log('[VideoMode] Monitoring for auto-submission (up to 5s)...');
                        for (let j = 0; j < 10; j++) {
                            await new Promise(r => setTimeout(r, 500));
                            const allBtns = Array.from(document.querySelectorAll('button'));
                            if (allBtns.some(b => /^\d+%$/.test((b.innerText || '').trim()))) return true;
                            if (allBtns.some(b => {
                                const lbl = (b.getAttribute('aria-label') || '').toLowerCase();
                                return lbl.includes('stop') || lbl.includes('cancel');
                            })) return true;
                            if (document.body.innerText.toLowerCase().includes('generating')) return true;
                        }
                        return false;
                    };

                    const videoIndicators = Array.from(document.querySelectorAll('button, div')).some(el => {
                        const t = (el.innerText || el.textContent || '').toLowerCase();
                        return t === 'video' || t.includes('aspect ratio') || t === '6s' || t === '10s';
                    });
                    const videoTab = Array.from(document.querySelectorAll('button, div[role="tab"]')).find(el => (el.innerText || '').toLowerCase().trim() === 'video');
                    const isVideoTabActive = videoTab && (videoTab.getAttribute('aria-selected') === 'true' || videoTab.classList.contains('selected') || videoTab.classList.contains('active'));

                    // Dual-Layout Support: Detect new direct buttons vs old menu layout (Multilingual)
                    const allButtons = Array.from(document.querySelectorAll('button'));
                    const videoBtn = allButtons.find(b => {
                        const t = (b.innerText || '').toLowerCase().trim();
                        return t === 'video' || TRANSLATIONS.imagineMode.includes(t);
                    });
                    const imageBtn = allButtons.find(b => {
                        const t = (b.innerText || '').toLowerCase().trim();
                        return t === 'image' || TRANSLATIONS.imagineMode.includes(t);
                    });
                    const isNewLayout = !!(videoBtn && imageBtn);

                    if (isNewLayout) {
                        console.log('[VideoMode] New direct-button layout detected (Multilingual).');
                        // 1. Ensure Video Mode is selected
                        const isVideoSelected = videoBtn.getAttribute('aria-selected') === 'true' || videoBtn.classList.contains('bg-surface-action-selected');
                        if (!isVideoSelected) {
                            console.log('[VideoMode] Clicking direct "Video" button...');
                            fireClick(videoBtn);
                            await new Promise(r => setTimeout(r, 1200));
                        }

                        // 2. Ensure Duration and Resolution (if present)
                        const targetResolution = state.config.resolution || '480p';
                        const targetDuration = state.config.duration || '6s';

                        const resBtn = allButtons.find(b => (b.innerText || '').trim().toLowerCase() === targetResolution.toLowerCase());
                        if (resBtn && resBtn.getAttribute('aria-selected') !== 'true') {
                            console.log(`[VideoMode] Clicking direct "${targetResolution}" button...`);
                            fireClick(resBtn);
                            await new Promise(r => setTimeout(r, 500));
                        }

                        const durBtn = allButtons.find(b => (b.innerText || '').trim().toLowerCase() === targetDuration.toLowerCase());
                        if (durBtn && durBtn.getAttribute('aria-selected') !== 'true') {
                            console.log(`[VideoMode] Clicking direct "${targetDuration}" button...`);
                            fireClick(durBtn);
                            await new Promise(r => setTimeout(r, 500));
                        }

                        if (await checkGenStatus()) alreadySubmitted = true;

                    } else if (videoIndicators || isVideoTabActive) {
                        // Existing layout with direct indicators or active tab
                        if (await checkGenStatus()) alreadySubmitted = true;
                    } else {
                        // Legacy/Standard Menu Layout
                        const form = document.querySelector('form');
                        let caret = form ? Array.from(form.querySelectorAll('button')).find(b => b.getAttribute('aria-haspopup') === 'menu') : null;
                        if (caret) {
                            console.log('[VideoMode] Menu layout detected. Opening caret...');
                            fireClick(caret);
                            await new Promise(r => setTimeout(r, 1000));
                            const item = Array.from(document.querySelectorAll('[role="menuitem"], button')).find(el => {
                                const t = (el.innerText || el.textContent || '').toLowerCase();
                                return t.includes('animate') || t.includes('make video');
                            });
                            if (item) {
                                fireClick(item);
                                if (await checkGenStatus()) alreadySubmitted = true;
                            } else {
                                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                            }
                        } else {
                            // Direct "Make Video" button fallback
                            const direct = Array.from(document.querySelectorAll('button')).find(b => {
                                const lbl = (b.getAttribute('aria-label') || '').toLowerCase();
                                const txt = (b.innerText || '').toLowerCase();
                                return lbl.includes('make video') || txt.includes('make video') || txt.includes('animate');
                            });
                            if (direct) {
                                console.log('[VideoMode] Direct "Make Video" button found.');
                                fireClick(direct);
                                if (await checkGenStatus()) alreadySubmitted = true;
                            }
                        }
                    }

                    if (alreadySubmitted) {
                        console.log('[VideoMode] Skipping manual send due to auto-submission.');
                        window.__grokLoopIsGenerating = true;
                    } else {
                        const now = Date.now();
                        const COOLDOWN = 5000;
                        if (window.__grokLoopLastManualSubmit && (now - window.__grokLoopLastManualSubmit < COOLDOWN)) {
                            console.warn(`[VideoMode] Submission cooldown active. Skipping manual send.`);
                        } else {
                            window.__grokLoopLastManualSubmit = now;
                            await sendPromptToGrok(seg.appliedPrompt);
                        }
                    }
                } else {
                    // --- BRANCH 3: DIRECT PROMPT ---
                    await sendPromptToGrok(seg.appliedPrompt);
                }

                // Wait for video
                let videoUrl = await waitForVideoResponse();

                const ab = await handleABTest();
                if (ab) videoUrl = ab;

                if (state.config.upscale) {
                    try {
                        const up = await window.upscaleVideo(videoUrl);
                        if (up) {
                            videoUrl = up;
                            seg.videoUrl = videoUrl;
                            this.dashboard.update();
                            await new Promise(r => setTimeout(r, 2000));
                        } else {
                            console.log('[Upscale] Skipping upscale (button not found or already HD).');
                        }
                    } catch (e) {
                        console.warn('[Upscale] Unexpected error during upscale, skipping:', e);
                    }
                }

                seg.videoUrl = videoUrl;
                seg.status = 'done';

                if (state.config.autoDownload && videoUrl) window.LoopManager.downloadSegment(index);

                // Proactive Chaining
                const nextIndex = index + 1;
                if (nextIndex < state.segments.length && !state.config.reuseInitialImage) {
                    const nextSeg = state.segments[nextIndex];
                    if (!nextSeg.inputImage) {
                        try {
                            await new Promise(r => setTimeout(r, 1500));
                            const frame = await extractLastFrame(videoUrl);
                            nextSeg.inputImage = frame;
                            state.lastGeneratedImage = frame;
                        } catch (e) { }
                    }
                }

                if (state.config.maxDelay > 0) {
                    const delay = Math.floor((state.config.maxDelay * 0.5 + Math.random() * state.config.maxDelay * 0.5) * 1000);
                    for (let t = 0; t < delay; t += 100) { if (!state.isRunning) break; await new Promise(r => setTimeout(r, 100)); }
                }
                this.dashboard.update();
                return;

            } catch (err) {
                console.error('Segment Error:', err);
                if (err.message === 'Rate Limit Reached') {
                    state.isRunning = false; seg.status = 'paused (rate limit)'; this.dashboard.update(); alert("Rate Limit Reached!"); return;
                }
                if (err.message === 'Content Moderated') {
                    if (state.config.pauseOnModeration) { state.isRunning = false; seg.status = 'paused (moderation)'; this.dashboard.update(); alert("Moderated!"); return; }
                    modAttempts++;
                    if (modAttempts <= (state.config.moderationRetryLimit || 2)) {
                        seg.status = `moderated (${modAttempts})`; this.dashboard.update(); await new Promise(r => setTimeout(r, 3000));
                        attempt--; continue;
                    }
                }

                if (attempt >= maxRetries) {
                    if (state.config.continueOnFailure) { seg.status = 'error (skipped)'; this.dashboard.update(); return; }
                    else { state.isRunning = false; seg.status = 'paused (error)'; this.dashboard.update(); alert("Error on segment."); return; }
                }
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    },

    async regenerateSegment(index, newPrompt) {
        if (state.isRunning) { alert("Please Pause first."); return; }

        // Final safety check to make sure we don't start multiple loops
        if (window.__grokLoopQueueLock) {
            console.warn('[regenerateSegment] Queue is locked. Cannot regenerate while another instance is active.');
            alert("Loop is currently busy. Please wait a moment or reload.");
            return;
        }

        const cascade = confirm("Regenerate all subsequent segments too?");
        const seg = state.segments[index];
        if (newPrompt) seg.prompt = newPrompt;
        seg.status = 'pending';
        seg.videoUrl = null;
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

    async downloadSegment(index) {
        const seg = state.segments[index];
        if (!seg.videoUrl) return;
        const stored = await chrome.storage.local.get('grokLoopConfig');
        let prefix = (stored.grokLoopConfig && stored.grokLoopConfig.filenamePrefix) ? stored.grokLoopConfig.filenamePrefix.trim() : '';
        const suffix = seg.chainStart === (index + 1) ? `${index + 1}` : `${seg.chainStart}_${index + 1}`;
        const filename = `${prefix}grok_loop_${suffix}.mp4`;

        try {
            const dataUrl = await new Promise((res, rej) => {
                chrome.runtime.sendMessage({ action: 'FETCH_VIDEO_AS_DATA_URL', payload: { url: seg.videoUrl } }, r => {
                    if (r && r.success) res(r.dataUrl); else rej(new Error('Fetch failed'));
                });
            });
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeType = dataUrl.match(/:(.*?);/)[1];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            const blob = new Blob([ab], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            chrome.runtime.sendMessage({ action: 'DOWNLOAD_VIDEO', payload: { url: seg.videoUrl, filename: filename } });
        }
    }
};

window.LoopManager.init();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isStaleInstance()) return;
    if (message.action === 'PING') { sendResponse({ alive: true, gen: __myGeneration }); return; }
    console.log('[Content] Received message:', message);

    if (message.action === 'START_LOOP') {
        if (!window.__grokLoopRaceWinner || window.__grokLoopRaceWinner <= __myGeneration) window.__grokLoopRaceWinner = __myGeneration;
        const myRaceClaim = __myGeneration;
        setTimeout(() => {
            if (window.__grokLoopRaceWinner !== myRaceClaim) return;
            window.LoopManager.start(message.payload);
        }, 50);
        sendResponse({ status: 'STARTED' });
    }
    else if (message.action === 'PAUSE_LOOP') window.LoopManager.togglePause(false);
    else if (message.action === 'RESUME_LOOP') { if (!state.isRunning) window.LoopManager.togglePause(true, message.payload); }
    else if (message.action === 'REGENERATE_SEGMENT') window.LoopManager.regenerateSegment(message.payload.index, message.payload.prompt);
    else if (message.action === 'DOWNLOAD_SEGMENT') window.LoopManager.downloadSegment(message.payload.index);
    else if (message.action === 'SET_DASHBOARD_VISIBILITY') window.LoopManager.dashboard.setVisibility(message.payload.visible);
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.grokLoopConfig) {
        const newConfig = changes.grokLoopConfig.newValue;
        if (newConfig && state.config) {
            if (newConfig.pauseOnModeration !== undefined) state.config.pauseOnModeration = newConfig.pauseOnModeration;
            if (newConfig.showDebugLogs !== undefined) state.config.showDebugLogs = newConfig.showDebugLogs;
            if (newConfig.moderationRetryLimit !== undefined) state.config.moderationRetryLimit = newConfig.moderationRetryLimit;
            if (newConfig.pauseAfterScene !== undefined) state.config.pauseAfterScene = newConfig.pauseAfterScene;
        }
    }
});
