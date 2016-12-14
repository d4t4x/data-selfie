console.log("Kaboom. Me page loaded.");
var helper = require("../content_scripts/content_helpers.js");
var userEl = $("#user");
var init = function() {
        chrome.storage.local.get(null, function(res) {
            if (res.dsUser) {
                userEl.find("img").attr("src", res.dsUser.profilePic.dataUri);
                userEl.find("a").attr("href", res.dsUser.profileLink).text(res.dsUser.userId);
            }
        });
    },
    listeners = function() {

    }

$(document).ready(function() {
    listeners();
    init();
});
