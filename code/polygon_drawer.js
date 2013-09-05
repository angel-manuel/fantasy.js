//polygon_drawer
var Component = enviroment.moduleManager.get('component');

var polygon_drawer = Component.extend({
    init: function (args) {
        this.edges = args.edges;
        this.fillStyle = args.fillStyle || "#000000";

        this._super(args);
    },
    draw: function () {
        var ed = this.edges, ctx = enviroment.context;
        ctx.fillStyle = this.fillStyle;
        ctx.beginPath();
        ctx.moveTo(ed[0], ed[1]);
        for(var i=1, len=ed.length/2; i<len; ++i) {
            ctx.lineTo(ed[2*i], ed[2*i + 1]);        
        }
        ctx.closePath();
        ctx.fill();
    }
});

return polygon_drawer;
