//dummy_drawer
var Component = enviroment.moduleManager.get('component');

var dummy_drawer = Component.extend({
    init: function (args) {
        this.target_name = args.target;
        this.target = enviroment.content[args.target];
        this._super();
    },
    draw: function () {
        this.target.draw();
        this._super();
    }
});

return dummy_drawer;
