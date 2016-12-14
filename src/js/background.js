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
    dbstores = {
        timespent: "++id, start, stop",
        looked: "++id, postUrl, posterActivity, poster, posterId, postImg, desc, duration, sharer, sharerId, sharerActivity, timestamp",
        pages: "++id, href, origin, pathname, timestamp, inSession"
    },
    session = false,
    helper = require("./background_helpers.js");

function generalListeners() {
    chrome.runtime.onInstalled.addListener(function() {
        // console.log("onInstalled");
    });
    chrome.runtime.onMessage.addListener(function(req, sender, sendRes) {
        switch (req.type) {
            case "contentLoaded":
                console.log("[>>]" + _.join(req.data, " - "));
                db.pages.add({ href: req.data[1], origin: req.data[2], pathname: req.data[3], timestamp: helper.now(), inSession: req.data[0] << 0 }); // http://stackoverflow.com/a/14787812
                if (req.data[0] == true) {
                    setTimestamp("start", req.type);
                };
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
                        userId: req.data[3]
                    }
                });
                break;
            case "backup":
                helper.backup(db);
                break;
            case "save looked":
                db.looked.add(req.data);
                break;
        }
        return true;
    });

    // STATUS BAR KEY[keyword in manifest.json] + tab
    chrome.omnibox.onInputEntered.addListener(function(text) {
        alert('You just typed "' + text + '"');
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
                "optionsMinLookedDuration": 3,
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
    // for testing
    // helper.resetDB(db, initDB);
    // helper.getFromTimeRange(db.timespent, "start", moment().subtract(7, "d").format(), helper.now());
    // helper.getEachRow(db.timespent);
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
