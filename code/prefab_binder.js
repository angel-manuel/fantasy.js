//prefab_binder
var Component = enviroment.moduleManager.get('component');

var prefab_binder = Component.extend({
	init: function (args) {
		this.prefab = enviroment.content[args.prefab];
		this.prefab_name = args.name || args.prefab;
		this.mode = args.mode || 'inline';
		this._super(args);
	},
	prepare: function (gameobject) {
		var name = this.prefab_name || 'prefab';
		if(gameobject.subnodes && gameobject.subnodes.hasOwnProperty(name)) {
			var i = 1;
			while(gameobject.subnodes.hasOwnProperty(name + '_' + i)) {
				++i;
			}
			name = name + '_' + i;
		}

		this.prefab.getTree(name, function (tree) {
			switch(this.mode) {
				case 'inline':
					tree.components.forEach(function (component) {
						gameobject.addComponent(component);
					});

					var subnode_names = Object.keys(tree.subnodes);
					subnode_names.forEach(function (subnode_name) {
						gameobject.appendChild(tree.subnode[subnode_name]);
					})
					break;
				case 'subnode':
					gameobject.appendChild(tree);
					break;
			}
		}.bind(this));

		this._super(gameobject);
	}
});

return prefab_binder;