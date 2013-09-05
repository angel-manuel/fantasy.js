//animator
var Component = enviroment.moduleManager.get('component');

var animator = Component.extend({
    init: function (args) {
        this.animation_name = args.animation;
        this.animation = enviroment.content[this.animation_name];
        this.current_time = (args.initial_time % this.animation.time) || 0;

        this._super(args);
    },
    update: function (dt) {
        this.current_time += dt;
        this.current_time %= this.animation.time;
        this._super(dt);
    },
    draw: function () {
        this.animation.draw(this.current_time);
        this._super();
    }
});

return animator;
