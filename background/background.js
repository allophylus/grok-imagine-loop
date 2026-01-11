// Grok Imagine Loop Background Script

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'DOWNLOAD_VIDEO') {
        chrome.downloads.download({
            url: message.payload.url,
            filename: message.payload.filename || 'grok_video.mp4',
            saveAs: false // Auto-save to default folder
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('Download started:', downloadId);
                sendResponse({ success: true, downloadId: downloadId });
            }
        });
        return true; // Keep channel open for async response
    }

    if (message.action === 'FETCH_VIDEO_AS_DATA_URL') {
        console.log('Fetching video blob for CORS bypass:', message.payload.url);
        fetch(message.payload.url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.blob();
            })
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendResponse({ success: true, dataUrl: reader.result });
                };
                reader.onerror = () => {
                    sendResponse({ success: false, error: 'Failed to read blob' });
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error('Fetch failed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep channel open for async response
    }
});
