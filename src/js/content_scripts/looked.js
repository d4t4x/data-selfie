require('expose-loader?global!./global.js');
var throttle = require('throttle-debounce/throttle');
var helper = require("./content_helpers.js"),
    logic = {
        loggedId: "", // previously saved infocus element id
        updateCacheObj: function(_infocus) {
            // console.log(_infocus, $("#" + _infocus).text());
            var postObj = $("#" + _infocus),
                postData = {
                    "postUrl": "", // url of the person's post you see, could be a shared post
                    "postActivity": "", // what did the person/people do to have that post show up in your newsfeed
                    "posters": [], // person or people that are responsible for you seeing that post
                    "postersId": [], // their ids
                    "postImg": "", // image or thumbnail of that post
                    "desc": [], // what did they say about
                    "origLink": [], // what they shared (if at all)
                    "origDesc": [], // what does the
                    "suggested": 0,
                    "duration": 0, // later can check to delete all posts with duration 0
                    "timestamp": helper.now()
                };

            var posthead = postObj.find("h5");
            postData.postUrl = postObj.find("a._5pcq").attr("href"); // nested in date
            if (postObj.find("video").length > 0) {
                postData.postImg = postObj.find("img._3chq").attr("src");
            } else {
                postData.postImg = postObj.find("._3x-2 img").last().attr("src");
            };
            // h5 for example Regina likes this.
            // h6 New York Times
            posthead.find("a").each(function(i) {
                var el = $(this);
                var card = el.attr("data-hovercard");
                if (card != undefined) {
                    postData.posters.push({ name: el.text(), type: card.match('hovercard/(.*).php')[1] });
                    // console.log(i, el.attr("data-hovercard"));
                    postData.postersId.push(card.match(/\d{5,}/g)[0]);
                } else if (el.attr("href") != "#") {
                    // ignore href == "#", usually e.g. "2 others"
                    postData.origLink.push(el.attr("href"));
                }
            });
            postData.postActivity = posthead.text();
            // var fromFriend = postObj.find("h6");
            // if (fromFriend != undefined) {
            // console.log("h6!!!", fromFriend);
            // };
            postObj.find("._1dwg p").map(function() {
                postData.desc.push($(this).text());
            });
            postObj.find("._6m3").children().map(function() {
                postData.origDesc.push($(this).text());
            });
            if (postObj.find("._5g-l").length > 0) { postData.suggested = 1; }

            // console.log(postData);
            this.cachedObj = postData;
        },
        logLooked: function(_obj, _sec, callback) {
            if (_sec >= window.global.minLookedDuration && _obj.postActivity.length > 0) {
                _obj.duration = _sec;
                helper.sendToBg("save looked", _obj);
                console.log("logLooked", _sec + ">=" + window.global.minLookedDuration, _obj.postActivity, _obj);
            };
            // if this fails, obj will not be saved in DB
            // all info but the duration remains
            this.resetClock();
            if (callback) { callback(); }
        },
        resetClock: function() {
            window.global.sec = 0;
            this.updateClockSec();
        },
        updateClockSec: function() {
            window.global.secEl.text(window.global.sec);
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
    stopWatchInt: function() {
        setInterval(function() {
            if (!window.global.lookedFocused) {
                return;
            } else {
                window.global.sec += 1;
                logic.updateClockSec();
            };
        }, 1000);
    },
    looked: function() {
        // array of posts to test if they are in the viewport
        var posts = window.global.feed.find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")),
            infocusId,
            wh = window.innerHeight,
            isInView = function(rect) {
                return (rect.top > -1 * rect.height / 5 &&
                    rect.top < wh / 2 &&
                    document.hasFocus());
            };
        console.log(posts);

        // native JS for loop is faster than each
        for (var i = posts.length - 1; i >= 0; i--) {
            var rect = posts[i].getBoundingClientRect();
            if (isInView(rect)) {
                console.log("In view", posts[i]);
                window.global.lookedFocused = true; // not sure if needed

                infocusId = posts[i].id;
                var infocusEl = $("#" + infocusId);
                infocusEl.addClass("highlighted");
                posts.not(infocusEl).removeClass("highlighted");

                // if the current infocus != the logged (one from saved before)
                // i.e. if there is a new element in focus
                // and if loggedId is not empty ()
                if (logic.loggedId != infocusId && logic.loggedId != "") {
                    // wrapup previous and init new
                    // save the time for just ended element
                    logic.logLooked(logic.cachedObj, window.global.sec, function() {
                        logic.updateCacheObj(infocusId);
                    });
                    // log infocus element in loggedId to compare next infocus to
                    logic.loggedId = infocusId;
                    break;
                } else if (logic.loggedId != infocusId && logic.loggedId == "") {
                    // update a new logged element
                    logic.updateCacheObj(infocusId);
                    // at the beginning of opening a new FB tab
                    logic.loggedId = infocusId;
                    break;
                };
            }
        };
    },
    init: function() {
        window.global.feed = $("#stream_pagelet");
        window.global.feedHeight = window.global.feed.height();
        this.stopWatchInt();
        this.looked();
        var count = 0;
        window.global.feed.bind("DOMNodeInserted", throttle(1000, function(){
            window.global.feed = $("#stream_pagelet");
            console.log(count++);
        }));
    }
};







function checkStopLooked(_e, _el) {
    setTimeout(function() {
        // console.log($("#photos_snowlift").css('z-index'));

        if ($("#photos_snowlift").css('z-index') == 'auto' || $("#photos_snowlift").css('z-index') == undefined) {

            window.global.lookedFocused = true;
            console.log("--0 lookedFocused", window.global.lookedFocused);

            if (_el.indexOf("Type a message") > -1 ||
                _el.indexOf("What's on your mind") > -1) {
                window.global.lookedFocused = false;
                console.log("--0 lookedFocused", window.global.lookedFocused);
            } else {
                checkBlue(_e);
            }

        } else {
            window.global.lookedFocused = false;
            console.log("--0 lookedFocused", window.global.lookedFocused);
        }
    }, 1500);
}

function checkBlue(evt) {
    var target = $(evt.target);
    if (target.parents("#pagelet_bluebar").length > 0) {
        lookedFocused = false;
        // console.log("bluebar", "--0 lookedFocused", lookedFocused);
    } else {
        lookedFocused = true;
        // console.log("_li", "--0 lookedFocused", lookedFocused);
    }
}
