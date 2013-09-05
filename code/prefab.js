//prefab
var Content = enviroment.moduleManager.get('content');
var Node = enviroment.moduleManager.get('node');

var prefab = Content.extend({
	init: function (src, onload) {
		this.xhr = enviroment.get_xhr();

		this.xhr.open('GET', src, true);

		this.xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var resp = xhr.responseText;
                this.level = JSON.parse(resp);
                this.load();
            }
        }.bind(this);

		this.xhr.send(null);

		this._super(src, onload);
	},
	getTree: function(name, callback) {
		Node.FromLevel(name, this.level, callback);
	}
});

return prefab;