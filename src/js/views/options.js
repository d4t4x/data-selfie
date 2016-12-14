function save_options() {
    var duration = $('#minDuration').val();
    var report = $('#report').prop('checked');
    console.log(duration, report);
    chrome.storage.local.set({
        "optionsMinLookedDuration": parseInt(duration),
        "optionsReport": report
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
        $('#report').prop('checked', res.optionsReport);
    });
}
$(document).ready(restore_options);
$('#save').click(save_options);
