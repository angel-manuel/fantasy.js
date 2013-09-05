//prefab_binder
var Component = enviroment.moduleManager.get('component');

var prefab_binder = Component.extend({
	init: function (args) {
		this.prefab = enviroment.content[args.prefab];
		this.prefab_name = args.name;
		this._super(args);
	},
	prepare: function (gameobject) {
		this.prefab.getTree(function (tree) {
			var name = this.prefab_name || 'prefab';
			if(gameobject.subnodes.hasOwnProperty(name)) {
				var i = 1;
				while(gameobject.subnodes.hasOwnProperty(name + '_' + i)) {
					++i;
				}
				name = name + '_' + i;
			}
			gameobject.appendChild(name, tree);
		});

		this._super(gameobject);
	}
});

return prefab_binder;