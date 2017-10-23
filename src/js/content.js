require('./libs/jquery.scrollstop.min.js');
window.sec = 0;
window.lookedFocused = false;
window.windowFocused = true;
window.overlayFocused = false;
window.minLookedDuration = 3;
window.loc = window.location.href;
var helper = require("./content_helpers.js"),
    looked = require("./content_looked.js"),
    typed = require("./content_typed.js"),
    throttle = require('throttle-debounce/throttle'),
    kickoff = {
        addClock: function() {
            $("body").append('<div id="clock"><span id="clocksec">' + 0 + '</span></div>');
        },
        saveProfilePic: function(info) {
            var profileLink = info[0].href;
            var profilePic = info.find("img")[0].src;
            var userName = info[0].text;
            helper.convertImg(profilePic, function(dataUri, rawImg) {
                helper.sendToBg("profilePic", [dataUri, rawImg, profileLink, userName]);
            });
        },
        listeners: function() {
            var _window = $(window);
            window.onblur = function() {
                window.windowFocused = false; // replaced window.global
                looked.logic.lookedFocusedFalse();
                looked.logic.logLooked(looked.logic.cachedObj, window.sec); // replaced window.global
                helper.sendToBg("blur", []);
            };
            window.onbeforeunload = function() {
                helper.sendToBg("closeWindow", []);
                if (window.windowFocused == true) { // replaced window.global
                    chrome.storage.local.set({
                        "closeWindow": {
                            "timestamp": helper.now()
                        }
                    });
                    looked.logic.logLooked(looked.logic.cachedObj, window.sec); // replaced window.global
                }
            };
            window.onfocus = function() {
                window.windowFocused = true; // replaced window.global
                looked.checkPhotoOverlay(200, function() {
                    looked.postsInView();
                });
                helper.sendToBg("focus", []);
            };
            $.event.special.scrollstop.latency = 800;
            _window.on("scrollstop", throttle(2000, function() {
                if (window.windowFocused) { // replaced window.global
                    console.log("scrollstop check posts");
                    looked.postsInView();
                }
            }));
            var prevScrollPos = 0;
            _window.on("scroll", throttle(2000, function() {
                var curPos = _window.scrollTop(),
                    dif = Math.abs(curPos - prevScrollPos);
                if (dif > 800) {
                    // scrolling a lot = stopped looking at the current post
                    looked.logic.logLooked(looked.logic.cachedObj, window.sec); // replaced window.global
                }
                prevScrollPos = curPos;
            }));
            chrome.runtime.onMessage.addListener(function(req, sen, res) {
                if (req.webRequest) {
                    looked.updateNewsFeed();
                }
            });
        }
    },
    clicked = {
        init: function() {
            $("body").click(function(e) {
                var el = $(e.target);
                // check like or external link
                if (e.target.tagName.toLowerCase() == "a") {
                    var url = $(el.parents("._3ccb")[0]).find("a._5pcq").attr("href"),
                        postsNum = looked.getPagePosts().length;
                    // url is undefined if it's in overlay
                    // postsNum, so only for newsfeed
                    if (el.attr("data-testid") == "fb-ufi-likelink" && url != undefined && postsNum > 0) {
                        console.log("clicked " + url);
                        helper.sendToBg("saveClicked", {
                            type: "like",
                            url: url,
                            timestamp: helper.now()
                        });
                    } else if (e.target.className.toLowerCase() == "_52c6" && postsNum > 0) { // external link
                        var url = el[0].href;
                        helper.sendToBg("saveClicked", {
                            type: "external",
                            url: url,
                            timestamp: helper.now()
                        });
                        console.log("clicked " + url);
                    } else { // clicked to other location e.g user or image
                        console.log("clicked something not recorded");
                        looked.checkPhotoOverlay(1500);
                        looked.checkLocChanged();
                    };
                } else if (el.parents("#pagelet_bluebar")) {
                    var bluebar = $("#pagelet_bluebar");
                    var fbSearchbar = bluebar.find("input[aria-expanded=true]");
                    if (fbSearchbar.length > 0 || e.target.className.indexOf("f_click") > -1) {
                        looked.logic.lookedFocusedFalse();
                        looked.logic.logLooked(looked.logic.cachedObj, window.sec); // replaced window.global
                    };
                    looked.checkLocChanged();
                } else {
                    // clicked somewhere else
                    looked.checkPhotoOverlay(1500);
                    looked.checkLocChanged();
                }
            });
        }
    };

var start = function() {
    console.log("\n\n\n\n\nYay! Content page document.readyState: ", document.readyState);
    looked.getMinLookedDuration();
    // this class can change anytime
    // and could easily be the reason why tracking will stop working
    var info = $("#pagelet_bluebar a._2s25").has("img");
    if (info.length > 0) {
        // this is the beginning, bg only starts tracking
        // if profle img / logged in
        helper.sendToBg("contentLoaded", [1]); // session true
        console.log("Tracking on this page.");
        kickoff.listeners();
        kickoff.addClock();
        kickoff.saveProfilePic(info);
        looked.init();
        clicked.init();
        typed.init();
    } else {
        helper.sendToBg("contentLoaded", [0]); // session false
        console.log("Boo! No tracking on this page. Only activity in your newsfeed are tracked. Check https://github.com/d4t4x/data-selfie/issues");
    };
}

start();