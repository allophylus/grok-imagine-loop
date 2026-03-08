window.Dashboard = class Dashboard {
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

                const promptDisp = seg.appliedPrompt || seg.prompt;
                const prompt = createEl('div', 'segment-prompt', promptDisp);
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

        // Quota Info (March 2026)
        if (state.quotaInfo) {
            const quotaRow = createEl('div', 'quota-info');
            quotaRow.style.padding = '4px 10px';
            quotaRow.style.fontSize = '11px';
            quotaRow.style.color = '#aaa';
            quotaRow.style.background = 'rgba(255,255,255,0.05)';
            quotaRow.style.borderTop = '1px solid rgba(255,255,255,0.1)';

            // Heuristic parsing for common quota shapes
            let display = 'Quota: Active';
            try {
                if (typeof state.quotaInfo === 'object' && state.quotaInfo !== null) {
                    const q = state.quotaInfo;
                    if (q.remaining !== undefined) display = `Quota Remaining: ${q.remaining}`;
                    else if (q.limit !== undefined && q.used !== undefined) display = `Quota: ${q.limit - q.used} / ${q.limit}`;
                    else if (q.credits !== undefined) display = `Credits: ${q.credits}`;
                    else if (q.value !== undefined) display = `Usage: ${q.value}`;
                    else display = `Quota: ${JSON.stringify(q).substring(0, 40)}...`;
                } else {
                    display = `Quota: ${state.quotaInfo}`;
                }
            } catch (e) {
                display = 'Quota: (Parsing Error)';
            }
            quotaRow.textContent = display;
            this.root.appendChild(quotaRow);
        }
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
                    quotaInfo: state.quotaInfo,
                    segments: state.segments.map(s => ({
                        prompt: s.prompt,
                        appliedPrompt: s.appliedPrompt,
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
