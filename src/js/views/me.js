// This file is part of Data Selfie.

// Data Selfie is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// any later version.

// Data Selfie is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Data Selfie.  If not, see <http://www.gnu.org/licenses/>.

require("../../css/main.scss");
var helper = require("./me_helpers.js"),
    dbstores = require("../dbstores.js"),
    apiThreshold = require("../api-threshold.js"),
    apiUrl = "http://api.dataselfie.it/",
    //////////////////////////////////////////////////////////////////////////
    // DEV SERVER, also need to add it to permissions
    // apiUrl = "http://localhost:3000/",
    db,
    d3 = require("d3"),
    body = $("body");

// consumption-vis
var activity = {
    bodyW: window.innerWidth,
    w: $("#consumption-vis").width() - 10, // for padding
    h: 0,
    pad: 20,
    lpad: 120,
    bpad: 0,
    timespan: 7, // how many days for chart
    dayChange: 0,
    elSize: 10,
    svg: undefined,
    yScale: undefined,
    xScale: undefined,
    tooltip: undefined,
    plot: function() {
        var self = this;
        this.h = this.elSize * 5 * this.timespan + this.bpad;

        this.svg = d3.select("#consumption-vis")
            .append("svg")
            .attr("width", this.w)
            .attr("height", this.h);

        this.xScale = d3.scaleLinear().domain([0, 24])
            .range([this.lpad - this.pad + 10, this.w]); // need w minus for last label

        var xAxis = d3.axisBottom(this.xScale)
            .ticks(24)
            .tickFormat(function(d) {
                if (d == 0) {
                    return "12am";
                } else if (d == 12) {
                    return "12pm";
                } else if (d == 24) {
                    return "";
                } else {
                    return d % 12;
                }
            })
            .tickSize(6);

        this.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0, " + (this.h - this.pad + this.bpad) + ")")
            .call(xAxis);

        this.getMinDate = function() {
            return moment().subtract(self.dayChange + self.timespan, "days").startOf('day').toDate();
        }

        this.getMaxDate = function(real) {
            // hack: add day to have a space buffer for showing data
            return moment().subtract(self.dayChange, "days").add(1, "days").startOf('day').toDate();
        }

        var mindate = this.getMinDate(),
            maxdate = this.getMaxDate();

        this.yScale = d3.scaleTime().domain([mindate, maxdate]).range([this.pad, this.h - this.pad]);

        var weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        var yAxis = d3.axisLeft(this.yScale)
            .ticks(this.timespan)
            .tickFormat(function(d, i) {
                if (i == self.timespan + 1) {
                    return "";
                } else {
                    var day = weekday[moment(d).day()];
                    return moment(d).format("MMM-DD-YY") + ", " + day + " ";
                }
            })
            .tickSize(0)
            .tickPadding(6);

        this.svg.append("g")
            .attr("class", "y axis")
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

        this.tooltip = d3.select("#consumption-vis").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        function populateData() {
            function timeDiff(item) {
                var a = moment(self.getMaxDate()),
                    b = moment(self.getMinDate()),
                    dString = moment.parseZone(item.timestamp).format("MMM-DD-YY hh:mm:sa"),
                    betw = moment(dString, "MMM-DD-YY hh:mm:sa").isBetween(b, a, null, []);
                // diff should be positive and max the timespan to show in graph
                return betw;
            };

            db.looked.filter(timeDiff).toArray(function(lookedArr) {
                self.addPoints("elLooked", lookedArr, "#00FF80", "", 0);
            });
            db.clicked.filter(timeDiff).toArray(function(clickedArr) {
                self.addPoints("elClicked", clickedArr, "#0080FF", "#19E8FF", 1);
            });
            db.typed.filter(timeDiff).toArray(function(typedArr) {
                self.addPoints("elTyped", typedArr, "#FFFF00", "", 2);
            });
        }

        this.pointG = this.svg.append("g");
        populateData();

        function update(change) {
            var days = Math.abs($("#days-increment").val());
            if (change === "prev-day") {
                self.dayChange += days;
            } else {
                self.dayChange -= days;
            }
            var mindate = self.getMinDate(),
                maxdate = self.getMaxDate();
            self.yScale.domain([mindate, maxdate]);
            self.svg.select(".y").call(yAxis);

            populateData();
        }

        $(".update-activity").click(function(e) {
            update(e.target.id);
        });

        $("#days-increment").change(function(e) {
            if (e.target.value < 1) {
                e.target.value = 1;
            }
        })

    },
    addPoints: function(classname, array, color1, color2, order) {
        var class_selector = "." + classname,
            self = this;
        var points = this.pointG.selectAll(class_selector).data(array);
        points.exit().remove();
        points.enter()
            .append("path")
            .merge(points)
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
            .attr("stroke", function(d, i) {
                if (d.type == undefined) {
                    return color1;
                } else {
                    return (d.type == "like") ? color1 : color2;
                }
            })
            .on("mouseover", function(d) {
                var offset = (d3.event.pageX > (self.bodyW - 200)) ? 210 : 0;
                self.tooltip.transition()
                    .duration(20)
                    .style("opacity", .9);
                var target = d3.event.target.classList.value,
                    text = "",
                    time = "(" + moment.parseZone(d.timestamp).format("MMM-DD-YY hh:mm:sa") + ")";
                if (target == "elLooked") {
                    text = d.postActivity + "\n" + d.postDesc[0] + "...\n" + time;
                } else if (target == "elClicked") {
                    text = d.url + "\n" + time;
                } else {
                    text = d.content + "\n" + time;
                }
                self.tooltip.text(text)
                    .style("left", (d3.event.pageX - offset) + "px")
                    .style("top", (d3.event.pageY - 100) + "px");
            })
            .on("mouseout", function(d) {
                self.tooltip.transition()
                    .duration(50)
                    .style("opacity", 0);
            });

    }
}

var topList = {
    title: function(type, len) {
        var limit = _.min([len, 10]);
        $("#top-" + type + "-container .container-title span").text(" (" + limit + " of " + len + ")");

    },
    list: function(type) {
        $("#top-" + type + " .error").empty();
        var self = this;
        db.looked.filter(function(item) {
            return item.posters[0].type == type;
        }).toArray(function(arr) {
            // http://stackoverflow.com/a/38774930
            var modArr = _(arr)
                .groupBy('posters[0].name')
                .map(function(k, v) {
                    return {
                        name: v,
                        duration: _.sumBy(k, 'duration')
                    }
                })
                .orderBy(['duration'], ['desc']).value();
            var capped = _.take(modArr, 10);
            console.log("%c" + type, helper.clog.green, modArr, capped);
            if (type == "user") {
                var all = _.uniqBy(arr, "posters[0].name").length;
                self.title(type, all);
            }
            if (capped.length > 0) {
                self.fillList(type, capped);
            } else {
                $("#top-" + type)
                    .append($("<p>", { class: "error" })
                        .text("No activity tracked yet.")
                        .css("display", "block"));
            }
        });
    },
    fillList: function(type, list) {
        for (var i = 0; i < list.length; i++) {
            var perc = _.round(list[i].duration / list[0].duration, 2) * 100,
                rest = 100 - perc;
            $("#top-" + type)
                .append($("<span>", { class: "looked-text tab" }).text(list[i].duration))
                .append($("<span>").text(list[i].name))
                .append($("<br>"))
                .append($("<div>", { class: "line" }).css("width", perc + "%"))
                .append($("<div>", { class: "line-dashed" }).css("width", rest + "%"));
        };
    },
    likes: function() {
        $("#top-like .error").empty();
        var likes = [],
            orderedLikes = [],
            errMsg = function() {
                $("#top-like")
                    .append($("<p>", { class: "error" })
                        .text("No activity tracked yet.")
                        .css("display", "block"));
            };
        db.clicked.filter(function(item) {
            return item.type == "like" && (item.url.indexOf("/posts/") > -1 || item.url.indexOf("/photos/") > -1 || item.url.indexOf("/videos/") > -1);
        }).each(function(like) {
            var path = _.split(like.url, "/", 2);
            likes.push({ path: path[1] });
        }).then(function() {
            orderedLikes = _(likes)
                .countBy("path")
                .map(function(count, path) {
                    return { count: count, path: path }
                })
                .sortBy('count')
                .reverse()
                .value();
            return orderedLikes;
        }).then(function() {
            console.log("%clike", helper.clog.blue, orderedLikes);
            if (orderedLikes.length > 0) {
                var len = _.min([orderedLikes.length, 10]),
                    i = 0,
                    addLike = function(i) {
                        db.looked.where("postUrl").startsWith("/" + orderedLikes[i].path).first(function(entry) {
                            var perc = _.round(orderedLikes[i].count / orderedLikes[0].count, 2) * 100,
                                rest = 100 - perc,
                                pName = (entry) ? entry.posters[0].name : orderedLikes[i].path;
                            $("#top-like")
                                .append($("<span>", { class: "clicked-like-text tab" }).text(orderedLikes[i].count))
                                .append($("<span>").text(pName))
                                .append($("<br>"))
                                .append($("<div>", { class: "line" }).css("width", perc + "%"))
                                .append($("<div>", { class: "line-dashed" }).css("width", rest + "%"));
                            i++;
                            if (i < len) {
                                addLike(i);
                            } else {
                                $("#top-like-container .container-title span").text(" (" + len + " of " + orderedLikes.length + ")");
                            }
                        });
                    };
                addLike(i);
            } else {
                errMsg()
            }
        }).catch(function(err) {
            console.log("Likes count error: " + err);
            errMsg();
        });
    }
}

var nlpList = {
    list: function(data, name) {
        $("#" + name + "-container .Rtable").empty();
        _.each(_.take(data, 10), function(item) {
            var categoriesArr = item.label.split("/");
            $("#" + name + "-container .Rtable")
                .append($("<div>", { class: "cell looked-text" }).text(_.round(item.score, 2)))
                .append($("<div>", { class: "cell" }).text(categoriesArr[1] + " /") // because [0] = ""
                    .append($("<p>").text(_.takeRight(categoriesArr, categoriesArr.length - 2).join(" / ")))
                );
        });
    },
    sentList: function(data, name) {
        $("#" + name + "-container .Rtable").empty();
        _.each(_.take(data, 10), function(item) {
            var sentScore = (item.sentiment) ? _.round(item.sentiment.score, 2) : "&#177;0.00",
                label = (item.sentiment) ? item.sentiment.label : "";
            sentScore = (item.sentiment > 0) ? "+" + sentScore : sentScore;
            $("#" + name + "-container .Rtable")
                .append($("<div>", { class: "cell looked-text" }).text(_.round(item.relevance, 2)))
                .append($("<div>", { class: "cell" }).text(sentScore))
                .append($("<div>", { class: "cell" }).text(label))
                .append($("<div>", { class: "cell" }).text(item.text + " ")
                    .append($("<span>").text("(" + item.type + ")").css("color", "#999"))
                );
        });
    },
}

var oceanPlot = function(dataIBM, dataAMS) {
    console.log("%cbig 5", helper.clog.yellow, dataIBM);
    console.log("%cbig 5", helper.clog.green, dataAMS);
    $("#ocean-vis").empty();
    // SETUP
    w = $("#ocean-vis").width(),
        h = 260,
        pad = 20,
        lpad = 210,
        elSize = 8;

    var svg = d3.select("#ocean-vis")
        .append("svg")
        .attr("width", w)
        .attr("height", h);

    var xScale = d3.scaleLinear().domain([0, 100])
        .range([lpad - pad + 5, w - lpad]); // -lpad

    var xAxis = d3.axisBottom(xScale)
        .ticks(3)
        .tickFormat(function(d, i) {
            if (i == 1) {
                return "average";
            } else if (i == 2) {
                return "100th percentile";
            } else {
                return "0 percentile"
            }
        })
        .tickSize(6);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + (h - pad) + ")")
        .call(xAxis);

    var yScale = d3.scaleLinear().domain([0, 5]).range([pad, h - pad]);

    var leftLabels = ["conservative + traditional", "impulsive + spontaneous", "contemplative", "competitive", "laid back + relaxed", ""];
    var yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(function(d, i) {
            return leftLabels[i];
        })
        .tickSize(0)
        .tickPadding(6);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + (lpad - pad) + ", 0)")
        .call(yAxis);

    var rightLabels = ["liberal + artistic", "organized + hard working", "engaged w/ outside world", "team working + trusting", "easily stressed + emotional", ""];
    var y2Axis = d3.axisRight(yScale)
        .ticks(5)
        .tickFormat(function(d, i) {
            return rightLabels[i];
        })
        .tickSize(0)
        .tickPadding(6);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + (w - lpad + 5) + ", 0)")
        .call(y2Axis);

    var grid = svg.append("g");
    for (var i = 0; i <= 5; i++) {
        grid.append("line")
            .attr("class", "gridline")
            .attr("x1", xScale(0))
            .attr("y1", yScale(i))
            .attr("x2", xScale(100))
            .attr("y2", yScale(i));
    }

    var oceanLabels = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Emotional range", ""];
    svg.append("g").selectAll(".label")
        .data(oceanLabels)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", function(d) {
            return xScale(50);
        })
        .attr("y", function(d, i) {
            return yScale(i) + 20;
        })
        .text(function(d, i) {
            return oceanLabels[i];
        });

    var tooltip = d3.select("#ocean-vis").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // SETUP END
    if (dataIBM.length == 5) {
        svg.append("g").selectAll(".ibmocean")
            .data(dataIBM)
            .enter()
            .append("path")
            .attr("class", "ibmocean point")
            .attr("d", function(d, i) {
                var size = elSize,
                    x = xScale(_.round(d.percentile, 2) * 100) - size / 2,
                    y = yScale(i),
                    x2 = x + size / 2,
                    y2 = y - size / 2;
                return "M " + x + " " + y + " h " + size + " M " + x2 + " " + y2 + " v " + size;
            });
    }

    if (dataAMS.length == 5) {
        svg.append("g").selectAll(".amsocean")
            .data(dataAMS)
            .enter()
            .append("path")
            .attr("class", "amsocean point")
            .attr("d", function(d, i) {
                var size = elSize,
                    x = xScale(_.round(d.value, 2) * 100) - size / 2,
                    y = yScale(i),
                    x2 = x + size / 2,
                    y2 = y - size / 2;
                return "M " + x + " " + y + " h " + size + " M " + x2 + " " + y2 + " v " + size;
            });
    }

    svg.selectAll(".point")
        .on("mouseover", function(d) {
            tooltip.transition()
                .duration(20)
                .style("opacity", .9);
            var target = d3.event.target.classList.value;
            var text = "";
            if (target.indexOf("ibmocean") > -1) {
                text = "based on what \nyou typed";
            } else {
                text = "based on what \nyou looked at";
            }
            tooltip.text(text)
                .style("left", d3.event.layerX + 20 + "px")
                .style("top", d3.event.layerY + 0 + "px")
                .style("width", "110px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .delay(400)
                .duration(100)
                .style("opacity", 0);
        });
}

var religionList = function(rels) {
    console.log("%creligion", helper.clog.green, rels);
    $("#religion-chart").empty();
    _.each(_.orderBy(rels, "trait"), function(item) {
        var val = _.round(item.value * 100, 0);
        var label = (item.trait.indexOf("Other") > -1) ? "Christian \n+ Other" : _.replace(item.trait, "Religion_", "");
        $("#religion-chart")
            .append($("<li>", { class: "bar-6" })
                .append($("<div>")
                    .append($("<div>").css("height", val + "%"))
                )
                .append($("<p>")
                    .append($("<span>", { class: "looked-text" }).text(val + " %"))
                )
                .append($("<p>").text(label))
            );
    })
}

var politicsList = function(pols) {
    console.log("%cpolitics", helper.clog.green, pols);
    $("#politics-chart").empty();
    _.each(_.orderBy(pols, "trait"), function(item) {
        var val = _.round(item.value * 100, 0);
        var label = _.replace(item.trait, "Politics_", "");
        label = label === "Libertanian" ? "Libertarian" : label;
        $("#politics-chart")
            .append($("<li>", { class: "bar-4" })
                .append($("<div>")
                    .append($("<div>").css("height", val + "%"))
                )
                .append($("<p>")
                    .append($("<span>", { class: "looked-text" }).text(val + " %"))
                )
                .append($("<p>").text(label))
            );
    })
}

var consumptionPrefList = function(prefs) {
    $("#shopping-container .Rtable").empty();
    var shopping = _(prefs).filter(function(item) {
        return _.includes(item.consumption_preference_category_id, "shopping");
    }).map("consumption_preferences").flatten().each(function(item) {
        if (item.name.indexOf("automobiles") == -1) {
            var likelyText = (item.score == 1) ? "Likely to " : "Not likely to ";
            $("#shopping-container .Rtable")
                .append($("<div>", { class: "typed-text cell" }).text(likelyText))
                .append($("<div>", { class: "cell" }).text(_.replace(item.name, "Likely to ", "")));
        }
    });
    $("#health-container .Rtable").empty();
    var health = _(prefs).filter(function(item) {
        return _.includes(item.consumption_preference_category_id, "health") || _.includes(item.consumption_preference_category_id, "entrepreneurship") || _.includes(item.consumption_preference_category_id, "environment");
    }).map("consumption_preferences").flatten().each(function(item) {
        var likelyText = (item.score == 1) ? "Likely to " : "Not likely to ";
        $("#health-container .Rtable")
            .append($("<div>", { class: "typed-text cell" }).text(likelyText))
            .append($("<div>", { class: "cell" }).text(_.replace(item.name, "Likely to ", "")));
    });
}

var otherPredList = function(preds, interoprets) {
    var otherPredContainer = $("#other-predictions-container .Rtable");
    otherPredContainer.empty();
    var intelligent = _.find(preds, { "trait": "Intelligence" });
    otherPredContainer.append($("<div>", { class: "looked-text cell" }).text(_.round(intelligent.value * 100, 0) + "th percentile"))
        .append($("<div>", { class: "cell" }).text(intelligent.trait));

    var satisfied = _.find(preds, { "trait": "Satisfaction_Life" });
    otherPredContainer.append($("<div>", { class: "looked-text cell" }).text(_.round(satisfied.value * 100, 0) + "th percentile"))
        .append($("<div>", { class: "cell" }).text("Life Satisfaction"));

    var female = _.find(preds, { "trait": "Female" });
    var prob = (female.value >= 0.5) ? _.round(female.value * 100, 0) : _.round((1 - female.value) * 100, 0);
    var gender = (female.value >= 0.5) ? "Female" : "Male";
    otherPredContainer.append($("<div>", { class: "looked-text cell" }).text(prob + "%"))
        .append($("<div>", { class: "cell" }).text(gender + " \n(psychological gender)"));

    var leadership = _.find(interoprets, { "trait": "Leadership" });
    otherPredContainer.append($("<div>", { class: "looked-text cell" }).text(_.round(leadership.value * 100, 0) + "%"))
        .append($("<div>", { class: "cell" }).text(leadership.trait));

}

var constructSummary = function(a, b, c, d, e, f) {
    var alist = [" a laid back", " an easily stressed"];
    var blist = [", liberal", ", conservative", ", libertarian", ", not political"];
    var clist = [" female", " male"];
    var dlist = ["", " who doesn't eat out frequently", " who eats out frequently"];
    var elist = ["", " doesn't prefer style when buying clothes", " prefers style when buying clothes"];
    var flist = [" less satisfied in life than most", " more satisfied in life than most"];
    var ibm = "";
    var satisfied = flist[f];

    if (d == 0 && e == 0) {
        satisfied = " who is" + satisfied;
    } else if (d == 0 && e != 0) {
        ibm = " who" + elist[e];
        satisfied = " and is" + satisfied;
    } else if (d != 0 && e == 0) {
        ibm = dlist[d];
        satisfied = " and is" + satisfied;
    } else { // d and e != 0
        ibm = dlist[d] + " and" + elist[e];
        satisfied = " and is" + satisfied;
    }

    return 'You\'re' + alist[a] + blist[b] + clist[c] + ibm + satisfied + '';
}

var loadPredictions = function(key) {
    var noPrediction = function(name) {
        $("#" + name + "-container .content")
            .append($("<p>", { class: "error" })
                .text("No analysis could be made.")
                .css("display", "block"));
    }
    chrome.storage.local.get(null, function(res) {
        if (res.alchemy2 && key == "alchemy2") {
            body.find(".alchemy-last span").text(moment(res.alchemy2.lastUpdated).format("MMM-DD-YY"));
            console.log("%cAlchemy Language processing", helper.clog.green, res.alchemy2);
            if (res.alchemy2.predData.categories.length > 0) {
                nlpList.list(res.alchemy2.predData.categories, "categories");
            } else {
                noPrediction("categories");
            };
            if (res.alchemy2.predData.entities.length > 0) {
                nlpList.sentList(res.alchemy2.predData.entities, "entities");
            } else {
                noPrediction("entities");
            }
        }

        if (res.personality && key == "personality") {
            body.find(".personality-last span").text(moment(res.personality.lastUpdated).format("MMM-DD-YY"));
            console.log("%cPersonality prediction", helper.clog.yellow, res.personality);
            consumptionPrefList(res.personality.predData.consumption_preferences);
        }

        if (res.applymagicsauce && key == "applymagicsauce") {
            body.find(".applymagicsauce-last span").text(moment(res.applymagicsauce.lastUpdated).format("MMM-DD-YY"));
            console.log("%cApply Magic Sauce prediction", helper.clog.green, res.applymagicsauce);
            var amsPreds = res.applymagicsauce.predData.predictions;
            var amsReligion = _.filter(amsPreds, function(item) {
                return _.includes(item.trait, "Religion");
            });
            var amsPolitics = _.filter(amsPreds, function(item) {
                return _.includes(item.trait, "Politics");
            });
            religionList(amsReligion);
            politicsList(amsPolitics);
            otherPredList(amsPreds, res.applymagicsauce.predData.interpretations);
            var amsBig5 = _.filter(amsPreds, function(item) {
                return _.includes(item.trait, "BIG5");
            });
            if (res.personality) {
                oceanPlot(res.personality.predData.personality, amsBig5);
            } else {
                oceanPlot([], amsBig5);
            }
        }

        if (key == "reveal") {
            $("#loading").delay(2000).hide(function() {
                // have any kind of prediction!
                if (res.applymagicsauce || res.personality || res.alchemy2) {
                    $("#the-cool-stuff").animate({ opacity: 1 }, 500);
                    $("#usage-message").delay(200).hide();
                    $("#the-good-stuff").delay(200).css('position', 'relative').animate({ opacity: 1 }, 200);
                    if (res.applymagicsauce) {
                        if (res.personality) {
                            var shop = res.personality.predData.consumption_preferences[0].consumption_preferences;
                            var style = _.filter(shop, function(n) { return n.consumption_preference_id.indexOf("consumption_preferences_clothes_style") > -1; });
                            var health = res.personality.predData.consumption_preferences[1].consumption_preferences;
                            var eat = _.filter(health, function(n) { return n.consumption_preference_id.indexOf("consumption_preferences_eat_out") > -1; });
                            // 1 is not likely, 2 is likely in share array
                            var styleScore = style[0].score + 1;
                            var eatScore = eat[0].score + 1;
                        } else {
                            var styleScore = 0;
                            var eatScore = 0;
                        }

                        var amspreds = res.applymagicsauce.predData.predictions;
                        var politics = _.chain(amspreds)
                            .filter(function(n) { return n.trait.indexOf("Politics") > -1; })
                            .sortBy('value')
                            .reverse()
                            .value()[0].trait.toLowerCase();
                        if (politics.indexOf("liberal") > -1) {
                            var politcsIndex = 0;
                        } else if (politics.indexOf("conservative") > -1) {
                            var politcsIndex = 1;
                        } else if (politics.indexOf("libertanian") > -1) {
                            var politcsIndex = 2;
                        } else {
                            var politcsIndex = 3;
                        }

                        var neurotI = _.find(amspreds, function(o) { return o.trait == 'BIG5_Neuroticism'; }),
                            genderI = _.find(amspreds, function(o) { return o.trait == 'Female'; }),
                            satisI = _.find(amspreds, function(o) { return o.trait == 'Satisfaction_Life'; });

                        var a = neurotI.value < 0.5 ? 0 : 1,
                            b = politcsIndex,
                            c = genderI.value < 0.5 ? 1 : 0,
                            d = styleScore,
                            e = eatScore,
                            f = satisI.value < 0.5 ? 0 : 1;
                        var seq = "a" + a + "b" + b + "c" + c + "d" + d + "e" + e + "f" + f;
                        console.log(neurotI, politics, genderI, style[0], eat[0], satisI, seq);
                        var sentence = constructSummary(a, b, c, d, e, f);
                        $("#summary-text").text(sentence);

                        var initFBDone = false;
                        var fburl = 'https://dataselfie.it/my/' + seq + '?share';
                        var twurl = 'https://twitter.com/intent/tweet?text="' + sentence + '"&via=dataselfie&url=https://dataselfie.it';
                        $("#fbshare").attr("href", fburl);
                        $("#twshare").attr("href", twurl);

                        $("#summary-text-row").fadeIn();
                        $("#social-share").fadeIn();
                    }

                } else {
                    $("#usage-message").delay(200).show();
                }
                this.apiDone = false;
            });
        }
    });
};

var loadImgClassifications = function() {
    body.find(".yolo-last span").text(moment().format("MMM-DD-YY"));
    var fillImgList = function(capped) {
        for (var i = 0; i < capped.length; i++) {
            var perc = _.round(capped[i].count / capped[0].count, 2) * 100,
                rest = 100 - perc;
            $("#yolo-pred")
                .append($("<span>", { class: "looked-text tab" }).text(capped[i].count))
                .append($("<span>").text(capped[i].cclass))
                .append($("<br>"))
                .append($("<div>", { class: "line" }).css("width", perc + "%"))
                .append($("<div>", { class: "line-dashed" }).css("width", rest + "%"));
        };
    }
    db.transaction("r", db.looked, function() {
        db.looked.toArray(function(arr) {
            return _(arr)
                .filter(function(o) { return o.predImg })
                .filter(function(o) { return o.predImg.pred !== null })
                .uniqBy('postImg')
                .value();
        }).then(function(validImgs) {
            var imgPredThreshold = 0.5;
            $("#img-pred-threshold").text("\nshown classifications have a probability of >= " + imgPredThreshold);
            var classes = _(validImgs)
                .map('predImg')
                .map('pred')
                .flatten()
                .filter(function(o) { return o.prob >= imgPredThreshold })
                .map('class')
                .value();
            $("#still-loading").hide();
            if (validImgs.length > 0) {
                var sortedClasses = _(classes)
                    .countBy()
                    .map(function(count, cclass) {
                        return {
                            count: count,
                            cclass: cclass
                        }
                    })
                    .sortBy('count').reverse()
                    .value();
                var capped = _.take(sortedClasses, 10);
                fillImgList(capped);
                $("#valid-imgs").text("(" + validImgs.length + " valid) ");
            } else {
                body.find(".yolo-content p.error").text("Unfortunately, there are no valid images that can be analyzed.").show();
            }
            console.log("%cobject detection", helper.clog.green, validImgs.length + " valid imgs", sortedClasses, capped);
        });
    });
}

var apis = {
    fired: {
        // 1 = data is prepared, 2 = request fired/done
        // goal = all are 2
        "alchemy2": 0,
        "personality": 0,
        "applymagicsauce": 0
    },
    apiErrors: 0,
    apiDone: false,
    checkApisDone: function(msg) {
        if (msg === "error") {
            this.apiErrors++;
            if (this.apiErrors == 3) {
                // if all APIs have error
                $("#server-err").show();
            }
        } else if (msg === "notenough") {
            $("#not-enough").show();
        }
        var values = _.values(this.fired);
        console.log("APIs in progress", values, _.uniq(values));
        // when all APIs fired status is 2
        if (_.uniq(values).length == 1 && _.uniq(values)[0] == 2) {
            this.apiErrors = 0;
            this.apiDone = true;
            loadPredictions("alchemy2");
            loadPredictions("personality");
            loadPredictions("applymagicsauce");
            loadPredictions("reveal");
        }
    },
    postReq: function(endpoint, data, callback) {
        var self = this;
        $.ajax({
                method: "POST",
                url: apiUrl + endpoint,
                contentType: "application/json",
                data: JSON.stringify(data)
            })
            .done(function(msg, obj) {
                console.log("API response", endpoint, msg);
                switch (endpoint) {
                    case "alchemy2":
                        chrome.storage.local.set({
                            "alchemy2": msg
                        }, function() {
                            self.checkApisDone();
                        });
                        break;
                    case "personality":
                        chrome.storage.local.set({
                            "personality": msg
                        }, function() {
                            self.checkApisDone();
                        });
                        break;
                    case "applymagicsauce":
                        chrome.storage.local.set({
                            "applymagicsauce": msg
                        }, function() {
                            self.checkApisDone();
                        });
                        break;
                    case "yolo":
                        callback(msg);
                        break;
                }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                chrome.storage.local.get(endpoint, function(res) {
                    if (res[endpoint] == undefined) {
                        var predContainer = body.find("." + endpoint + "-content p.error"),
                            statusInfo = (jqXHR.responseJSON) ? ": " + jqXHR.responseJSON.statusInfo : "",
                            language = (jqXHR.responseJSON) ? " " + jqXHR.responseJSON.language : "",
                            text = 'Sorry, there has been an server error ';
                        if (jqXHR.status == 413) {
                            statusInfo = ": Data too large. Please email support@dataselfie.it";
                        }
                        switch (endpoint) {
                            case "alchemy2":
                                text += '(' + jqXHR.status + helper.replaceAll(statusInfo, "-", " ") + language + ').';
                                break;
                            case "personality":
                                text += '(' + jqXHR.status + helper.replaceAll(statusInfo, "-", " ") + ').';
                                break;
                            case "applymagicsauce":
                                text += '(' + jqXHR.status + helper.replaceAll(statusInfo, "-", " ") + ').';
                                break;
                            case "yolo":
                                text += '(' + jqXHR.status + helper.replaceAll(statusInfo, "-", " ") + ').';
                                break;
                        };
                        predContainer.text(text).show();
                    }
                });
                if (endpoint !== "yolo") {
                    self.checkApisDone("error");
                } else {
                    $("#still-loading").hide();
                }
            })
            .always(function(jqXHR, textStatus) {
                if (endpoint !== "yolo") {
                    self.fired[endpoint] = 2; // new request done
                    var reqStatus = jqXHR ? jqXHR.status : jqXHR;
                    console.log("API status", endpoint, reqStatus, textStatus);
                    self.checkApisDone();
                }
            });
    },
    newCall: function(key, newlength, callback) {
        var self = this;
        var threshold = apiThreshold[key];
        chrome.storage.local.get(key, function(res) {
            var last = (!res[key]) ? moment() : moment(res[key].lastUpdated);
            var now = moment();
            var diffLength = (!res[key]) ? newlength : newlength - res[key].dataLength;
            // if data older than 5 days, difference from prev data not 0, applymagicsauce likes more than 15
            // OR if difference from prev data at least threshold, applymagicsauce likes more than 15
            if ((now.diff(last, "days") > 5 && diffLength != 0 && newlength > 15) || (diffLength >= threshold && newlength > 15)) {
                console.log("Yes API call. Enough new content or enough time passed since last call.", key, diffLength, ">", threshold);
                callback();
            } else {
                console.log("No API call. Not enough new content.", key, diffLength, "<", threshold);
                self.fired[key] = 2; // API done because no new request
                self.checkApisDone("notenough");
            }
        });
    },
    truncate: function(str, max) {
        var strArr = str.split(" $+-+$ "),
            trunced = "";
        if (strArr.length > max) {
            // take the last posts according to value of max
            trunced = strArr.slice(strArr.length - 1 - max, strArr.length - 1).join(" ");
        } else {
            trunced = strArr.join(" ");
        }
        return trunced;
    },
    prepareAlchemyCall: function() {
        var self = this,
            desc = "",
            arrLength,
            truncDesc,
            origLen,
            cleanDesc,
            truncSize;
        db.looked.toArray(function(arr) {
            arrLength = arr.length;
            for (var i = 0; i < arrLength; i++) {
                desc += _.join(arr[i].postDesc, " ") + " " + _.join(arr[i].origDesc, " ") + " $+-+$ ";
            }
        }).then(function() {
            cleanDesc = helper.replaceAll(desc, " $+-+$ ", " ");
            origLen = cleanDesc.split(" ").length;
            // loop to limit to 10K chars max
            var lessText = function() {
                truncDesc = self.truncate(desc, arrLength);
                truncSize = truncDesc.length;
                if (truncSize > 10000) {
                    arrLength -= 1;
                    lessText();
                } else {
                    return;
                }
            };
            lessText();
        }).finally(function() {
            console.log("%clooked descriptions", helper.clog.green, truncSize, "characters,", truncDesc.split(" ").length, "words sent of total", desc.length, "characters", origLen, "words\n", cleanDesc);
            // sending over the original length
            // but make prediction based on truncated/most recent data
            self.newCall("alchemy2", origLen, function() {
                self.fired.alchemy2 = 1;
                var escapedDesc = truncDesc.replace(/"/g, '\\"');
                self.postReq("alchemy2", { "desc": escapedDesc, "length": origLen });
            });

        });
    },
    preparePersonalityCall: function() {
        var self = this,
            arrLength,
            truncTyped,
            origLen,
            cleanTyped,
            truncSize;
        db.typed.toArray(function(arr) {
            arrLength = arr.length;
            return _(arr).map("content").join(" $+-+$ ");
        }).then(function(typed) {
            cleanTyped = helper.replaceAll(typed, " $+-+$ ", " ");
            origLen = cleanTyped.split(" ").length;
            // loop to limit byte size of 80K
            var lessText = function() {
                truncTyped = self.truncate(typed, arrLength);
                truncSize = helper.getByteSize(truncTyped);
                // console.log(typed, truncTyped, truncSize, arrLength);
                if (truncSize > 80000) {
                    arrLength -= 10;
                    lessText();
                } else {
                    return;
                }
            };
            lessText();
        }).finally(function() {
            console.log("%ctyped content", helper.clog.yellow, truncSize, "bytes,", truncTyped.split(" ").length, "words sent of total", origLen, "words\n", cleanTyped);
            self.newCall("personality", origLen, function() {
                self.fired.personality = 1;
                var escapedTyped = truncTyped.replace(/"/g, '\\"');
                self.postReq("personality", { "typed": escapedTyped, "length": origLen });
            });
        });
    },
    prepareApplyMagicSauceCall: function() {
        var self = this;
        db.looked.toArray(function(arr) {
            // this includes pages whose posts you see directly or through shares of others
            return _(arr).map('posters').flatten().filter({ type: "page" }).map('id').flatten().uniq().value();
        }).then(function(likeids) {
            topList.title("page", likeids.length);
            console.log("%cfacebook pages ids", helper.clog.green, likeids);
            self.newCall("applymagicsauce", likeids.length, function() {
                self.fired.applymagicsauce = 1;
                self.postReq("applymagicsauce", { "likeids": likeids });
            });
        });
    },
    prepareYoloCall: function() {
        var self = this;
        $("#still-loading").show();
        db.looked.toArray(function(arr) {
            return _.filter(arr, function(o) {
                return o.postImg !== undefined;
            });
        }).then(function(allImgPosts) {
            var allImgUrls = _(allImgPosts)
                .map('postImg')
                .uniq()
                .value();
            console.log("%cimages from posts you looked at", helper.clog.green, allImgUrls);
            $("#total-urls").text("(of " + allImgUrls.length + " in total) ");

            var withoutPred = _(allImgPosts)
                .filter(function(o) {
                    return o.predImg === undefined;
                })
                .map('postImg')
                .uniq()
                .value();
            if (withoutPred.length > 0) {
                console.log("Yes API call. New image urls. yolo ", withoutPred.length)
                self.newYoloCalls(withoutPred, withoutPred.length);
            } else {
                loadImgClassifications();
            }
        });
    },
    newYoloCalls: function(allUrls, index) {
        var self = this;
        var size = 50,
            start = index,
            end = _.max([(index - size), 0]);
        self.postReq("yolo", { "urls": _.slice(allUrls, end, start) }, function(msg) {
            for (var i = msg.predData.length - 1; i >= 0; i--) {
                self.saveYoloPred(msg.predData[i].url, msg.predData[i])
            }
            if ((start - size) > 0) {
                self.newYoloCalls(allUrls, start - size);
            } else {
                loadImgClassifications();
            }
        });
    },
    saveYoloPred: function(currentUrl, predImg) {
        db.transaction("rw", db.looked, function() {
            db.looked.where("postImg").equals(currentUrl).modify({ predImg: predImg });
        });
    },
    checkApplyMagicSaucePred: function() {
        chrome.storage.local.get("applymagicsauce", function(res) {
            if (res.applymagicsauce != undefined && res.applymagicsauce.predData.predictions == undefined) {
                console.log("applymagicsauce does not contain predictions, delete from local.storage");
                chrome.storage.local.remove(["applymagicsauce"]);
            }
        });
    }
}

var main = {
    userInfo: function() {
        var totalTimeSpent = 0,
            first = 0,
            now = moment();
        since = "";
        db.timespent.orderBy("start").toArray(function(timespentArr) {
            for (var i = 0; i < timespentArr.length; i++) {
                var a = moment(timespentArr[i]["stop"]); // later
                var b = moment(timespentArr[i]["start"]); // earlier
                totalTimeSpent += a.diff(b, 'minutes', true);
                var startToNow = now.diff(b);
                if (startToNow > first) {
                    first = startToNow;
                    since = b.format("MMM-DD-YY");
                }
                var total = _.round(totalTimeSpent);
                total = (total > 60) ? _.round(total / 60, 2) + " hours (since " + since + ")" : total + " minutes (since " + since + ")";
                $("#total-time-spent").text(total);
                if (i == timespentArr.length - 1) {
                    $("#last-session").text(moment(timespentArr[i]["stop"]).fromNow());
                }
            }
        });
        chrome.storage.local.get("dsUser", function(res) {
            if (res.dsUser) {
                $("#status img").first().attr("src", res.dsUser.profilePic.dataUri);
                $("#user a").first().attr("href", res.dsUser.profileLink).text(res.dsUser.userName);
            }
        });
    },
    progressAnimation: function(showAnalysis) {
        $('html, body').css({
            overflow: 'hidden',
            height: '100%'
        });

        $("#days-increment").attr("type", "number");

        $("#progressAnim").stop().animate({
            width: window.innerWidth - 20
        }, {
            duration: 2000,
            specialEasing: {
                easing: "easeOutSine"
            },
        }).animate({ opacity: 1 }, {
            duration: 600,
            complete: function() {
                $(this).hide();
                if (showAnalysis) {
                    if (!apis.apiDone) {
                        $("#loading").show();
                    }
                    $("#the-cool-stuff").animate({ opacity: 1 }, 500);
                    $('html, body').css({
                        overflow: 'auto',
                        height: 'auto'
                    });
                    $("footer").show();
                } else {
                    $("#init-message").show();
                }
            }
        });
    },
    getApiThreshold: function(callback) {
        $.ajax({
                method: "GET",
                url: apiUrl + "api/threshold"
            })
            .done(function(msg) {
                apiThreshold = msg;
                console.log("%cServer call for thresholds.", helper.clog.magenta, apiThreshold);
            })
            .always(callback);
    },
    initDB: function() {
        db = new Dexie("DataSelfieLocalDB");
        db.version(1).stores(dbstores);
        db.open().catch(function(err) {
            console.log("%c[DB][<<] error", helper.clog.magenta);
            console.error(err.stack || err);
        }).finally(function() {
            console.log("%c[DB][<<] opened", helper.clog.magenta);
            main.userInfo();
            db.timespent.toArray(function(arr) {
                // check if db has content
                if (arr.length > 0) {
                    main.progressAnimation(true);
                    // just analyze and visualize
                    activity.plot();
                    topList.list("user");
                    topList.list("page");
                    topList.likes();
                    // previously with status 204, empty data in local storage
                    apis.checkApplyMagicSaucePred();

                    // prepare data and check, if a call needs to be made
                    // FIX double console.log when new prediction for all 3
                    apis.prepareAlchemyCall();
                    apis.preparePersonalityCall();
                    apis.prepareApplyMagicSauceCall();

                    // takes longer, independent from others
                    apis.prepareYoloCall();
                } else {
                    main.progressAnimation(false);
                }
            });
        });
    },
}

$(document).ready(function() {
    main.getApiThreshold(main.initDB);
    console.log("Kaboom. Me page loaded.");
    console.log("%cLegend: all related to your looked content is this color", helper.clog.green);
    console.log("%cLegend: all related to your typed content is this color", helper.clog.yellow);
});