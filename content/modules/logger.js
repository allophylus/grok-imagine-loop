// --- Console Override (Log Streaming) ---
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
};

function broadcastLog(level, args) {
    // Only send if configured
    const shouldSend = window.state && window.state.config && window.state.config.showDebugLogs;

    if (shouldSend) {
        try {
            const safeArgs = args.map(a => {
                try {
                    if (a instanceof Error) return { message: a.message, stack: a.stack, name: a.name };
                    if (typeof a === 'object' && a !== null) return JSON.parse(JSON.stringify(a));
                    return a;
                } catch (e) {
                    return String(a);
                }
            });

            chrome.runtime.sendMessage({
                action: 'LOG_ENTRY',
                payload: { level: level, args: safeArgs }
            }).catch(err => {
                // Ignore disconnects
            });
        } catch (e) {
            // Ignore format errors
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
