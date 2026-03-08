/**
 * Network Interceptor for Grok Imagine Loop
 * This script is injected into the page context to monitor API calls
 * and extract hidden quota/usage information.
 */
(function () {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const url = args[0] instanceof Request ? args[0].url : args[0];

        // Intercept GraphQL and other relevant API calls
        if (url.includes('/i/api/graphql') || url.includes('grok.com/api')) {
            try {
                // Clone the response to avoid consuming it
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();

                // Look for quota/usage information in the response data
                // Heuristic: Look for fields like 'usage', 'remaining', 'limit', 'credits'
                const quotaInfo = findQuotaInfo(data);
                if (quotaInfo) {
                    window.postMessage({
                        type: 'GROK_QUOTA_UPDATE',
                        data: quotaInfo
                    }, '*');
                }
            } catch (err) {
                // Silent catch to prevent breaking the page
            }
        }

        return response;
    };

    function findQuotaInfo(obj) {
        if (!obj || typeof obj !== 'object') return null;

        // Common patterns for quota/usage in APIs
        const keys = Object.keys(obj);
        for (const key of keys) {
            const val = obj[key];
            const lowerKey = key.toLowerCase();

            if (lowerKey === 'usage' || lowerKey === 'credits' || lowerKey === 'entitlements') {
                return val;
            }

            if (typeof val === 'object') {
                const deeper = findQuotaInfo(val);
                if (deeper) return deeper;
            }
        }
        return null;
    }

    console.log('[GrokLoop] Network interceptor active.');
})();
