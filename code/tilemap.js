//tilemap
var Abstractor = enviroment.moduleManager.get('abstractor');
var tilemap = Abstractor.extend({
    init: function (args) {
        this.image = enviroment.content[args.image];
        this.tile_width = args.tile_width;
        this.tile_height = args.tile_height;

        this.width = Math.floor(this.image.width/this.tile_width);
        this.height = Math.floor(this.image.height/this.tile_height);
        this.tile_number = this.width*this.height;
        this.cells = [];

        if(args.index) {
            this.index = args.index;
            args.index.forEach(function (index) {
                if(index <= this.tile_number) {
                    index--;
                    var x = index % this.width,
                        y = Math.floor(index / this.width);
                    this.cells.push(this.image.getSubImage(x*this.tile_width, y*this.tile_height, this.tile_width, this.tile_height));
                }
            }, this);
            this.tile_number = this.cells.length;
        } else {
            for(var y=0; y<this.height; ++y) {
                for(var x=0; x<this.width; ++x) {
                    this.cells.push(this.image.getSubImage(x*this.tile_width, y*this.tile_height, this.tile_width, this.tile_height));
                }
            }
        }

        this._super(args);
    },
    draw: function (x, y) {
        if(y) {
            this.cells[y*this.width + x].draw();
        } else {
            this.cells[x - 1].draw();
        }
    }
});

return tilemap;
