//physics_engine_2d
var Component = enviroment.moduleManager.get('component');
var vector2 = enviroment.moduleManager.get('vector2');
var solver = enviroment.moduleManager.get('solver');

var physics_engine_2d = Component.extend({
    init: function ( args) {
        this.enviroment = enviroment;
        this.gravity = new vector2(args.gx, args.gy);
        this.bodies = [];

        this._super(args);
    },
    prepare: function(gameobject) {
        gameobject.addService('physics_engine_2d', this);
        this._super(gameobject);
    },
    addBody: function (body) {
        for(var i=0, len=this.bodies.length; i<len; ++i) {
            if(!this.bodies[i]) {
                this.bodies[i] = body;
                return i + 1;
            }
        }
        return this.bodies.push(body);
    },
    removeBody: function (ref) {
        this.bodies[ref - 1] = undefined;
    },
    applyGravity: function () {
        _.each(this.bodies, function (body) {
            if(body && !body.isFixed()) {
                body.applyAcceleration(this.gravity);
            }
        }, this);
    },
    update: function (dt) {
        this.applyGravity();
        this.step(dt);
        this._super(dt);
    },
    step: function (dt) {
        _.each(this.bodies, function (body) {
            if(!body.isFixed()) {
                var body_state = body.getState();
                body.setState(solver.solve(body_state, body.__proto__.problem, dt));
            }
        });
    }
});

return physics_engine_2d;