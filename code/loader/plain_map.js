
use('loader/tilemap', function (tilemap_loader) {
var PlainMap = Class.extend({
    init: function (args) {
        var map = this.map = args.map;
        var layers = this.layers = map.layers;

        this.widthn = map.width;
        this.heightn = map.height;

        this.tile_width = map.tile_width;
        this.tile_height = map.tile_height;

        var dx = this.tile_width;
        var dy = this.tile_height;

        this.width = this.widthn*dx;
        this.height = this.heightn*dy;

        //Prerendering layers
        var prerender = {};
        _.each(layers, function prerender_layer(layer, layername) {
            var w = layer.width;
            var h = layer.height;
            var data = layer.data;
            var tilemap = get('content/' + layer.tilemap);

            var pw = w*dx;
            var ph = h*dy;

            var hiddencanvas = document.createElement('canvas');
            hiddencanvas.setAttribute('width', pw);
            hiddencanvas.setAttribute('height', ph);

            var old_ctx = enviroment.context;
            var ctx = enviroment.context = hiddencanvas.getContext('2d');

            var x, y, tile;
            ctx.save();
            for(y = 0; y < h; ++y) {
                ctx.save();
                for(x = 0; x < w; ++x) {
                    tile = data[(y*w)+x];
                    tilemap.draw(tile);
                    ctx.translate(dx, 0);
                }
                ctx.restore();
                ctx.translate(0, dy);
            }
            ctx.restore();

            enviroment.context = old_ctx;

            prerender[layername] = hiddencanvas;
        });

        this.prerender = prerender;
    },
    draw: function () {
        var ctx = enviroment.context;
        _.each(this.layers, _.bind(function (layer, layername) {
            var x = layer.x || 0;
            var y = layer.y || 0;

            ctx.save();
            ctx.translate(x*this.tile_width, y*this.tile_height);

            ctx.globalAlpha = layer.opacity;
            ctx.drawImage(this.prerender[layername], 0, 0);

            ctx.restore();
        }, this));
    }
});

retrn(function plain_map_loader(args, onload) {
    enviroment.async_download(args.src, function (err, res) {
        if (err) {
            throw err;
        }

        var map = args.map = JSON.parse(res);

        var on_tilemap_load = _.after(_.keys(map.tilemaps).length, function () {
            var m = new PlainMap(args);
            set('content/' + args.name, m);
            onload(m);
        });

        _.each(map.tilemaps, function (tilemap_args, tilemap_name) {
            tilemap_args.name = tilemap_name;
            tilemap_loader(tilemap_args, on_tilemap_load);
        });
    });
});

});
