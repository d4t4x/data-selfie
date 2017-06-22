require("../../css/main.scss");
var helper = require("./me_helpers.js"),
    dbstores = require("../dbstores.js"),
    apiThreshold = require("../api-threshold.js"),
    apiUrl = "http://api.dataselfie.it/",
    ////////////////////////////////////////////////////////////// DEV SERVER
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
    lpad: 90,
    timespan: 7, // how many days for chart
    elSize: 8,
    svg: undefined,
    yScale: undefined,
    xScale: undefined,
    tooltip: undefined,
    plot: function() {
        var self = this;
        this.h = this.elSize * 5 * this.timespan;

        this.svg = d3.select("#consumption-vis")
            .append("svg")
            .attr("width", this.w)
            .attr("height", this.h);

        this.xScale = d3.scaleLinear().domain([0, 24])
            .range([this.lpad - this.pad + 5, this.w]); // need w minus for last label

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

        function timeDiff(item) {
            var a = moment().startOf('day'),
                b = moment(item.timestamp);
            return a.diff(b, "days", true) <= self.timespan;
        };

        this.tooltip = d3.select("#consumption-vis").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        db.looked.filter(timeDiff).toArray(function(lookedArr) {
            self.addPoints("elLooked", lookedArr, "#00FF80", "", 0);
        });
        db.clicked.filter(timeDiff).toArray(function(clickedArr) {
            self.addPoints("elClicked", clickedArr, "#0080FF", "#19E8FF", 1);
        });
        db.typed.filter(timeDiff).toArray(function(typedArr) {
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
                var target = d3.event.target.classList.value;
                if (target == "elLooked") {
                    var html = d.postActivity + "<br>" + d.postDesc[0] + "...<br> (" + moment.parseZone(d.timestamp).format("hh:mm:sa") + ")";
                } else if (target == "elClicked") {
                    var html = d.url + "<br> (" + moment.parseZone(d.timestamp).format("hh:mm:sa") + ")";
                } else {
                    var html = d.content + "<br> (" + moment.parseZone(d.timestamp).format("hh:mm:sa") + ")";
                }
                self.tooltip.html(html)
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
        $("#top-" + type + "-container .container-title").append(" (" + limit + " of " + len + ")");

    },
    list: function(type) {
        $("#top-" + type + " .error").html("");
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
                $("#top-" + type).append('<p class="error">No activity tracked yet.</p>');
            }
        });
    },
    fillList: function(type, list) {
        var html = "";
        for (var i = 0; i < list.length; i++) {
            var perc = _.round(list[i].duration / list[0].duration, 2) * 100,
                rest = 100 - perc;
            html += '<span class="looked-text tab">' + list[i].duration + '</span>\t' + list[i].name +
                '<br><div class="line" style="width: ' + perc + '%"></div><div class="line-dashed" style="width: ' + rest + '%"></div>';
        };
        $("#top-" + type).append(html);
    },
    likes: function() {
        $("#top-like .error").html("");
        var likes = [],
            orderedLikes = [];
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
                .sortBy('count').reverse().value();
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
                            var html = '<span class="clicked-like-text tab">' + orderedLikes[i].count + '</span>\t' + pName + '<br><div class="line" style="width: ' + perc + '%"></div><div class="line-dashed" style="width: ' + rest + '%"></div>';
                            $("#top-like").append(html);
                            i++;
                            if (i < len) {
                                addLike(i);
                            } else {
                                $("#top-like-container .container-title").append(" (" + len + " of " + orderedLikes.length + ")");
                            }
                        });
                    };
                addLike(i);
            } else {
                $("#top-like").append('<p class="error">No activity tracked yet.</p>');
            }
        }).catch(function(err) {
            $("#top-like").append('<p class="error">No activity tracked yet.</p>');
        });
    }
}

var nlpList = {
    list: function(data, name) {
        $("#" + name + "-container .Rtable").html("");
        _.each(_.take(data, 10), function(item) {
            $("#" + name + "-container .Rtable").append(
                '<div class="cell looked-text">' + _.round(item.relevance, 2) + '</div><div class="cell">' + item.text + '</div>'
            );
        });
    },
    sentList: function(data, name) {
        $("#" + name + "-container .Rtable").html("");
        _.each(_.take(data, 10), function(item) {
            var sentScore = (item.sentiment) ? _.round(item.sentiment.score, 2) : "&#177;0.00",
                type = (item.sentiment) ? item.sentiment.type : "";
            sentScore = (item.sentiment > 0) ? "+" + sentScore : sentScore;
            $("#" + name + "-container .Rtable").append(
                '<div class="cell looked-text">' + _.round(item.relevance, 2) + '</div><div class="cell">' + sentScore + '</div><div class="cell">' + type + '</div><div class="cell">' + item.text + '</div>'
            );
        });
    },
}

var oceanPlot = function(dataIBM, dataAMS) {
    console.log("%cbig 5", helper.clog.yellow, dataIBM);
    console.log("%cbig 5", helper.clog.green, dataAMS);
    $("#ocean-vis").html("");
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
            .attr("class", "ibmocean")
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
            .attr("class", "amsocean")
            .attr("d", function(d, i) {
                var size = elSize,
                    x = xScale(_.round(d.value, 2) * 100) - size / 2,
                    y = yScale(i),
                    x2 = x + size / 2,
                    y2 = y - size / 2;
                return "M " + x + " " + y + " h " + size + " M " + x2 + " " + y2 + " v " + size;
            });
    }
}

var religionList = function(rels) {
    console.log("%creligion", helper.clog.green, rels);
    $("#religion-chart").html("");
    _.each(_.orderBy(rels, "trait"), function(item) {
        var val = _.round(item.value * 100, 0);
        var label = (item.trait.indexOf("Other") > -1) ? "Christian <br>+ Other" : _.replace(item.trait, "Religion_", "");
        $("#religion-chart").append(
            '<li class="bar-6"><div><div style="height: ' + val + '%"></div></div><p><span class="looked-text">' + val + ' %</span><br>' + label + '</p></li>'
        );
    })
}

var politicsList = function(pols) {
    console.log("%cpolitics", helper.clog.green, pols);
    $("#politics-chart").html("");
    _.each(_.orderBy(pols, "trait"), function(item) {
        var val = _.round(item.value * 100, 0);
        var label = _.replace(item.trait, "Politics_", "");
        label = label === "Libertanian" ? "Libertarian" : label;
        $("#politics-chart").append(
            '<li class="bar-4"><div><div style="height: ' + val + '%"></div></div><p><span class="looked-text">' + val + ' %</span><br>' + label + '</p></li>'
        );
    })
}

var consumptionPrefList = function(prefs) {
    $("#shopping-container .Rtable").html("");
    var shopping = _(prefs).filter(function(item) {
        return _.includes(item.consumption_preference_category_id, "shopping");
    }).map("consumption_preferences").flatten().each(function(item) {
        if (item.name.indexOf("automobiles") == -1) {
            var likelyText = (item.score == 1) ? "Likely to " : "Not likely to ";
            $("#shopping-container .Rtable").append('<div class="typed-text cell">' + likelyText + '</div><div class="cell">' + _.replace(item.name, "Likely to ", "") + '</div>');
        }
    });
    $("#health-container .Rtable").html("");
    var health = _(prefs).filter(function(item) {
        return _.includes(item.consumption_preference_category_id, "health") || _.includes(item.consumption_preference_category_id, "entrepreneurship") || _.includes(item.consumption_preference_category_id, "environment");
    }).map("consumption_preferences").flatten().each(function(item) {
        var likelyText = (item.score == 1) ? "Likely to " : "Not likely to ";
        $("#health-container .Rtable").append('<div class="typed-text cell">' + likelyText + '</div><div class="cell">' + _.replace(item.name, "Likely to ", "") + '</div>');
    });
}

var otherPredList = function(preds, interoprets) {
    $("#other-predictions-container .Rtable").html("");
    var html = [];
    var intelligent = _.find(preds, { "trait": "Intelligence" });
    html[0] = '<div class="looked-text cell">' + _.round(intelligent.value * 100, 0) + 'th percentile</div><div class="cell">' + intelligent.trait + '</div>';
    var satisfied = _.find(preds, { "trait": "Satisfaction_Life" });
    html[1] = '<div class="looked-text cell">' + _.round(satisfied.value * 100, 0) + 'th percentile</div><div class="cell">Life Satisfaction</div>';
    var female = _.find(preds, { "trait": "Female" });
    var prob = (female.value >= 0.5) ? _.round(female.value * 100, 0) : _.round((1 - female.value) * 100, 0);
    var gender = (female.value >= 0.5) ? "Female" : "Male";
    html[2] = '<div class="looked-text cell">' + prob + '%</div><div class="cell">' + gender + ' (psychological gender)</div>';
    var leadership = _.find(interoprets, { "trait": "Leadership" });
    html[3] = '<div class="looked-text cell">' + _.round(leadership.value * 100, 0) + '%</div><div class="cell">' + leadership.trait + '</div>';

    $("#other-predictions-container .Rtable").append(_.join(html, ""));
}

var loadPredictions = function(key) {
    var noPrediction = function(name) {
        $("#" + name + "-container .content").append('<p class="error">No analysis could be made.</p>');
    }
    chrome.storage.local.get(null, function(res) {
        if (res.alchemy && key == "alchemy") {
            body.find(".alchemy-last span").text(moment(res.alchemy.lastUpdated).format("MMM-DD-YY"));
            console.log("%cAlchemy Language processing", helper.clog.green, res.alchemy);
            if (res.alchemy.predData.concepts.length > 0) {
                nlpList.list(res.alchemy.predData.concepts, "concepts");
            } else {
                noPrediction("concepts");
            };
            if (res.alchemy.predData.entities.length > 0) {
                nlpList.sentList(res.alchemy.predData.entities, "entities");
            } else {
                noPrediction("entities");
            }
            if (res.alchemy.predData.keywords.length > 0) {
                nlpList.sentList(res.alchemy.predData.keywords, "keywords");
            } else {
                noPrediction("keywords");
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
                // at least have some looked content enough to make an ams prediction
                if (res.applymagicsauce) {
                    // FIX delay and fade in
                    $("#usage-message").delay(200).hide();
                    $("#the-good-stuff").delay(200).css('position', 'relative').animate({ opacity: 1 }, 200);
                } else {
                    $("#usage-message").delay(200).show();
                }
                this.apiDone = false;
            });
        }
    });
};

var apis = {
    fired: {
        "alchemy": 0,
        "personality": 0,
        "applymagicsauce": 0
    },
    apiErrors: 0,
    apiDone: false,
    checkApisDone: function(msg) {
        if (msg == "error") {
            this.apiErrors++;
            if (this.apiErrors == 3) {
                $("#usage-message").html('<span class="warning">attention:</span> Server error, please refresh page.')
            } else {
                $("#usage-message").html('<span class="warning">attention:</span> Not enough data yet. There is not enough consumption. You need to scroll through your feed, consider typing more (e.g. commenting or private messages), so Data Selfie can make predictions. The more time you spend on Facebook the faster you will get your predictions.');
            }
        }
        var values = _.values(this.fired);
        console.log("APIs in progress", values, _.uniq(values));
        if (_.uniq(values).length == 1 && _.uniq(values)[0] == 2) {
            this.apiErrors = 0;
            this.apiDone = true;
            loadPredictions("alchemy");
            loadPredictions("personality");
            loadPredictions("applymagicsauce");
            loadPredictions("reveal");
        }
    },
    postReq: function(endpoint, data) {
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
                    case "alchemy":
                        chrome.storage.local.set({
                            "alchemy": msg
                        }, function() {
                            self.fired.alchemy = 2;
                            self.checkApisDone();
                        });
                        break;
                    case "personality":
                        chrome.storage.local.set({
                            "personality": msg
                        }, function() {
                            self.fired.personality = 2;
                            self.checkApisDone();
                        });
                        break;
                    case "applymagicsauce":
                        chrome.storage.local.set({
                            "applymagicsauce": msg
                        }, function() {
                            self.fired.applymagicsauce = 2;
                            self.checkApisDone();
                        });
                        break;
                }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                chrome.storage.local.get(endpoint, function(res) {
                    if (res[endpoint] == undefined) {
                        var predContainer = body.find("." + endpoint + "-content"),
                            statusInfo = (jqXHR.responseJSON) ? ": " + jqXHR.responseJSON.statusInfo : "",
                            language = (jqXHR.responseJSON) ? " " + jqXHR.responseJSON.language : "",
                            html = '<p class="error">Sorry, there has been an error ';
                        if (jqXHR.status == 413) {
                            statusInfo = ": Data too large. Please contact us at support@dataselfie.it";
                        }
                        switch (endpoint) {
                            case "alchemy":
                                html += '(' + jqXHR.status + helper.replaceAll(statusInfo, "-", " ") + language + ').';
                                break;
                            case "personality":
                                html += '(' + jqXHR.status + helper.replaceAll(statusInfo, "-", " ") + ').';
                                break;
                            case "applymagicsauce":
                                html += '(' + jqXHR.status + helper.replaceAll(statusInfo, "-", " ") + ').';
                                break;
                        };
                        predContainer.append(html + '</p>');
                    }
                });
            })
            .always(function(jqXHR, textStatus) {
                self.fired[endpoint] = 2;
                self.checkApisDone("error");
                console.log("API status", endpoint, jqXHR.status, textStatus);
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
                self.fired[key] = 2;
                self.checkApisDone();
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
            var lessText = function() {
                truncDesc = self.truncate(desc, arrLength);
                truncSize = helper.getByteSize(truncDesc);
                if (truncSize > 80000) {
                    arrLength -= 10;
                    lessText();
                } else {
                    return;
                }
            };
            lessText();
        }).finally(function() {
            console.log("%clooked descriptions", helper.clog.green, truncSize, "bytes,", truncDesc.split(" ").length, "words sent of total", origLen, "words\n", cleanDesc);
            // sending over the original length
            // but make prediction based on truncated/most recent data
            self.newCall("alchemy", origLen, function() {
                self.fired.alchemy = 1;
                self.postReq("alchemy", { "desc": truncDesc, "length": origLen });
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
            console.log(self.truncate(typed, arrLength));
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
                self.postReq("personality", { "typed": truncTyped, "length": origLen });
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
                $("#status img").attr("src", res.dsUser.profilePic.dataUri);
                $("#user a").attr("href", res.dsUser.profileLink).text(res.dsUser.userName);
            }
        });
    },
    progressAnimation: function(showAnalysis) {
        $('html, body').css({
            overflow: 'hidden',
            height: '100%'
        });

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
                url: apiUrl + "api/threshold",
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
    console.log("%cLegend: all related to looked", helper.clog.green);
    console.log("%cLegend: all related to typed", helper.clog.yellow);
});
