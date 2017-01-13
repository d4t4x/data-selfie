var greeting = "\n" +
    "......................$$$$$$$$$$......................\n" +
    "..................$$$$$$$   $$$$$$$$..................\n" +
    "...............$$  $$$    $$$$$$$$$  $$...............\n" +
    ".............$$   $$$$  $$$$$$$$$$$$   $$.............\n" +
    ".............$$   $$$$$$$$$$$$$$$$$$   $$.............\n" +
    "...............$$     $$$$$$$$$$     $$...............\n" +
    ".................$$$              $$$.................\n" +
    ".....................$$$$$$$$$$$$.....................\n\n",
    devMode = true,
    db,
    session = false,
    helper = require("./background_helpers.js"),
    dbstores = require("./dbstores.js");

function generalListeners() {
    chrome.runtime.onInstalled.addListener(function() {
        // console.log("onInstalled");
    });
    chrome.runtime.onMessage.addListener(function(req, sender, sendRes) {
        switch (req.type) {
            case "contentLoaded":
                console.log("[>>] " + sender.tab.url + "\t" + sender.tab.status);
                if (parseInt(req.data[0]) == 1) {
                    setTimestamp("start", req.type);
                };
                db.pages.add({ url: sender.tab.url, timestamp: helper.now(), inSession: req.data[0] });
                break;
            case "blur":
                setTimestamp("stop", req.type);
                break;
            case "focus":
                setTimestamp("start", req.type);
                break;
            case "closeWindow":
                setTimestamp("stop", req.type);
                break;
            case "profilePic":
                chrome.storage.local.set({
                    "dsUser": {
                        profilePic: {
                            dataUri: req.data[0],
                            rawImg: req.data[1]
                        },
                        profileLink: req.data[2],
                        userName: req.data[3]
                    }
                });
                break;
            case "backup":
                helper.backup(db);
                break;
            case "import":
                helper.import(db, req.data.dataselfie);
                break;
            case "delete":
                helper.resetDB(db, initDB);
                break;
            case "saveLooked":
                db.looked.add(req.data);
                break;
            case "saveClicked":
                db.clicked.add(req.data);
                break;
            case "saveTyped":
                db.typed.add(req.data);
                break;
        }
        return true;
    });
    var lastWebReq = 0;
    chrome.webRequest.onCompleted.addListener(function(info) {
        var dif = info.timeStamp - lastWebReq;
        // limit the number of notifications sent to content
        if (dif > 1500 || lastWebReq == 0) {
            helper.sendToContent(info.tabId);
            console.log("%c[>>] new webRequest", helper.clog.fb);
        }
        lastWebReq = info.timeStamp;
    }, {
        urls: ["https://www.facebook.com/*", "http://www.facebook.com/*"],
        types: ["image"]
    });
    // STATUS BAR [keyword in manifest.json] + tab
    chrome.omnibox.onInputEntered.addListener(function(text) {
        switch (text) {
            case "reset db":
                helper.resetDB(db, initDB);
                break;
            case "delete db":
                helper.resetDB(db);
                break;
            case "init db":
                initDB();
        }
    });
}

function saveTimestamp(now, status, event) {
    db.transaction("rw", db.timespent, function() {
        db.timespent.toCollection().last(function(last) {
            if (status == "start" && last == undefined) {
                db.timespent.add({ start: now });
            } else if (status == "start" && last.stop != undefined) {
                db.timespent.add({ start: now });
            } else if (status == "stop" && last.stop == undefined) {
                db.timespent.update(last.id, { stop: now });
            };
        });
    });
}

function setTimestamp(status, event) {
    if (session == true && status == "stop") {
        session = false;
        console.log("%c----- [sessions][>>]\t" + status + "\t" + event, helper.clog.fb);
    } else if (session == false && status == "start") {
        session = true;
        console.log("%c+++++ [sessions][>>]\t" + status + "\t" + event, helper.clog.fb);
    }
    helper.setBrowserActionIcon(status);
    saveTimestamp(moment().format(), status, event);
};

function initDB() {
    // if db already exists, dexie only opens
    db = new Dexie("DataSelfieLocalDB");
    db.version(1).stores(dbstores);
    db.open().catch(function(err) {
        console.log("%c[DB][<<] error", helper.clog.magenta);
        console.error(err.stack || err);
    }).finally(function() {
        console.log("%c[DB][<<] opened", helper.clog.magenta);
    });
}

function initOptions() {
    chrome.storage.local.get(null, function(res) {
        if (res.optionsMinLookedDuration == undefined) {
            chrome.storage.local.set({
                "optionsBackup": 7,
                "optionsMinLookedDuration": 5,
                "optionsReport": false
            });
            console.log("%cDefault [options][<<] set.", helper.clog.grey);
        } else {
            console.log("%c[Options][<<] already exist.", helper.clog.grey);
        }
    });
}

function storagePrep() {
    initDB();
    db.timespent.toArray().then(function(rows) {
        if (rows.length > 0) {
            helper.checkCrash(db, db.timespent);
        } else {
            console.log("%c[DB][<<] timespent is empty.", helper.clog.magenta);
        };
    });
}

function init() {
    console.log("%c" + greeting, helper.clog.lime);
    storagePrep();
    initOptions();
    generalListeners();
    helper.setBrowserActionIcon(session);
    if (devMode) { helper.getPermissions(); };
}

init();
