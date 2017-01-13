require("../../css/main.scss");
console.log("Kaboom. Me page loaded.");
var helper = require("./me_helpers.js"),
    dbstores = require("../dbstores.js"),
    db,
    d3 = require("d3")
body = $("body");

// consumption-vis
var activity = {
    w: $("#consumption-vis").width(),
    h: 0,
    pad: 20,
    lpad: 90,
    timespan: 7, // how many days for chart
    elSize: 6,
    svg: undefined,
    yScale: undefined,
    xScale: undefined,
    plot: function() {
        var self = this;
        this.h = this.elSize * 6 * this.timespan;

        this.svg = d3.select("#consumption-vis")
            .append("svg")
            .attr("width", this.w)
            .attr("height", this.h);

        this.xScale = d3.scaleLinear().domain([0, 24])
            .range([this.lpad - this.pad + 5, this.w]); // need w minus for last label

        var xAxis = d3.axisBottom(this.xScale)
            .ticks(24)
            .tickFormat(function(d) {
                // var m = (d >= 12 && d < 24) ? "pm" : "am";
                // return (d % 12 == 0) ? 12 + m : d % 12 + m;
                return (d == 24) ? "" : d;
            })
            .tickSize(0)
            .tickPadding(10);

        this.svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0, " + (this.h - this.pad) + ")")
            .call(xAxis);

        var mindate = moment().subtract(this.timespan, "days").startOf('day').toDate(),
            // add 1 more day to have a space buffer for showing data
            maxdate = moment().add(1, "days").startOf('day').toDate();

        this.yScale = d3.scaleTime().domain([mindate, maxdate]).range([this.pad, this.h - this.pad]);

        var yAxis = d3.axisLeft(this.yScale)
            .ticks(this.timespan)
            .tickFormat(function(d, i) {
                if (i == self.timespan + 1) {
                    return "";
                } else {
                    return moment(d).format("MMM-DD-YY");
                }
            })
            .tickSize(0)
            .tickPadding(6);

        this.svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + (this.lpad - this.pad) + ", 0)")
            .call(yAxis);

        var grid = this.svg.append("g");
        for (var i = 0; i <= this.timespan; i++) {
            grid.append("line")
                .attr("class", "gridline")
                .attr("x1", this.xScale(0))
                .attr("y1", this.yScale(moment().subtract(i, "days").startOf('day').toDate()))
                .attr("x2", this.xScale(24))
                .attr("y2", this.yScale(moment().subtract(i, "days").startOf('day').toDate()));
        }

        db.looked.toArray(function(lookedArr) {
            self.addPoints("elLooked", lookedArr, "#00FF80", "", 0);
        });
        db.clicked.toArray(function(clickedArr) {
            self.addPoints("elClicked", clickedArr, "#FF00B1", "#0080FF", 1);
        });
        db.typed.toArray(function(typedArr) {
            self.addPoints("elTyped", typedArr, "#FFFF00", "", 2);
        });

    },
    addPoints: function(classname, array, color1, color2, order) {
        var class_selector = "." + classname
        self = this;
        this.svg.append("g").selectAll(class_selector)
            .data(array)
            .enter()
            .append("path")
            .attr("class", classname)
            .attr("d", function(d, i) {
                var size = self.elSize,
                    date = d.timestamp,
                    d = moment(date).utcOffset(date),
                    offset = d.utcOffset(), // to get time zone
                    x = self.xScale(d.hour() + d.minutes() / 60 + d.seconds() / 60 / 60) - size / 2,
                    y = self.yScale(new Date(d.year(), d.month(), d.date())) + size * order,
                    x2 = x + size / 2,
                    y2 = y - size / 2;
                return "M " + x + " " + y + " h " + size + " M " + x2 + " " + y2 + " v " + size;
            })
            .attr("stroke", function(d, i){
                if (d.type == undefined) {
                    return color1;
                } else {
                    return (d.type == "like") ? color2 : color1;
                }
            })
            .attr("stroke-width", 1);
    }
}

var top = {
    list: function(type) {
        var self = this;
        // db.looked.orderBy('duration')
        db.looked.filter(function(item) {
            return item.posters[0].type == type;
        }).toArray(function(arr) {
            var output = _(arr)
                .groupBy('posters[0].name')
                .map((v, k) => ({
                    name: k,
                    duration: _.sumBy(v, 'duration')
                })).value(),
                ordered = _.orderBy(output, ['duration'], ['desc']),
                capped = _.take(ordered, 10);
            console.log(capped);
            $("#top-" + type + "-container .container-title").append(" (of " + ordered.length + ")");
            self.fillList(type, capped);
        });
    },
    fillList: function(type, list) {
        var html = "";
        for (var i = 0; i < list.length; i++) {
            html += '<span class="looked-text">' + list[i].duration + '</span>\t' + list[i].name + '<br>';
        };
        $("#top-" + type).append(html);
    }
}


var main = {
    userInfo: function() {
        var totalTimeSpent = 0,
            first = 0,
            now = moment();
        since = "";
        db.timespent.toArray(function(timespentArr) {
            for (var i = 0; i < timespentArr.length; i++) {
                var a = moment(timespentArr[i]["stop"]);
                var b = moment(timespentArr[i]["start"]);
                totalTimeSpent += a.diff(b, 'minutes', true);
                var startToNow = now.diff(b);
                if (startToNow > first) {
                    first = startToNow;
                    since = b.format("MMM-DD-YY");
                }
                var total = _.round(totalTimeSpent);
                total = (total > 60) ? _.round(total/60, 2) + " hours (since " + since + ")" : total + " minutes (since " + since + ")";
                $("#total-time-spent").text(total);
                if (i == timespentArr.length - 1) {
                    $("#last-session").text(moment(timespentArr[i]["stop"]).fromNow());
                }
            }
        });
        chrome.storage.local.get(null, function(res) {
            if (res.dsUser) {
                $("#status img").attr("src", res.dsUser.profilePic.dataUri);
                $("#user a").attr("href", res.dsUser.profileLink).text(res.dsUser.userName);
            }
        });
    },
    initDB: function() {
        db = new Dexie("DataSelfieLocalDB");
        db.version(1).stores(dbstores);
        db.open().catch(function(err) {
            console.log("%c[DB][<<] error", helper.clog.magenta);
            console.error(err.stack || err);
        }).finally(function() {
            console.log("%c[DB][<<] opened", helper.clog.magenta);
            activity.plot();
            main.userInfo();
            top.list("user");
            top.list("page");
        });
    },
}



$(document).ready(function() {
    main.initDB();
});
