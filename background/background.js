// Open Side Panel on Icon Click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'DOWNLOAD_VIDEO') {
        const url = message.payload.url;
        const filename = message.payload.filename || 'grok_video.mp4';

        console.log('Fetching video to bypass Content-Disposition header for custom filename...');
        fetch(url, { cache: 'no-cache' })
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    chrome.downloads.download({
                        url: reader.result,
                        filename: filename,
                        saveAs: false
                    }, (downloadId) => {
                        if (chrome.runtime.lastError) {
                            console.error('Download failed:', chrome.runtime.lastError);
                            sendResponse({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            console.log('Download started with forced filename:', filename, downloadId);
                            sendResponse({ success: true, downloadId: downloadId });
                        }
                    });
                };
                reader.readAsDataURL(blob);
            })
            .catch(err => {
                console.error('Fetch failed for download fallback:', err);
                sendResponse({ success: false, error: err.message });
            });

        return true; // Keep channel open for async response
    }

    if (message.action === 'FETCH_VIDEO_AS_DATA_URL') {
        console.log('Fetching video blob for CORS bypass:', message.payload.url);
        fetch(message.payload.url, { cache: 'no-cache' })
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
