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

        this.style = this.map.style || "plain";

        switch(this.style) {
            case 'plain':
                this.pixel_width = this.width*this.tile_width;
                this.pixel_height = this.height*this.tile_height;
                break;
            case 'isometric':
                this.pixel_width = (this.width + this.height + 1) * this.tile_width/2;
                this.pixel_height = (this.width + this.height + 1 + Object.keys(this.map.layers).length) * this.tile_height/4;
                break;
        }

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
        var dx, dy;

        switch(this.style) {
            case 'plain':
                dx = this.tile_width;
                dy = this.tile_height;
                break;
            case 'isometric':
                dx = this.tile_width/2;
                dy = this.tile_height/4;
                break;
        }

        switch(this.style) {
            case 'plain':
                _.each(this.map.layers, function(layer, layer_name) {
                    var tilemap = this.tilemaps[layer.tilemap];

                    var pixel_width = layer.width*dx;
                    var pixel_height = layer.height*dy;

                    layer.pixel_width = pixel_width;
                    layer.pixel_height = pixel_height;

                    var hiddencanvas = document.createElement('canvas');
                    hiddencanvas.setAttribute('width', pixel_width);
                    hiddencanvas.setAttribute('height', pixel_height);

                    var old_ctx = enviroment.context;
                    var ctx = hiddencanvas.getContext('2d');
                    enviroment.context = ctx;

                    ctx.save();
                    ctx.translate(-this.tile_width/2, -this.tile_height/2);
                    for(var y = 0; y < layer.height; ++y) {
                        ctx.save();
                        for(var x = 0; x < layer.width; ++x) {
                            var tile = layer.data[x+y*layer.width];
                            tilemap.draw(tile);
                            ctx.translate(dx, 0);
                        }
                        ctx.restore();
                        ctx.translate(0, dy);
                    }
                    ctx.restore();

                    enviroment.context = old_ctx;

                    this.preimages[layer_name] = hiddencanvas;
                }, this);

                this.predraw = document.createElement('canvas');
                this.predraw.setAttribute('width', this.pixel_width);
                this.predraw.setAttribute('height', this.pixel_height);
                
                var ctx = this.predraw.getContext('2d');

                ctx.save();
                _.each(this.map.layers, function (layer, layer_name) {
                    var tilemap = this.tilemaps[layer.tilemap];
                    var layer_image = this.preimages[layer_name];
                    
                    ctx.save();
                    ctx.globalAlpha = layer.opacity;
                    ctx.translate(layer.x*dx, layer.y*dy);
                    ctx.drawImage(layer_image, 0, 0);
                    ctx.restore();
                }, this);
                ctx.restore();
                
                break;
            case 'isometric':
                _.each(this.map.layers, function (layer, layer_name) {
                    var tilemap = this.tilemaps[layer.tilemap];

                    var pixel_width = (layer.width + layer.height)*dx;
                    var pixel_height = (layer.width + layer.height + 1)*dy;

                    layer.pixel_width = pixel_width;
                    layer.pixel_height = pixel_height;

                    var hiddencanvas = document.createElement('canvas');
                    hiddencanvas.setAttribute('width', pixel_width);
                    hiddencanvas.setAttribute('height', pixel_height);

                    var old_ctx = enviroment.context;
                    var ctx = hiddencanvas.getContext('2d');
                    enviroment.context = ctx;

                    ctx.save();
                    ctx.translate(pixel_width/2 - dx, 1.5*dy);
                    for(var y = 0; y < layer.height; ++y) {
                        ctx.save();
                        for(var x = 0; x < layer.width; ++x) {
                            var tile = layer.data[x+y*layer.width];
                            tilemap.draw(tile);
                            ctx.translate(dx, dy);
                        }
                        ctx.restore();
                        ctx.translate(-dx, dy);
                    }
                    ctx.restore();

                    enviroment.context = old_ctx;

                    this.preimages[layer_name] = hiddencanvas;
                }, this);

                this.predraw = document.createElement('canvas');
                this.predraw.setAttribute('width', this.pixel_width);
                this.predraw.setAttribute('height', this.pixel_height);
                
                var ctx = this.predraw.getContext('2d');

                ctx.save();
                ctx.translate(dx, dy * (_.keys(this.map.layers).length - 1));
                _.each(this.map.layers, function (layer, layer_name) {
                    var tilemap = this.tilemaps[layer.tilemap];
                    var layer_image = this.preimages[layer_name];
                    
                    ctx.save();
                    ctx.globalAlpha = layer.opacity;
                    ctx.translate((layer.x - layer.y - 0.5)*dx, (layer.x + layer.y)*dy);
                    ctx.drawImage(layer_image, 0, 0);
                    ctx.restore();
                    ctx.translate(0, -dy);
                }, this);
                ctx.restore();

                break;
        }

        this.load();
    },
    draw: function () {
        if(this.predraw) {
            switch(this.style) {
                case 'plain':
                    enviroment.context.drawImage(this.predraw, 0, 0);
                    break;
                case 'isometric':
                    enviroment.context.drawImage(this.predraw, -this.predraw.width/2 + this.tile_width/2, 0);
                    break;
            }
        }
    }
});

return map;
