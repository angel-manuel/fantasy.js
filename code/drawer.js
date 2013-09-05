//drawer
var Component = enviroment.moduleManager.get('component');

var drawer = Component.extend({
    init: function (args) {
        this.image = enviroment.content[args.image];
        this.cx = this.image.width/2;
        this.cy = this.image.height/2;

        this.align = args.align || 'none';
        this.fillStyle = args.fillStyle;
        this.strokeStyle = args.strokeStyle;

        this._super(args);
    },
    draw: function () {
        var ctx = enviroment.context;
        ctx.save();

        if(this.fillStyle)
            ctx.fillStyle = this.fillStyle;

        if(this.strokeStyle)
            ctx.strokeStyle = this.strokeStyle;

        switch(this.align) {
            case 'center':
                ctx.translate(-this.cx, -this.cy);
                break;
        }

        this.image.draw();
        ctx.restore();

        this._super();
    }
});

return drawer;
