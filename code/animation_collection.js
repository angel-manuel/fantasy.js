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

        for(var animation_name in this.animations_index) {
            if(this.animations_index.hasOwnProperty(animation_name)) {
                this.animations[animation_name] = new animation({
                    index: this.animations_index[animation_name],
                    time: this.time,
                    tile_width: this.tile_width,
                    tile_height: this.tile_height,
                    image: this.image
                });
            }
        }

        this._super(args);
    },
    get: function (animation) {
        return this.animations[animation];
    }
});

return animation_collection;
