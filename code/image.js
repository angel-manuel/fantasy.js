//image
var Content = enviroment.moduleManager.get('content');
var image = Content.extend({
    init: function (args, onload) {
        if (typeof args === 'object') {
            this.enviroment = enviroment;
            this.sx = args.sx || 0;
            this.sy = args.sy || 0;

            if(typeof args.image === 'object') {
                this.image = args.image;
                this.sw = Math.min(args.sw || (this.image.width - this.sx), this.image.width);
                this.sh = Math.min(args.sh || (this.image.height - this.sy), this.image.height);
                this.dw = Math.min(args.dw || this.sw, this.image.width);
                this.dh = Math.min(args.dh || this.sh, this.image.height);
            } else {
                this.sw = args.sw;
                this.sh = args.sh;
                this.dw = args.dw || this.sw;
                this.dh = args.dh || this.sh;
            }
            
            this.width = this.image.width;
            this.height = this.image.height;
            
        
            if(typeof args.image === 'string') {
                this.image = enviroment.content[args.image].getSubImage(this.sx, this.sy, this.sw, this.sh, this.dw, this.dh).image;
            }
            
            this.loaded = true;
            if(onload) {
                onload();
            }
        } else if(typeof args === 'string') {
            this.loaded = false;
            var src = args;
            this.sx = 0;
            this.sy = 0;
            this.image = new Image();
            this.image.onload = this.load.bind(this);
            this.image.src = src;
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

return image;
