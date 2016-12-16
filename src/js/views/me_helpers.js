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
    }
}
