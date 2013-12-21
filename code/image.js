//image
var Content = enviroment.moduleManager.get('content');
var image = Content.extend({
    init: function (args, onload) {
        this.onload = onload;

        if (args && typeof args === 'object') {
            this.enviroment = enviroment;
            this.sx = args.sx || 0;
            this.sy = args.sy || 0;

            if(args.image && typeof args.image === 'object') {
                this.image = args.image;
                this.load();
            } else {
                this.sw = args.sw;
                this.sh = args.sh;
                this.dw = args.dw || this.sw;
                this.dh = args.dh || this.sh;
            }
        
            if(args.image && typeof args.image === 'string') {
                this.image = enviroment.content[args.image].getSubImage(this.sx, this.sy, this.sw, this.sh, this.dw, this.dh).image;
                this.load();
            } else if(args.src && typeof args.src === 'string') {
                this.loaded = false;
                var src = args.src;
                this.sx = 0;
                this.sy = 0;
                this.image = new Image();
                this.image.onload = this.load.bind(this);
                this.image.src = src;
            }
        }

        this._super(args, onload);
    },
    load: function () {
        this.sw = Math.min(this.image.width - this.sx, this.image.width);
        this.sh = Math.min(this.image.height - this.sy, this.image.height);
        this.dw = Math.min(this.sw, this.image.width - this.sx);
        this.dh = Math.min(this.sh, this.image.height - this.sy);
        this.width = this.image.width;
        this.height = this.image.height;

        this._super();
    },
    draw: function () {
        enviroment.context.save();
        enviroment.context.translate(-this.sw/2, -this.sh/2);
        enviroment.context.drawImage(this.image, this.sx, this.sy, this.sw, this.sh, 0, 0, this.dw, this.dh);
        enviroment.context.restore();
    },
    getSubImage: function (sx, sy, sw, sh, dw, dh) {
        var ret = new image({
            image: this.image,
            sx: this.sx + sx,
            sy: this.sy + sy,
            sw: sw,
            sh: sh,
            dw: dw,
            dh: dh
        });
        return ret;
    }
});

return function image_loader(args, onload) {
    var tmp = new image(args, onload);
    return tmp;
};
