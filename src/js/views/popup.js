chrome.browserAction.getBadgeText({}, function(text){
    if(text.length > 0) {
        $("#update").show();
        chrome.browserAction.setBadgeText({ text: "" });
    }
});

$("button").click(function(e) {
    switch (e.target.id) {
        case "me":
            chrome.tabs.create({ url: chrome.runtime.getURL("views/me.html") });
            break;
        case "manage":
            chrome.tabs.create({ url: chrome.runtime.getURL("views/manage.html") });
            break;
        case "options":
            if (chrome.runtime.openOptionsPage) {
                // New way to open options pages, if supported (Chrome 42+).
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('views/options.html'));
            };
            break;
    }
});