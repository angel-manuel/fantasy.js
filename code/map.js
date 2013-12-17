//map
var Content = enviroment.moduleManager.get('content');

var image = enviroment.moduleManager.get('image');
var tilemap = enviroment.moduleManager.get('tilemap');

var map = Content.extend({
    init: function (src, onload) {
        this.xhr = enviroment.get_xhr();

        this.xhr.open('GET', src, false);
        this.xhr.send(null);
        this.map = JSON.parse(this.xhr.responseText);

        this.tile_width = this.map.tile_width;
        this.tile_height = this.map.tile_height;
        this.width = this.map.width;
        this.height = this.map.height;

        this.pixel_width = (this.width + this.height + 1) * this.tile_width/2;
        this.pixel_height = (this.width + this.height + 1 + Object.keys(this.map.layers).length) * this.tile_height/4;

        this.images = {};
        this.tilemaps = {};
        this.predraws = {};
        this.preimages = {};

        var tilemaps = Object.keys(this.map.tilemaps);

        this.onload = onload;
        var trigger = _.after(tilemaps.length, _.bind(this.load_tilemaps, this));
        _.each(tilemaps, function (tilemap) {
            var tilemap_src = this.map.tilemaps[tilemap];
            var i = new image(tilemap_src, trigger);
            this.images[tilemap] = i;
            enviroment.content['_' + tilemap] = i;
        }, this);

        this._super(src, onload);
    },
    load_tilemaps: function () {
        _.each(this.images, function (image, image_name) {
            this.tilemaps[image_name] = new tilemap(
                {
                    image: '_' + image_name,
                    tile_width: this.tile_width,
                    tile_height: this.tile_height
                }
            );
        }, this);

        this.predraw();
    },
    predraw: function () {
        _.each(this.map.layers, function (layer, layer_name) {
            var tilemap = this.tilemaps[layer.tilemap];

            var pixel_width = (layer.width + layer.height)*this.tile_width/2;
            var pixel_height = (layer.width + layer.height)*this.tile_height/4;

            layer.pixel_width = pixel_width;
            layer.pixel_height = pixel_height;

            var hiddencanvas = document.createElement('canvas');
            hiddencanvas.setAttribute('width', pixel_width);
            hiddencanvas.setAttribute('height', pixel_height + this.tile_height/2);

            var old_ctx = enviroment.context;
            var ctx = hiddencanvas.getContext('2d');
            enviroment.context = ctx;
            
            ctx.save();
            ctx.translate(this.tile_width/2, this.tile_height/2);
            ctx.translate(pixel_width/2 - this.tile_width/2, 0);
            for(var dy = 0; dy < layer.height; ++dy) {
                ctx.save();
                for(var dx = 0; dx < layer.width; ++dx) {
                    var tile = layer.data[dx+dy*layer.width];
                    tilemap.draw(tile);
                    ctx.translate(this.tile_width/2, this.tile_height/4);
                }
                ctx.restore();
                ctx.translate(-this.tile_width/2, this.tile_height/4);
            }
            ctx.restore();

            enviroment.context = old_ctx;

            var debug = new Image();
            debug.src = hiddencanvas.toDataURL();
            this.preimages[layer_name] = hiddencanvas;
        }, this);

        this.predraw = document.createElement('canvas');
        this.predraw.setAttribute('width', this.pixel_width);
        this.predraw.setAttribute('height', this.pixel_height);
        
        var ctx = this.predraw.getContext('2d');

        ctx.save();
        ctx.translate(this.pixel_width/2, 0);
        ctx.translate(0, this.tile_height/4 * (_.keys(this.map.layers).length - 1));
        _.each(this.map.layers, function (layer, layer_name) {
            var tilemap = this.tilemaps[layer.tilemap];
            var layer_image = this.preimages[layer_name];
            
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.translate((layer.x - layer.y - 0.5)*this.tile_width/2 - layer.pixel_width/2, (layer.x + layer.y)*this.tile_height/4);
            ctx.drawImage(layer_image, 0, 0);
            ctx.restore();
            ctx.translate(0, -this.tile_height/4);
        }, this);
        ctx.restore();

        this.load();
    },
    draw: function () {
        if(this.predraw) {
            enviroment.context.drawImage(this.predraw, -this.predraw.width/2 + this.tile_width/2, 0);
        }
    }
});

return map;
