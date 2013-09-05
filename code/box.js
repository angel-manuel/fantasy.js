//box

var polygon = enviroment.moduleManager.get('polygon');

var box = polygon.extend({
	init: function (args) {
		this.width = args.width;
        this.half_width = this.width / 2;
        this.height = args.height;
        this.half_height = this.height / 2;
        args.edges = [
            -this.half_width, -this.half_height,
            +this.half_width, -this.half_height,
            +this.half_width, +this.half_height,
            -this.half_width, +this.half_height
        ];
        this._super(args);
	}
});

return box;