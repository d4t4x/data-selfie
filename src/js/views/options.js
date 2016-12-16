function save_options() {
    var duration = $('#minDuration').val();
    chrome.storage.local.set({
        "optionsMinLookedDuration": parseInt(duration),
    }, function() {
        var status = $('#status');
        status.text('Options saved.');
        setTimeout(function() {
            status.fadeOut("slow", function(){
                status.text('');
            });
        }, 1500);
    });
}
function restore_options() {
    chrome.storage.local.get(null, function(res) {
        $('#minDuration').val(res.optionsMinLookedDuration);
    });
}
$(document).ready(restore_options);
$('#save').click(save_options);
