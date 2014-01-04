var IsometricMap = Class.extend({
    init: function (args) {
        var map = this.map = args.map;
        var layers = this.layers = map.layers;

        this.widthn = map.width;
        this.heightn = map.height;

        this.tile_width = map.tile_width;
        this.tile_height = map.tile_height;

        var dx = this.tile_width/2;
        var dy = this.tile_height/4;

        this.width = (this.widthn+this.heightn)*dx;
        this.height = (this.widthn+this.heightn)*dy;

        //Prerendering layers
        var prerender = {};
        _.each(layers, function prerender_layer(layer, layername) {
            var w = layer.width;
            var h = layer.height;
            var data = layer.data;
            var tilemap = enviroment.content[layer.tilemap];

            var pw = (w+h)*dx;
            var ph = (w+h)*dy;

            var hiddencanvas = document.createElement('canvas');
            hiddencanvas.setAttribute('width', pw);
            hiddencanvas.setAttribute('height', ph);

            var old_ctx = enviroment.context;
            var ctx = enviroment.context = hiddencanvas.getContext('2d');

            var x, y, tile;
            ctx.save();
            ctx.translate(pw/2, 0);
            for(y = 0; y < h; ++y) {
                ctx.save();
                for(x = 0; x < w; ++x) {
                    tile = data[(y*w)+x];
                    tilemap.draw(tile);
                    ctx.translate(dx, dy);
                }
                ctx.restore();
                ctx.translate(-dx, dy);
            }
            ctx.restore();

            enviroment.context = old_ctx;

            prerender[layername] = hiddencanvas;
        });

        this.prerender = prerender;
    },
    draw: function () {
        var dx = this.tile_width/2;
        var dy = this.tile_height/4;
        var layern = _.keys(this.layers).length;

        var ctx = enviroment.context;

        ctx.save();
        ctx.translate(0, (layern-1)*dy);
        _.each(this.layers, _.bind(function (layer, layername) {
            ctx.save();
            var x = layer.x || 0;
            var y = layer.y || 0;

            var px = (x+y)*dx;
            var py = (x+y)*dy;

            ctx.translate(px, py);

            ctx.globalAlpha = layer.opacity;
            var prerender = this.prerender[layername];
            ctx.drawImage(prerender, -prerender.width/2, 0);

            ctx.restore();
            ctx.translate(0, -dy);
        }), this);
        ctx.restore();
    }
});

return function isometric_map_loader(args, onload) {
    enviroment.async_download(args.src, function (err, res) {
        if (err) {
            throw err;
        }

        var map = args.map = JSON.parse(res);

        var tilemaps_to_load = [];
        _.each(map.tilemaps, function (tilemap, tilemapname) {
            tilemap.name = tilemapname;
            tilemaps_to_load.push({
                type: 'tilemap',
                args: tilemap
            });
        });

        enviroment.moduleManager.use(tilemaps_to_load, function () {
            var m = new IsometricMap(args);
            enviroment.content[args.name] = m;
            onload(m);
        });
    });
};
