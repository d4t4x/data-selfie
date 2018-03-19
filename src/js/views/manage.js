var $data = $("#data"),
    $status = $("#status p"),
    db,
    localData,
    predData;

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

function start() {
    openData();
    $("button").click(function(e) {
        $status.text("");
        switch (e.target.id) {
            case "backup":
                chrome.runtime.sendMessage({
                    type: "backup",
                    data: []
                });
                break;
            case "pred-backup":
                chrome.runtime.sendMessage({
                    type: "pred-backup",
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
        }
    });
    chrome.runtime.onMessage.addListener(function(req, sender, sendRes) {
        if (req.displaydata) {
            openData();
        }
        if (req.msg) {
            $status.text(req.msg);
        }
    });
    $("#choose-file").change(readSingleFile);
}

start();