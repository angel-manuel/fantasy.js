//tilemap
use('loader/image', function (image_loader) {
var tilemap = Class.extend({
    init: function (args) {
        this.image = args.image;
        this.tile_width = args.tile_width;
        this.tile_height = args.tile_height;

        this.width = this.tile_width;
        this.height = this.tile_height;

        this.nwidth = Math.floor(this.image.width/this.tile_width);
        this.nheight = Math.floor(this.image.height/this.tile_height);
        this.tile_number = this.width*this.height;
        this.cells = [];

        if(args.index) {
            this.index = args.index;
            _.each(args.index, function (index) {
                if(index <= this.tile_number) {
                    index--;
                    var x = index % this.width,
                        y = Math.floor(index / this.width);
                    this.cells.push(this.image.getSubImage(x*this.tile_width, y*this.tile_height, this.tile_width, this.tile_height));
                }
            }, this);
            this.tile_number = this.cells.length;
        } else {
            for(var y=0; y<this.nheight; ++y) {
                for(var x=0; x<this.nwidth; ++x) {
                    this.cells.push(this.image.getSubImage(x*this.tile_width, y*this.tile_height, this.tile_width, this.tile_height));
                }
            }
        }
    },
    draw: function (x, y) {
        if(y) {
            this.cells[y*this.nwidth + x].draw();
        } else if(x) {
            this.cells[x - 1].draw();
        } else {
            throw 'tilemap.draw(): Not enough args';
        }
    }
});

retrn(function tilemap_loader(args, onload) {
    if(args) {
        var name = args.name;
        args.name = name + '/image';
        
        image_loader(args, function (img) {
            args.image = img;
            var t = new tilemap(args);
            //set('content/' + name, t);
            onload(t);
        });
    } else {
        throw 'tilemap_loader: Not enough args';
    }
});

});
