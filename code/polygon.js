//polygon
//FIX: Hacer que añada componentes en vez de heredarlos

var rigidbody_2d = enviroment.moduleManager.get('rigidbody_2d');
var polygon_collider = enviroment.moduleManager.get('polygon_collider');

var rbp = rigidbody_2d.prototype;
var real_rbp = {};

for(var name in rbp) {
    var val = rbp[name];
    real_rbp[name] = typeof val === "function" ? val.real : val;
}

var polygon_collider_rigidbody_2d = polygon_collider.extend(rigidbody_2d.prototype);

var polygon = polygon_collider_rigidbody_2d.extend({
    init: function (args) {
        this.fillStyle = args.fillStyle || "#000000";
        this._super(args);
    },
    draw: function () {
        var ed = this.edges, ctx = enviroment.context;
        ctx.fillStyle = this.fillStyle;
        ctx.beginPath();
        ctx.moveTo(ed[0].x, ed[0].y);
        for(var i=1, len=ed.length; i<len; ++i) {
            ctx.lineTo(ed[i].x, ed[i].y);
        }
        ctx.closePath();
        ctx.fill();
        this._super();
    }
});

return polygon;