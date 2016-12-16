//
// Small tests to inspect the elements on facebook.com
// Need to inject jQuery in the page for this to work
//

$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var postObj = $(this);
});

// h5 and h6 post activity
// h5 XYZ liked this.
// h6 the user he/she liked it from

$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var postObj = $(this);
    var h5 = postObj.find("h5");
    // var h6 = postObj.find("h6"); // not specific enough
    var h6 = postObj.find("h6._5pbw._5vra");
    if (h6.length > 0) {
        console.log("h5 " + h5.text() + "\t\t\t h6 " + h6.text());
        console.log(h6.find("a"));
    }
});

// h6 user and link

$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var postObj = $(this);
    var h6 = postObj.find("h6._5pbw._5vra a")[0];
    if (h6) {
        var h6link = $(h6),
            name = h6link.text(),
            card = h6link.attr("data-hovercard"),
            type = card.match('hovercard/(.*).php')[1],
            id = card.match(/\d{5,}/g)[0];
        console.log(name, type, id);
    }
});


// h5 post activity and their links

$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var postObj = $(this);
    var h5a = postObj.find("h5 a"); // post head links

    console.log(i)
        // loop through every link in the post head
    h5a.each(function() {
        var h5link = $(this);
        var card = h5link.attr("data-hovercard");
        if (card != undefined) {
            // user, id, type of user
            console.log(h5link.text() + "\t" + card.match(/\d{5,}/g)[0] + "\t" + card.match('hovercard/(.*).php')[1]);
        } else if (h5link.attr("href") != "#") {
            // ignore href == "#", usually e.g. "2 others"
            // original link, could be post, video etc
            console.log("++++++", h5link.attr("href"));
        }
    })
});

// type of users (page, user, group)

$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var postObj = $(this);
    var h5a = postObj.find("h5 a");
    h5a.each(function() {
        var h5link = $(this);
        var card = h5link.attr("data-hovercard");
        if (card != undefined) {
            var type = "other";
            if (card.indexOf("user") > -1) {
                type = "user";
            } else if (card.indexOf("page") > -1) {
                type = "page";
            }
            console.log(type);
        }
    })
});

// basic post test

$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var postObj = $(this);
    var h5 = postObj.find("h5");
    if (h5.length > 0) {
        console.log(i, postObj[0].className, h5.text());
    } else {
        console.log(i);
    }
});

//sponsored or suggested

$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var postObj = $(this);
    console.log(postObj.find("div._5g-l span").length, postObj.find("a.uiStreamSponsoredLink").length)
});

// images

$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var postObj = $(this);
    var imgs = postObj.find("img");
    console.log("------------------", i);
    if (postObj.find("video").length > 0) {
        if (imgs.filter("._3chq").length > 0) {
            console.log("video", imgs.filter("._3chq").attr("src"));
        } else {
            var src = imgs.filter(function() {
                return ($(this).width() > 100);
            }).attr("src");
            console.log("video", src);
        }
    } else {
        var src = imgs.filter(function() {
            return ($(this).attr("width") > 100 || $(this).width() > 100);
        }).attr("src");
        console.log("photo", src);
    };
});

// input fields
// Search Facebook
// input._1frb
//
// What's on your mind
// textarea#js_cn8.uiTextareaAutogrow._3en1._480e
//

// Write a comment and Type a message
// div._1mf._1mj
//
// Comment or Reply
// em._4qba

$("body").click(function(e) {
    var target = $(e.target);
    console.log(target);
    var searchFB = $("input._1frb");
    if (searchFB.attr("aria-expanded") == "true") {
        console.log("lookedFocus false");
    }
})

$("body").click(function(e) {
    var tag = e.target.tagName.toLowercase();
    if (tag == "input" || tag == "textarea") {
        // lookedFocused false
    }
})

$("body").click(function(e) {
    var el = $(e.target);
    if (e.target.tagName.toLowerCase() == "a") {
        if (e.target.innerText == "Like") {
            console.log("like", $(el.parents("._3ccb")[0]).find("a._5pcq").attr("href"))
        } else if (e.target.className.toLowerCase() == "_52c6") {
            console.log(el[0].href);
        }
    }
});

$("#pagelet_bluebar a[title='Profile']")[0].firstChild.id.match(/\d{5,}/g)[0];

var fbSearchbar = $("#pagelet_bluebar").find("input[aria-expanded=true]"),
    menuIcons = $("#pagelet_bluebar").find("div.openToggler");
