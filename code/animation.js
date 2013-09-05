//animation
var tilemap = enviroment.moduleManager.get('tilemap');
var animation = tilemap.extend({
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

return animation;
