var helper = require("./content_helpers.js"),
    looked = require("./content_looked.js"),
    inputWords = "",
    prevInputWords = "",
    justSaved = "",
    thought = 0;

module.exports = {
    saveWords: function(el, words) {
        if (words.length > 1 && justSaved != words) {
            // don't save anything we just saved, possibly can calculate difference in FUTURE
            helper.sendToBg("saveTyped", { content: words, timestamp: helper.now() });
            console.log("typed", words);
            justSaved = words;
            thought = 0;
            inputWords = "";
            prevInputWords = this.getInputValue(el);
        }
    },
    getInputValue: function(el) {
        var _el = $(el),
            // works with comments, messages and what't on your mind
            spans = _el.find("span[data-text=true]").toArray(),
            words = _.map(spans, 'innerText').join(" <br> ");
        return words;
    },
    init: function() {
        var self = this;
        $("body").on('keyup', function(e) {
            if (window.lookedFocused == true) {
                // when typing != focused on posts
                window.lookedFocused = false;
            }
            if (e.keyCode != 13) {
                inputWords = self.getInputValue(e.target);
            }
            // console.log("input: " + inputWords + "\n prev: " + prevInputWords);
            if (e.target.contentEditable == "true" || e.target.localName.toLowerCase() == "textarea") {
                if (e.keyCode === 8) { // delete
                    thought--; // next thought
                    if (thought === -5 || inputWords.length === 0 && prevInputWords.length > 8) {
                        // when pressed delete x times (x thoughts)
                        // or when deleted everything all at once
                        self.saveWords(e.target, prevInputWords);
                    }
                } else if (e.keyCode === 13) { // enter
                    thought++; // next thought
                    if (thought === 1) { // when press enter once
                        self.saveWords(e.target, prevInputWords);
                    }
                } else {
                    thought = 0; // stay in thought...
                    prevInputWords = inputWords; // store for later
                }
            };
            e.target.addEventListener("blur", function() {
                thought++;
                if (thought === 1) {
                    console.log("left text field");
                    window.lookedFocused = true;
                    self.saveWords(e.target, prevInputWords);
                    // looked.postsInView();
                }
            });
        });
    }
}