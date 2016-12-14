var clog = {
    fb: "color: rgb(80, 100, 220)",
    red: "color: red",
    magenta: "color: magenta",
    blue: "color: blue",
    teal: "color: teal",
    grey: "color: silver",
    lime: "color: lime"
};
module.exports = {
    clog: clog,
    now: function() {
        return moment().format();
    },
    getPermissions: function() {
        chrome.permissions.getAll(function(p) {
            console.log("%c[Permissions][<<] " + _.join(p.permissions, " - "), clog.grey);
        });
    },
    setBrowserActionIcon: function(status) {
        if (status == "start") {
            chrome.browserAction.setIcon({ path: "../img/icon-48.png" });
        } else {
            chrome.browserAction.setIcon({ path: "../img/icon-48-inactive.png" });
        }
    },
    downloadBar: function() {
        setTimeout(function() {
            chrome.downloads.erase({ "state": "complete" });
        }, 100);
    },
    saveBackup: function(data) {
        console.log("[DB][<<] backup", data);
        chrome.downloads.download({
            url: "data:text/json," + JSON.stringify(data, null, 2),
            filename: "./dataselfie_" + moment().format('YYYY-MM-DD') + ".json",
            conflictAction: "overwrite", // "uniquify" / "overwrite" / "prompt"
            saveAs: false, // true gives save-as dialogue
        }, this.downloadBar());
    },
    backup: function(_db) {
        var obj = { dataselfie: {} };
        var self = this;
        _db.transaction('r', _db.tables, function() {
            _db.tables.forEach(function(table) {
                table.toArray().then(function(sessions) {
                    obj.dataselfie[table.name] = sessions;
                });
            })
        }).then(function() {
            self.saveBackup(obj);
        });
    },
    resetDB: function(_db, _callback) {
        _db.delete().then(function() {
            console.log("%c[DB][<<] deleted", clog.magenta);
        }).catch(function(err) {
            console.error("%cCould not delete [DB][<<]", clog.magenta);
        }).finally(function() {
            if (_callback) { _callback(); };
        });
    },
    getEachRow: function(_table) {
        // do sth w/ each row
        _table.each(function(row) {
            console.log("[DB][<<]" + row);
        });
    },
    getFromTimeRange: function(_table, _key, _from, _to) {
        // e.g. db.timespent,
        // "start",
        // moment().subtract(7, "days").format()
        // moment("2016-11-28T19:00:00-05:00").format()
        _table.where(_key)
            .between(_from, _to).toArray()
            .then(function(rows) {
                console.log("%c[DB][<<]" + rows, clog.magenta);
                return rows;
            });
    },
    checkCrash: function(_db, _table) {
        _db.transaction("rw", _table, function() {
            _table.toCollection().last(function(last) {
                if (last.stop == undefined) {
                    chrome.storage.local.get(null, function(res) {
                        if (res.errorCloseWindow != undefined) {
                            _table.update(last.id, { stop: res.errorCloseWindow.timestamp });
                            chrome.storage.remove("errorCloseWindow");
                            console.log("%c[DB][<<] updated stop of last session " + res.errorCloseWindow.timestamp, clog.magenta);
                        } else {
                            // if for some reason, so the last session will be eliminated
                            _table.update(last.id, { stop: last.start });
                            console.log("%c[DB][<<] updated stop to same as start of last session " + last.start, clog.magenta);
                            // FIX should also delete all activity that happened in that session
                            // or have the time of the last event be the "stop" time
                        }
                    });
                }
            });
        }).then(function() {
            chrome.storage.local.remove("errorCloseWindow");
        });
    }
}
