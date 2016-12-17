require('expose-loader?global!./content_global.js');
var helper = require("./content_helpers.js"),
    logic = {
        loggedId: "", // previously saved infocus element id
        getEmptyObj: function() {
            return {
                // all array unless def. only one value
                "postUrl": undefined, // url of the user's post you see, could be a shared post
                "postActivity": undefined, // basically why you are seeing this post
                "posters": [], // users that are responsible for you seeing that post with their ids and type (page or user)
                "postImg": undefined, // image or thumbnail of that post
                "postDesc": [], // what did they say
                "origLink": [], // what they shared (if at all)
                "origPoster": undefined, // who they shared it from (if at all)
                "origDesc": [], // what the shared content says (if at all)
                "suggested": [0, 0], // is it a suggested and sponsored post
                "duration": 0, // later can delete all with duration 0
                "timestamp": helper.now()
            };
        },
        getUserType: function(card) {
            var type = "other";
            if (card.indexOf("user") > -1) {
                type = "user";
            } else if (card.indexOf("page") > -1) {
                type = "page";
            };
            return type;
        },
        updateCacheObj: function(_infocus) {
            var self = this,
                postObj = $("#" + _infocus),
                postData = this.getEmptyObj();

            postData.postUrl = postObj.find("a._5pcq").attr("href"); // nested in date
            var imgs = postObj.find("img");
            if (postObj.find("video").length > 0) {
                if (imgs.filter("._3chq").length > 0) {
                    postData.postImg = imgs.filter("._3chq").attr("src");
                } else {
                    postData.postImg = imgs.filter(function() {
                        return ($(this).width() > 100);
                    }).attr("src");
                }
            } else {
                postData.postImg = imgs.filter(function() {
                    return ($(this).attr("width") > 100 || $(this).width() > 100);
                }).attr("src");
            };
            postObj.find("div._1dwg p").map(function() {
                postData.postDesc.push($(this).text());
            });
            var _origDesc = postObj.find("div._6m3");
            if (_origDesc.length > 0) {
                _origDesc.children().map(function() {
                    postData.origDesc.push($(this).text());
                });
            };
            if (postObj.find("div._5g-l span").length > 0) {
                postData.suggested[0] = 1;
            };
            if (postObj.find("a.uiStreamSponsoredLink").length > 0) {
                postData.suggested[1] = 1;
            };


            // h5 e.g. Regina likes this.
            var h5 = postObj.find("h5");
            postData.postActivity = h5.text();
            h5.find("a").each(function(i) {
                var h5link = $(this);
                var card = h5link.attr("data-hovercard");
                if (card != undefined) {
                    var name = h5link.text(),
                        type = self.getUserType(card),
                        id = card.match(/\d{5,}/g)[0];
                    postData.posters.push({ name: name, type: type, id: id });
                } else if (h5link.attr("href") != "#") {
                    postData.origLink.push(h5link.attr("href"));
                }
            });
            // h6 e.g. New York Times (what Regina likes/interacted with)
            var h6 = postObj.find("h6._5pbw._5vra a")[0];
            if (h6) {
                var h6link = $(h6),
                    name = h6link.text(),
                    card = h6link.attr("data-hovercard"),
                    type = self.getUserType(card),
                    id = card.match(/\d{5,}/g)[0];
                postData.origPoster = { name: name, type: type, id: id };
            };

            this.cachedObj = postData;
        },
        logLooked: function(_obj, _sec, callback) {
            if (_sec >= window.global.minLookedDuration && _obj.postActivity.length > 0) {
                // if this fails, obj will not be saved in DB
                // logic.cachedObj is still unchanged
                _obj.duration = _sec;
                helper.sendToBg("saveLooked", _obj);
                console.log("looked", _sec + " >= " + window.global.minLookedDuration, _obj.postActivity);
            };
            this.resetClock();
            if (callback) { callback(); }
        },
        startTimer: function() {
            var self = this;
            window.global.timer = setInterval(function() {
                if (window.global.lookedFocused &&
                    window.global.windowFocused &&
                    !window.global.overlayFocused) {
                    window.global.sec += 1;
                    self.updateClockSec(window.global.sec);
                } else {
                    self.updateClockSec("");
                }
            }, 1000);
        },
        resetClock: function() {
            window.global.sec = 0;
            this.updateClockSec("");
        },
        updateClockSec: function(_sec) {
            window.global.secEl.text(_sec);
            if (window.global.sec == 0) {
                window.global.clock.fadeOut();
            } else {
                window.global.clock.fadeIn();
            }
        },
        lookedFocusedFalse: function() {
            window.global.lookedFocused = false;
            $("#"+this.loggedId).removeClass("highlighted");
        },
        cachedObj: {},
    }

module.exports = {
    logic: logic, // separated from exports because of scoping problem
    getMinLookedDuration: function() {
        chrome.storage.local.get(null, function(res) {
            window.global.minLookedDuration = res.optionsMinLookedDuration;
        });
    },
    isInView: function(rect) {
        return (rect.top > -1 * rect.height / 5 &&
            rect.top < window.innerHeight / 2 &&
            document.hasFocus());
    },
    highlightPost: function(posts) {
        var infocusId;
        for (var i = posts.length - 1; i >= 0; i--) {
            var rect = posts[i].getBoundingClientRect();
            if (this.isInView(rect) && $(posts[i]).find("h5").length > 0) {
                window.global.lookedFocused = true;
                console.log("looked forloop found post");

                infocusId = posts[i].id;
                var infocusEl = $("#" + infocusId);
                infocusEl.addClass("highlighted");
                posts.not(infocusEl).removeClass("highlighted");

                // if the current infocus != the logged (one from saved before), i.e. if there is a new element in focus and if loggedId is not empty ()
                if (logic.loggedId != infocusId && logic.loggedId != "") {
                    // wrapup previous and init new logged element
                    logic.logLooked(logic.cachedObj, window.global.sec, function() {
                        logic.updateCacheObj(infocusId);
                    });
                    // log infocus element in loggedId to compare next infocus to
                    logic.loggedId = infocusId;
                    break;
                } else if (logic.loggedId != infocusId && logic.loggedId == "") {
                    // update a new logged element
                    logic.updateCacheObj(infocusId);
                    logic.loggedId = infocusId;
                    break;
                };
            }
        };
    },
    postsInView: function() {
        var posts = window.global.feed.find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8"));
        // console.log(posts);
        if (posts.length == 0) {
            console.log("no posts in view");
            logic.lookedFocusedFalse();
        } else if (window.global.overlayFocused == false) {
            console.log("yes posts + no overlay");
            this.highlightPost(posts);
        }
    },
    checkPhotoOverlay: function(delay, callback) {
        // delay because of the loading of the overlay
        setTimeout(function() {
            var photoOverlay = $("#photos_snowlift").css('z-index');
            if (photoOverlay == 'auto' || photoOverlay == undefined) {
                // there is no overlay, so fire that callback
                window.global.overlayFocused = false;
                console.log("no overlay", window.global.overlayFocused);
                if (callback) { callback(); }
            } else {
                // there is an overlay active
                logic.logLooked(logic.cachedObj, window.global.sec);
                window.global.overlayFocused = true;
                console.log("yes overlay", window.global.overlayFocused);
                window.global.lookedFocused == false;
            }
        }, delay);
    },
    checkLocChanged: function() {
        setTimeout(function() {
            if (window.global.loc != window.location.href) {
                console.log("location change", window.global.loc, window.location.href)
                logic.logLooked(logic.cachedObj, window.global.sec);
                window.global.loc = window.location.href;
            };
        }, 500);
    },
    updateNewsFeed: function() {
        window.global.feed = $("#stream_pagelet");
    },
    init: function() {
        this.updateNewsFeed();
        logic.startTimer();
        this.postsInView();
    }
};
