//drawer
var Drawer = enviroment.Component.extend({
    init: function (args) {
        this.target = enviroment.content[args.target];

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


        var cx = this.target.width/2;
        var cy = this.target.height/2;

        switch(this.align) {
            case 'center':
                ctx.translate(-cx, -cy);
                break;
        }

        this.target.draw();
        ctx.restore();

        this._super();
    }
});

return Drawer;
