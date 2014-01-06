//animation_collection
var AnimationCollection = Class.extend({
    init: function (args) {
        this.time = args.time;
        this.tilemap = args.tilemap;

        this.animations_index = args.index;
    },
    get: function (animation) {
        var index = this.animations_index[animation];
        var time_per_frame = this.time / index.length;
        var tilemap = this.tilemap;
        return function draw_anim(time) {
            var frame_n = Math.floor(time/time_per_frame) % index.length;
            var frame = index[frame_n];
            tilemap.draw(frame);
        };
    }
});

return function animation_collection_loader(args, onload) {
    if(args && args.tilemap) {
        enviroment.moduleManager.use({
            type: 'tilemap',
            args: args.tilemap
        }, function (tilemap) {
            args.tilemap = tilemap;
            var a = new AnimationCollection(args);
            enviroment.content[args.name] = a;
            onload(a);
        });
    } else {
        throw 'animation_collection_loader: Not enough args';
    }
};
