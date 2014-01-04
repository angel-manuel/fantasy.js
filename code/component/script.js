//script
var script = enviroment.Component.extend({
	init: function(args) {
		this.event_handlers = {};

		this.event_codes = args;

		var event_names = _.keys(this.event_codes);

		event_names.forEach(function (event_name) {
			var event_handler = (new Function('enviroment', 'event', this.event_codes[event_name])).bind(this);
			//event_handler.script = this;
			this.event_handlers[event_name] = event_handler;
		}, this);

		if(this.event_handlers.init) {
			this.event_handlers.init();
		}

		this._super(args);
	},
	prepare: function(gameobject) {
		var event_names = _.keys(this.event_handlers);

		event_names.forEach(function (event_name) {
			var event_handler = this.event_handlers[event_name];
			event_handler.gameobject = gameobject;
			gameobject.attach(event_name, _.bind(event_handler, event_handler, enviroment));
		}, this);

		if(this.event_handlers.prepare) {
			this.event_handlers.prepare(enviroment, gameobject);
		}
		this._super(gameobject);
	},
	update: function (dt) {
		if(this.event_handlers.update) {
			this.event_handlers.update(enviroment, dt);
		}
		this._super(dt);
	}
});

return script;