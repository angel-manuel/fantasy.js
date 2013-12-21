//2d_floor
var Component = enviroment.moduleManager.get('component');

var plain_floor = Component.extend({
    init: function (args) {
        this.matrix = enviroment.content[args.matrix];
        this.tilemap = enviroment.content[args.tilemap];

        this._super(args);
    },
    draw: function () {
        var ctx = enviroment.context;
        ctx.save();
        for(var y=0; y<this.matrix.height; ++y) {
            ctx.save();
            for(var x=0; x<this.matrix.width; ++x) {
                this.tilemap.draw(this.matrix.get(x, y));
                ctx.translate(this.tilemap.tile_width, 0);
            }
            ctx.restore();
            ctx.translate(0, this.tilemap.tile_height);
        }
        ctx.restore();
        this._super();
    }
});

return plain_floor;
