// --- init.js ---
// Ensures GrokLoop only injects once per page lifecycle
if (!window.__GrokLoopGeneration) window.__GrokLoopGeneration = 0;
window.__GrokLoopGeneration++;
const __myGeneration = window.__GrokLoopGeneration;

function isStaleInstance() {
    if (window.__GrokLoopGeneration !== __myGeneration) {
        console.warn('[GrokLoop] Stale content script instance detected. Aborting to avoid duplicate actions.');
        return true;
    }
    return false;
}

if (window.GrokLoopInjected && __myGeneration > 1) {
    console.log(`Grok Imagine Loop content script re-injected (gen ${__myGeneration}). Overriding old instance.`);
}
window.GrokLoopInjected = true;
console.log(`Grok Imagine Loop content script (V2) Initializing... [gen ${__myGeneration}]`);

function detectLanguage() {
    const lang = document.documentElement.lang || navigator.language || 'en';
    console.log(`[Content] Detected Language: ${lang}`);
    return lang;
}
detectLanguage();

// Inject Network Interceptor (March 2026)
(function injectInterceptor() {
    console.log('[Content] Injecting Network Interceptor...');
    try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('content/network_interceptor.js');
        (document.head || document.documentElement).appendChild(script);
        script.onload = () => script.remove();
    } catch (e) {
        console.error('[Content] Failed to inject interceptor:', e);
    }
})();

// Listen for Quota Updates from the Interceptor
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'GROK_QUOTA_UPDATE') {
        console.log('[Content] Received Quota Update:', event.data.data);
        if (window.state) window.state.quotaInfo = event.data.data;
        if (window.LoopManager && window.LoopManager.dashboard) {
            window.LoopManager.dashboard.update();
        }
    }
});
