//prefab
var Content = enviroment.moduleManager.get('content');

var prefab = Content.extend({
	init: function (src, onload) {
		function build_prefab() {

		}

		this.xhr = enviroment.get_xhr();

		this.xhr.open('GET', src, true);

		this.xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var resp = xhr.responseText;
                this.scheme = JSON.parse(resp);
            }
        }.bind(this);

		this.xhr.send(null);

		this._super(src, onload);
	}
});

return prefab;