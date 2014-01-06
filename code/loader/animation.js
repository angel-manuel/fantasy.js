//animation
var Animation = Class.extend({
    init: function (args) {
        this.frame_number = args.index.length;
        this.time = args.time;
        this.time_per_frame = this.time/this.frame_number;

        this._super(args);
    },
    draw: function (time) {
        var frame = Math.floor(time/this.time_per_frame) % this.frame_number;
        this._super(frame + 1);
    }
});

return function animation_loader(args, onload) {
    if(args && args.tilemap) {
        enviroment.moduleManager.use({
            type: 'tilemap',
            args: args.tilemap
        }, function (tilemap) {
            args.tilemap = tilemap;
            var a = new Animation(args);
            enviroment.content[args.name] = a;
            onload(a);
        });
    } else {
        throw 'animation_loader: Not enough args';
    }
};
