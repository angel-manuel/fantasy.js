//animation_collection
var Abstractor = enviroment.moduleManager.get('abstractor');
var animation = enviroment.moduleManager.get('animation');

var animation_collection = Abstractor.extend({
    init: function (args) {
        this.time = args.time;
        this.tile_width = args.tile_width;
        this.tile_height = args.tile_height;
        this.image = args.image;

        this.animations = {};
        this.animations_index = args.index;

        _.each(this.animations_index, function(anim, anim_name) {
            this.animations[anim_name] = new animation({
                index: anim,
                time: this.time,
                tile_width: this.tile_width,
                tile_height: this.tile_height,
                image: this.image
            });
        }, this);

        this._super(args);
    },
    get: function (animation) {
        return this.animations[animation];
    }
});

return animation_collection;
