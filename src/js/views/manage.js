var Filesaver = require('../libs/filesaver.js'),
    $data = $("#data"),
    db,
    localData;

function openData() {
    db = new Dexie("DataSelfieLocalDB");
    db.open().catch(function(err) {
        console.log("[DB][<<] error");
        console.error(err.stack || err);
        alert("There has been an error. Database was not initiated.");
    }).finally(function() {
        console.log("[DB][<<] opened");
        getData();
    });
}

function getData() {
    console.log("update displayed data");
    var obj = { dataselfie: {} };
    db.transaction('r', db.tables, function() {
        db.tables.forEach(function(table) {
            table.toArray().then(function(sessions) {
                obj.dataselfie[table.name] = sessions;
            });
        })
    }).then(function() {
        localData = JSON.stringify(obj, null, 2);
        displayData(localData);
    }).catch(function(err) {
        console.error(err.stack);
    });
}

function displayData(text) {
    $data.text(text);
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function readSingleFile(e) {
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        if (IsJsonString(e.target.result)) {
            var data = JSON.parse(e.target.result);
            chrome.runtime.sendMessage({
                type: "import",
                data: data
            });
        } else {
            chrome.runtime.sendMessage({
                type: "import",
                data: []
            });
        }
    };
    reader.readAsText(file);
}

function downloadData() {
    var name = "dataselfie_" + moment().format('YYYY-MM-DD') + ".json",
        blob = new Blob([localData], { type: "text/json" });
    Filesaver.saveAs(blob, name);
}

function start() {
    openData();
    $("button").click(function(e) {
        switch (e.target.id) {
            case "backup":
                getData();
                downloadData();
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
        }
    });
    chrome.runtime.onMessage.addListener(function(req, sender, sendRes) {
        if (req.displaydata) {
            openData();
        }
    });
    $("#choose-file").change(readSingleFile);
}


start();