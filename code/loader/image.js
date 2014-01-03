//image
var image = Class.extend({
    init: function (args) {
        if (args && typeof args === 'object') {
            this.enviroment = enviroment;
            this.sx = args.sx || 0;
            this.sy = args.sy || 0;

            this.image = args.image;
            
            this.sw = Math.min(this.image.width - this.sx, this.image.width);
            this.sh = Math.min(this.image.height - this.sy, this.image.height);
            this.dw = Math.min(this.sw, this.image.width - this.sx);
            this.dh = Math.min(this.sh, this.image.height - this.sy);
            this.width = this.dw;
            this.height = this.dh;
        }
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

return function image_loader(args, onload) {
    var img = new Image();
    img.addEventListener('load', _.bind(function(img, args) {
        args.image = img;
        var ret = new image(args);
        enviroment.content[args.name] = ret;
        onload(ret);
    }, undefined, img, args));
    img.src = args.src;
};
