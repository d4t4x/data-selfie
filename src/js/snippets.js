// post activity

$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var post = $(this);
    var h5 = post.find("h5"); // XYZ liked this.
    // var h6 = post.find("h6");
    var h6 = post.find("h6._5pbw._5vra"); // the user he/she liked it from
    console.log("h5 " + h5.text() + "\t\t\t h6 " + h6.text());
    if (h6.length > 0) {
        console.log(h6);
    }
});


$("#stream_pagelet").find("div._4-u2.mbm._5v3q._4-u8").children($("div._3ccb._4-u8")).each(function(i) {
    var post = $(this);
    var h5a = post.find("h5 a"); // post head links

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
