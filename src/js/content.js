require('./libs/jquery.scrollstop.min.js');
require('expose-loader?global!./content_scripts/global.js');
var helper = require("./content_scripts/content_helpers.js"),
    looked = require("./content_scripts/looked.js"),
    typed = require("./content_scripts/typed.js"),
    throttle = require('throttle-debounce/throttle'),
    init = {
        addClock: function() {
            $("body").append('<div id="clock"><span id="clocksec">' + 0 + '</span></div>');
            window.global.secEl = $("#clocksec");
        },
        saveProfilePic: function() {
            var profileLink = window.global.profileInfo[0].href;
            var profilePic = window.global.profileInfo.children("img")[0].src;
            var userId = window.global.profileInfo[0].firstChild.id.match(/\d{5,}/g)[0];
            helper.convertImg(profilePic, function(dataUri, rawImg) {
                helper.sendToBg("profilePic", [dataUri, rawImg, profileLink, userId]);
            });
        },
        listeners: function() {
            window.onblur = function() {
                window.global.lookedFocused = false;
                looked.logic.logLooked(looked.logic.cachedObj, window.global.sec);
                helper.sendToBg("blur", []);
            };
            window.onbeforeunload = function() {
                helper.sendToBg("closeWindow", []);
                if (window.global.lookedFocused == true) {
                    chrome.storage.local.set({
                        "errorCloseWindow": {
                            "timestamp": helper.now()
                        }
                    });
                    looked.logic.logLooked(looked.logic.cachedObj, window.global.sec);
                }
            };
            window.onfocus = function() {
                window.global.lookedFocused = true;
                // checkStopLooked("", "");
                helper.sendToBg("focus", []);
            };
            var count = 0;
            $.event.special.scrollstop.latency = 800;
            $(window).on("scrollstop", throttle(2000, function() {
                if (window.global.lookedFocused) {
                    looked.looked();
                }
            }));
        }
    }

$(document).ready(function() {
    console.log("\n\n\n\n\nKabooom. Content script loaded.");
    looked.getMinLookedDuration();
    var loc = window.location;
    // this is the beginning, bg only starts tracking if profle img / logged in
    window.global.profileInfo = $("#pagelet_bluebar a[title='Profile']");
    if (window.global.profileInfo.length > 0) {
        console.log("Tracking on this page.");
        helper.sendToBg("contentLoaded", [true, loc.href, loc.origin, loc.pathname]);
        init.listeners();
        init.addClock();
        init.saveProfilePic();
        looked.init();
    } else {
        helper.sendToBg("contentLoaded", [false, loc.href, loc.origin, loc.pathname]);
        console.log("No tracking on this page.");
    };
});



// module.exports = function() {
//     $("body").click(function(e) {
//         // console.log(e);
//         var pos = [e.pageX, e.pageY, e.clientX, e.clientY];
//         var el = "";
//         var inText = e.target.innerText;

//         if (e.target.className == "_1mf _1mj") {
//             var inTitle = e.toElement.offsetParent.firstChild.title;
//             console.log("_1mf");
//             el = inTitle;
//         } else {
//             if (inText.length < 1) {
//                 el = e.target.title;
//             } else {
//                 el = inText.slice(0, 140);
//             }
//         }
//         // checkStopLooked(e, el);
//         clickedArr.push({
//             "position": pos,
//             "content": [el, e.target.href],
//             "timestamp": Date.now()
//         });
//         console.log(clickedArr[clickedArr.length - 1].content);
//         chrome.storage.local.set({ "dsClicks": clickedArr });
//     });

//     // click into video?
// };


// check if clicked - specific parent - then redirect to different actions
// e.g. only check if in #stream_pagelet
