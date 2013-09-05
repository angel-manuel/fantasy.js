//physics_engine_2d
var Component = enviroment.moduleManager.get('component');

var physics_engine_2d = Component.extend({
    init: function ( args) {
        this.enviroment = enviroment;
        this.vector2 = this.enviroment.moduleManager.get('vector2');
        this.solver = this.enviroment.moduleManager.get('solver');
        this.gravity = new this.vector2(args.gx, args.gy);
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
        this.bodies.forEach(function (body) {
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
        this.bodies.forEach(function (body) {
            if(!body.isFixed()) {
                var body_state = body.getState(), body_problem = body.getProblem();
                body.setState(this.solver.solve(body_state, body_problem, dt));
            }
        }, this);
    }
});

return physics_engine_2d;