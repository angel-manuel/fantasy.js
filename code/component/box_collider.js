//box_collider
use('component/polygon_collider', function (polygon_collider){
var box_collider = polygon_collider.extend({
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

retrn(box_collider);
});
