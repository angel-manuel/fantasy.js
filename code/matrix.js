//matrix
var Content = enviroment.moduleManager.get('content');

var matrix = Content.extend({
    init: function (src, onload) {
        var xhr = enviroment.get_xhr();
        xhr.onreadystatechange = function() {
            if(xhr.readyState === 4) {
                var resp = xhr.responseText;
                var json = JSON.parse(resp);
                this.load(json);
            }
        }.bind(this);
        xhr.open('GET', src, true);
        xhr.send(null);
        this._super(src, onload);
    },
    load: function(resp) {
        this.width = resp.width;
        this.height = resp.height;
        this.length = this.width*this.height;
        this.data = resp.data;

        this._super();
    },
    get: function (x, y) {
        return this.data[(x + y*this.width)%(this.length)];
    }
});

return matrix;
