$(document).click(function(e) {
    if (e.target.id == "me") {
        chrome.tabs.create({ url: chrome.runtime.getURL("views/me.html") });
    } else if (e.target.id == "backup") {
        chrome.runtime.sendMessage({
            type: "backup",
            data: []
        });
    } else if (e.target.id == "options") {
        if (chrome.runtime.openOptionsPage) {
            // New way to open options pages, if supported (Chrome 42+).
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('views/options.html'));
        }
    }
})
