// var typedArr = [],
//     attn = 0;

// function typed() {
//     $(document).on('keyup', function(e) {
//         // console.log(e);
//         // when focus out of textarea or delete
//         // start a string (new index)
//         e.target.addEventListener("blur", function() {
//             attn++;
//             if (attn == 1) { index++; }
//         })

//         if (e.target.contentEditable == "true" || e.target.localName == "textarea") {
//             if (e.keyCode === 8 || e.keyCode === 13) {
//                 attn++;
//                 if (attn == 1) { index++; }
//             } else {
//                 attn = 0;
//                 if (e.target.localName == "textarea") {
//                     var inputWords = $(e.target).val();
//                 } else {
//                     var inputWords = $(e.target).text();
//                 }

//                 typedArr[index] = {
//                     "content": inputWords,
//                     "timestamp": Date.now()
//                 }

//                 chrome.storage.local.set({ "dsTyped": typedArr }, function() {
//                     console.log("New dsTyped.length: " + typedArr.length);
//                 });
//             }
//         };
//     });
// }
