//image
var image = Class.extend({
    init: function (args) {
        this.sx = args.sx || 0;
        this.sy = args.sy || 0;

        this.image = args.image;
        
        this.sw = Math.min(this.image.width - this.sx, args.sw || this.image.width);
        this.sh = Math.min(this.image.height - this.sy, args.sh || this.image.height);
        this.dw = args.dw || this.sw;
        this.dh = args.dh || this.sh;
        this.width = this.dw;
        this.height = this.dh;
    },
    draw: function () {
        enviroment.context.drawImage(this.image, this.sx, this.sy, this.sw, this.sh, 0, 0, this.dw, this.dh);
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

retrn(function image_loader(args, onload) {
    if(args && args.src) {
        var img = new Image();
        img.addEventListener('load', function (){
            args.image = img;
            var ret = new image(args);
            //set('content/' + args.name, ret);
            onload(ret);
        });
        img.src = args.src;
    } else {
        throw 'image_loader: Not enough args';
    }
});
