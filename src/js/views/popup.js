$(document).click(function(e) {
    switch (e.target.id) {
        case "me":
            chrome.tabs.create({ url: chrome.runtime.getURL("views/me.html") });
            break;
        case "backup":
            chrome.runtime.sendMessage({
                type: "backup",
                data: []
            });
            break;
        case "import":
            $("#choose-file").click();
            break;
        case "delete":
            chrome.runtime.sendMessage({
                type: "delete",
                data: []
            });
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
})

function readSingleFile(e) {
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var data = JSON.parse(e.target.result);
        chrome.runtime.sendMessage({
            type: "import",
            data: data
        });
    };
    reader.readAsText(file);
}

$("#choose-file").change(readSingleFile);
