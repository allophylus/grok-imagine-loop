// === UPSCALE VIDEO ===
// Clicks the "Upscale" button in the More options menu.
window.upscaleVideo = async function (newVideoSrc = null) {
    await new Promise(r => setTimeout(r, 500)); // Wait for UI to settle

    const mainContent = document.querySelector('main') || document.body;

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
        console.warn('[Upscale] Target video not found! Cannot upscale.');
        return null;
    }

    console.log('[Upscale] Target video found. Looking for "More options" button...');

    // Walk up to find the container
    const videoContainer = targetVideo.closest('article') || targetVideo.closest('[data-testid="tweet"]') || targetVideo.closest('.group') || targetVideo.parentElement.parentElement;

    // Diagnostic: Show exactly what is visible around the video
    console.log('[Upscale] Performing Surface Scan of video area...');
    getSurfaceDump(videoContainer || document);

    // Inject CSS to reveal Tailwind opacity-0 / invisible action buttons (Consistent with extend.js)
    const revealStyle = document.createElement('style');
    revealStyle.id = '__grok-upscale-reveal';
    revealStyle.textContent = '[class*="opacity-0"] { opacity: 1 !important; pointer-events: auto !important; } [class*="invisible"] { visibility: visible !important; }';
    document.head.appendChild(revealStyle);
    await new Promise(r => setTimeout(r, 200)); // let the browser repaint

    // Use shared more button finder
    const moreBtn = await findMoreButton(videoContainer || document);

    // After we are done grabbing the button, we can remove the override style
    const styleEl = document.getElementById('__grok-upscale-reveal');
    if (styleEl) styleEl.remove();

    if (!moreBtn) {
        console.warn('[Upscale] "More options" button not found.');
        return null;
    }

    // 1. Open the "More options" menu if not already open
    const alreadyOpen = window.isMenuOpen();
    if (!alreadyOpen) {
        console.log(`[Upscale] Clicking "More options" button:`, moreBtn.getAttribute('aria-label') || moreBtn.title || 'no-label');
        await simulateClick(moreBtn);
        // Wait for the dropdown menu to open
        console.log('[Upscale] Waiting for dropdown menu...');
        await new Promise(r => setTimeout(r, 500));
    } else {
        console.log('[Upscale] Menu already open. Reusing...');
    }

    // 2. Locate the "Upscale video" button in the menu
    console.log('[Upscale] Searching for Upscale menu item (with retry)...');
    let upscaleBtn = null;
    for (let i = 0; i < 2; i++) {
        upscaleBtn = findMenuItemInPopups(TRANSLATIONS.upscale, [
            'Upscale video',
            'Upscale',
            'Enhance video',
            'Increase resolution',
            'High resolution',
            'HD'
        ]);
        if (upscaleBtn) break;
        console.log(`[Upscale] Attempt ${i + 1} failed. Retrying in 1s...`);
        await new Promise(r => setTimeout(r, 500));
    }

    if (!upscaleBtn) {
        console.warn('[Upscale] "Upscale video" option not found in menu.');

        // Diagnostic: Exhaustive search for ANY popup since role-based one failed
        const allPossiblePopups = Array.from(document.querySelectorAll('.absolute, .fixed, [role], [data-state]'))
            .filter(el => {
                const z = parseInt(window.getComputedStyle(el).zIndex, 10);
                return z > 50 && el.offsetHeight > 0 && !el.closest('.grok-loop-dashboard');
            });

        console.log(`[Upscale-Diag] Search failed. Visible high-z popups: ${allPossiblePopups.length}`);
        // If we opened this menu specifically for upscale and it failed, keep it open for Extend
        // No longer pressing Escape here per user request ("skip and continue")
        return null;
    }

    console.log('[Upscale] Found Upscale button! Clicking...');
    await simulateClick(upscaleBtn);

    // Wait for the NEW video
    console.log('[Upscale] Waiting for upscaled video generation...');
    return waitForVideoResponse();
}
