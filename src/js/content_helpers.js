module.exports = {
    now: function() {
        return moment().format();
    },
    convertImg: function(url, callback) {
        // https://davidwalsh.name/convert-image-data-uri-javascript
        var img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = this.naturalWidth;
            canvas.height = this.naturalHeight;
            canvas.getContext('2d').drawImage(this, 0, 0);
            var dataURL = canvas.toDataURL('image/png');
            callback(dataURL,
                dataURL
                .replace(/^data:image\/(png|jpg);base64,/,
                    ''));
        };
        img.src = url;
    },
    sendToBg: function(_type, _data) {
        chrome.runtime.sendMessage({
            type: _type,
            data: _data
        });
    }
}
