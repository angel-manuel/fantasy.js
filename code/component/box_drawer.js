//box_drawer

use('component/polygon_drawer', function (polygon_drawer){

var box_drawer = polygon_drawer.extend({
	init: function(args) {
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

retrn(box_drawer);
});
