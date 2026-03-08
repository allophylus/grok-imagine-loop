// === EXTEND VIDEO ===
// Clicks the "Extend" button in the More options menu.
// After clicking, Grok opens a compose area where the caller should insert a prompt and click Send.
window.extendVideo = async function (newVideoSrc = null) {
    await new Promise(r => setTimeout(r, 500)); // Wait for UI to settle

    const mainContent = document.querySelector('main') || document.body;
    console.log('[Extend] Looking for Extend video button...');

    let targetVideo = newVideoSrc
        ? Array.from(document.querySelectorAll('video')).find(v => v.src === newVideoSrc && !v.closest('.grok-loop-dashboard'))
        : null;

    if (!targetVideo) {
        // Exclude videos inside our own dashboard
        const allVideos = Array.from(mainContent.querySelectorAll('video')).filter(v =>
            v.src &&
            v.offsetParent !== null &&
            !v.closest('.grok-loop-dashboard')
        );
        targetVideo = allVideos[allVideos.length - 1];
    }

    if (!targetVideo) {
        console.warn('[Extend] Target video not found! Cannot extend.');
        return false;
    }

    // 1. Find and click the "..." (More options) button below the video
    console.log('[Extend] Target video found. Looking for "More options" menu button...');

    // Walk up the DOM to find the post/container that holds this video
    const videoContainer = targetVideo.closest('article') || targetVideo.closest('[data-testid="tweet"]') || targetVideo.closest('.group') || targetVideo.parentElement.parentElement;

    // Diagnostic: Show exactly what is visible around the video
    console.log('[Extend] Performing Surface Scan of video area...');
    getSurfaceDump(videoContainer || document);

    // Inject CSS to reveal Tailwind opacity-0 / invisible action buttons
    const revealStyle = document.createElement('style');
    revealStyle.id = '__grok-extend-reveal';
    revealStyle.textContent = '[class*="opacity-0"] { opacity: 1 !important; pointer-events: auto !important; } [class*="invisible"] { visibility: visible !important; }';
    document.head.appendChild(revealStyle);
    await new Promise(r => setTimeout(r, 200)); // let the browser repaint

    // Use shared more button finder
    const moreOptionsBtn = await findMoreButton(videoContainer || document);

    // After we are done grabbing the button, we can remove the override style
    const styleEl = document.getElementById('__grok-extend-reveal');
    if (styleEl) styleEl.remove();

    if (!moreOptionsBtn) {
        console.warn('[Extend] "More options" button not found near video. Dumping buttons...');
        // Legacy fallback
        const allButtons = Array.from(document.querySelectorAll('button'));
        const btnDump = allButtons.slice(-10).map(b => {
            const l = b.getAttribute('aria-label') || b.title || b.innerText?.trim();
            return `[${l}]`;
        });
        console.log('[Extend] Last 10 buttons on page:\n', btnDump.join(' | '));
        return false;
    }

    // 1. Open the "More options" menu if not already open
    const alreadyOpen = window.isMenuOpen();
    if (!alreadyOpen) {
        console.log('[Extend] Clicking "More options" button...');
        await simulateClick(moreOptionsBtn);
        // Wait for the dropdown menu to open
        console.log('[Extend] Waiting for dropdown menu...');
        await new Promise(r => setTimeout(r, 500));
    } else {
        console.log('[Extend] Menu already open. Reusing...');
    }

    // 2. Locate the "Extend video" button in the menu
    console.log('[Extend] Searching for Extend menu item (with retry)...');
    let extendBtn = null;
    for (let i = 0; i < 5; i++) {
        extendBtn = findMenuItemInPopups(TRANSLATIONS.extend, ['Extend video', 'Extend']);
        if (extendBtn) break;
        console.log(`[Extend] Attempt ${i + 1} failed. Retrying in 1s...`);
        await new Promise(r => setTimeout(r, 500));
    }

    if (!extendBtn) {
        console.warn('[Extend] "Extend video" option not found in menu.');
        // Diagnostic: What IS in the DOM?
        const allPopups = Array.from(document.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"], [data-radix-popper-content-wrapper], [data-state="open"]'));
        console.log(`[Extend-Diag] Search failed. Popups visible: ${allPopups.length}`);
        if (allPopups.length > 0) {
            console.log('[Extend-Diag] Popup sample text:', allPopups[allPopups.length - 1].innerText.substring(0, 500));
            // Detailed scan of the actual popup that's blocking us
            console.log('[Extend-Diag] Detailed scan of topmost popup:');
            getSurfaceDump(allPopups[allPopups.length - 1]);
        }

        // Press Escape to close the menu only if we opened it and it's useless
        await window.forceClosePopups();
        return false;
    }

    console.log('[Extend] Clicking Extend video menu item...');
    await simulateClick(extendBtn);

    await new Promise(r => setTimeout(r, 2000)); // Wait for compose area to appear

    // Always close the menu after a successful trigger to keep the UI clean
    await window.forceClosePopups();

    return true;
}
