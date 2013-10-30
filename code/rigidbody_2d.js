//rigidbody_2d
var Component = enviroment.moduleManager.get('component');
var vector2 = enviroment.moduleManager.get('vector2');

var rigidbody_2d = Component.extend({
    init: function (args) {
        if(args.hasOwnProperty('mass')) {
            if(args.mass <= 0) {
                this.mass = Number.POSITIVE_INFINITY;
            } else {
                this.mass = args.mass;
            }
        } else {
            this.mass = 1;
        }

        if(args.hasOwnProperty('angular_inertia')) {
            if(args.angular_inertia <= 0) {
                this.angular_inertia = Number.POSITIVE_INFINITY;
            } else {
                this.angular_inertia = args.angular_inertia*this.mass;
            }
        } else {
            this.angular_inertia = 64*this.mass;
        }

        this.friction = args.friction || 0.5;
        
        this.bounciness = args.bounciness || 0.3;

        this.velocity = new vector2(args.vx, args.vy);
        this.angular_velocity = args.angular_velocity || 0;

        this.force = new vector2();
        this.torque = 0;

        this._super(args);
    },
    isFixed: function () {
        return this.mass === Number.POSITIVE_INFINITY;
    },
    prepare: function (gameobject) {
        gameobject.addService('rigidbody_2d', this);
        this._super(gameobject);
    },
    load: function () {
        this.physics_engine_2d = this.gameobject.getService('physics_engine_2d');
        this.body_ref = this.physics_engine_2d.addBody(this);
        this._super();
    },
    applyAcceleration: function (acceleration) {
        this.force.add(acceleration);
    },
    applyAngularAcceleration: function (angular_acceleration) {
        this.torque += angular_acceleration;
    },
    applyForce: function (force) {
        this.force.add(vector2.Div(force, this.mass));
    },
    applyTorque: function (torque) {
        this.torque += torque/this.angular_inertia;
    },
    applyVelocityChange: function (velocityChange) {
        this.velocity.add(velocityChange);
    },
    applyVelocityChangeAt: function (velocityChange, at) {
        var global_velocityChange = vector2.Rotate(velocityChange, this.gameobject.transform.rotation);
        this.velocity.add(global_velocityChange);
        this.angular_velocity += vector2.Cross(at, velocityChange);
    },
    applyAngularVelocityChange: function (angularVelocityChange) {
        this.angular_velocity += angularVelocityChange;
    },
    applyImpulse: function (impulse) {
        this.velocity.add(vector2.Div(impulse, this.mass));
    },
    applyImpulseAt: function (impulse, at) {
        var global_impulse = vector2.Rotate(impulse, this.gameobject.transform.rotation);
        this.velocity.add(vector2.Div(global_impulse, this.mass));
        this.angular_velocity += vector2.Cross(at, impulse) / (this.angular_inertia*at.length());
    },
    applyAngularImpulse: function (angularImpulse) {
        this.angular_velocity += angularImpulse/this.angular_inertia;
    },
    getState: function () {
        return [
            this.gameobject.transform.x,
            this.gameobject.transform.y,
            this.gameobject.transform.rotation,
            this.velocity.x,
            this.velocity.y,
            this.angular_velocity,
            this.force.x,
            this.force.y,
            this.torque
        ];
    },
    setState: function (state) {
        this.gameobject.moveTo(state[0], state[1]);
        this.gameobject.setRotation(state[2]);

        this.velocity.x = state[3];
        this.velocity.y = state[4];
        this.angular_velocity = state[5];
        this.force.x = 0;
        this.force.y = 0;
        this.torque = 0;
    },
    getSpeed: function(at) {
        if(this.isFixed()) {
            return 0;
        }

        return vector2.Add(this.velocity, new vector2(-at.y * this.angular_velocity, at.x * this.angular_velocity));
    },
    getSpeedAtTo: function (at, to) {
        if(this.isFixed()) {
            return 0;
        }
        var local_to = vector2.Rotate(to, +this.gameobject.transform.rotation);
        return vector2.Dot(to, this.velocity) + vector2.Cross(at, local_to)*this.angular_velocity;
    },
    toString: function () {
        return this.gameobject.transform.toString() + '\n' +
        'velocity = ' + this.velocity.toString() + '\n' +
        'angular_velocity = ' + this.angular_velocity + '\n' +
        'mass = '+ this.mass + '\n' +
        'angular_inertia = ' + this.angular_inertia + '\n' +
        'bounciness = ' + this.bounciness;
    },
    problem: function (state) {
        return [
            state[3],
            state[4],
            state[5],
            state[6],
            state[7],
            state[8],
            0,
            0,
            0
        ];
    }
});

return rigidbody_2d;