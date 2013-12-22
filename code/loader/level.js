//level
var Level = Class.extend({
	init: function(tree) {
		this.tree = tree;
	},
	load: function() {
		this.tree.load();
	},
	draw: function(layer_mask) {
		return this.tree.draw(layer_mask);
	},
	update: function(dt) {
		this.tree.update(dt);
	}
});

return function level_loader(args, callback) {
	var content = [];
	_.each(_.keys(args.content), function prepare_asset(assetname) {
		var asset = args.content[assetname];
		content.push({
			type: 'content',
			args: {
				name: assetname,
				obj: asset
			}
		});
	});

	enviroment.moduleManager.use(content, function load_tree() {
		enviroment.moduleManager.use({
			type: 'fnode',
			args: {
				name: args.name || 'root',
				subnodes: args.tree
			}
		}, function return_tree(tree) {
			callback(new Level(tree));
		});
	});
};
