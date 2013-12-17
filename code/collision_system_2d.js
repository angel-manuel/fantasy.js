//collision_system_2d
var Component = enviroment.moduleManager.get('component');
var vector2 = enviroment.moduleManager.get('vector2');

var debug = true;
var on_neg_vel = false;

var collision_description_2d = Class.extend({
    init: function(A, B, at, normal, penetration) {
        this.A = A;
        this.B = B;
        this.at_b = at;
        this.at = B.gameobject.transform.untransformPoint(this.at_b);
        this.at_a = A.gameobject.transform.transformPoint(this.at);
        this.normal = normal;
        this.penetration = penetration;
    },
    toString: function () {
        return  'at = ' + this.at + '\n' +
                'at_a = ' + this.at_a + '\n' +
                'at_b = ' + this.at_b + '\n' +
                'normal = ' + this.normal + '\n' +
                'penetration = ' + this.penetration;
    },
    getBSide: function () {
        var n = this.normal.getInverse();
        var p = -this.penetration;
        var a = this.B;
        var b = this.A;
        return new collision_description_2d(a, b, this.at_a, n, p);
    },
    resolve: function () {
        var A = this.A.gameobject.getService('rigidbody_2d');
        var B = this.B.gameobject.getService('rigidbody_2d');
        if(A && B) {
            if(debug) {
                alert(
                'A = ' + A.gameobject.node_name + '\n' +
                'B = ' + B.gameobject.node_name + '\n');
            }
            var normalA = vector2.Rotate(this.normal, -A.gameobject.transform.rotation);
            var normalB = vector2.Rotate(this.normal, -B.gameobject.transform.rotation);

            var pointrelspeed = A.getSpeedAtTo(this.at_a, this.normal) - B.getSpeedAtTo(this.at_b, this.normal);

            if(pointrelspeed > 0) {
                
                if(A.isFixed()) {
                    if(!B.isFixed()) {
                        var pen1 = vector2.Mul(this.normal, this.penetration);
                        B.gameobject.translate(pen1.x, pen1.y);
                    }
                } else {
                    if(B.isFixed()) {
                        var pen2 = vector2.Mul(this.normal, -this.penetration);
                        A.gameobject.translate(pen2.x, pen2.y);
                    } else {
                        var penB = vector2.Mul(this.normal, this.penetration/2);
                        B.gameobject.translate(penB.x, penB.y);
                        var penA = vector2.Mul(this.normal, -this.penetration/2);
                        A.gameobject.translate(penA.x, penA.y);
                    }
                }
                

                var bounciness = Math.min(A.bounciness, B.bounciness);

                var A_ang_disp = Math.abs(vector2.Cross(this.at_a, normalA)), B_ang_disp = Math.abs(vector2.Cross(this.at_b, normalB));
                var k = (1/A.mass)+(1/B.mass)+(A_ang_disp/A.angular_inertia)+(B_ang_disp/B.angular_inertia);
                var j = (1+bounciness)*pointrelspeed/k;

                var global_impulse = vector2.Mul(this.normal, j);
                var A_impulse = vector2.Mul(normalA, -j);
                var B_impulse = vector2.Mul(normalB, +j);

                var friction = Math.max(0, Math.min(1, Math.max(A.friction, B.friction)));

                var tangent = new vector2(-this.normal.y, this.normal.x);
                var tangentA = vector2.Rotate(tangent, -A.gameobject.transform.rotation);
                var tangentB = vector2.Rotate(tangent, -B.gameobject.transform.rotation);

                var relslide = A.getSpeedAtTo(this.at_a, tangent) - B.getSpeedAtTo(this.at_b, tangent);
       
                var A_disp_tang = Math.abs(vector2.Cross(this.at_a, tangentA)), B_disp_tang = Math.abs(vector2.Cross(this.at_b, tangentB));
                var kt = (1/A.mass)+(1/B.mass)+(A_disp_tang/A.angular_inertia)+(B_disp_tang/B.angular_inertia);
                var jt = friction*relslide/kt;

                var A_impulse_tang = vector2.Mul(tangentA, -jt);
                var B_impulse_tang = vector2.Mul(tangentB, +jt);

                if(debug)
                    alert('collision = {\n' + this.toString() + '\n}\n' +
                    'tangent = ' + tangent + '\n' +
                    'normalA = ' + normalA + '\n' +
                    'normalB = ' + normalB + '\n' +
                    'bounciness = ' + bounciness + '\n' +
                    'friction = ' + friction + '\n' +
                    'j = ' + j + '\n' +
                    'k = ' + k + '\n' +
                    'jt = ' + jt + '\n' +
                    'kt = ' + kt + '\n' +
                    'pointrelspeed = ' + pointrelspeed + '\n' +
                    'relslide = ' + relslide + '\n');

                if(debug)
                    alert('BEFORE\n' +
                    'A = ' + A.toString() + '\n' +
                    'B = ' + B.toString());
                

                A.applyImpulseAt(A_impulse, this.at_a);
                B.applyImpulseAt(B_impulse, this.at_b);

                A.applyImpulseAt(A_impulse_tang, this.at_a);
                B.applyImpulseAt(B_impulse_tang, this.at_b);

                if(debug)
                    alert('AFTER\n' +
                    'A = ' + A.toString() + '\n' +
                    'B = ' + B.toString());
            } else {
                if(debug || on_neg_vel) {
                    if(!debug)
                        alert(
                        'A = ' + A.gameobject.node_name + '\n' +
                        'B = ' + B.gameobject.node_name + '\n');
                    alert(
                    'ELSE\n' +
                    'collision = {\n' + this.toString() + '\n}\n' +
                    'pointrelspeed = ' + pointrelspeed + '\n' +
                    'A = ' + A + '\n' +
                    'B = ' + B
                    );
                }
            }
        }
    }
});

var collision_system_2d = Component.extend({
    init: function (args) {
        this.bounding_sphere = enviroment.moduleManager.get('bounding_sphere');
        this.colliders = [];

        this._super(args);
    },
    prepare: function (gameobject) {
        gameobject.addService('collision_system_2d', this);
        this._super(gameobject);
    },
    addCollider: function (collider) {
        for(var i=0, len=this.colliders.length; i<len; ++i) {
            if(!this.colliders[i]) {
                this.colliders[i] = collider;
                return i + 1;
            }
        }
        return this.colliders.push(collider);
    },
    removeCollider: function (ref) {
        this.colliders[ref - 1] = undefined;
    },
    update: function (dt) {
        var len = this.colliders.length;
        for(var a=0; a<len; ++a) {
            for(var b=a+1; b<len; ++b) {
                var A = this.colliders[a], B = this.colliders[b];
                if(A && B) {
                    if(!this.bounding_sphere.Intersects(A.getBoundingSphere(), B.getBoundingSphere())) {
                        continue;
                    }
                    
                    var a_vs_b = this.check(A, B);
                    if(a_vs_b) {
                        a_vs_b.resolve();
                        A.gameobject.shot('collision', a_vs_b, false);
                        B.gameobject.shot('collision', a_vs_b.getBSide(), false);
                    }
                    var b_vs_a = this.check(B, A);
                    if(b_vs_a) {
                        b_vs_a.resolve();
                        B.gameobject.shot('collision', b_vs_a, false);
                        A.gameobject.shot('collision', b_vs_a.getBSide(), false);
                    }
                }
            }
        }
        this._super(dt);
    },
    check: function (A, B) {
        var collision_axis = new Array(B.edge_number);
        var collision_depth = new Array(B.edge_number);
        for(var i=0, len=B.edge_number; i<len; ++i) {
            collision_depth[i] = Number.POSITIVE_INFINITY;
        }

        var normals = A.getNormals();
        var contact = _.every(normals, function (normal) {
            var a_proj = A.project(normal);
            var a_max = _.max(a_proj);
            var a_min = _.min(a_proj);
            var b_proj = B.project(normal);
            collision_depth = _.map(collision_depth, function (depth, index) {
                if(depth) {
                    var b_point_proj = b_proj[index];
                    if(a_min <= b_point_proj && b_point_proj <= a_max) {
                        var invert = (b_point_proj - a_min) < (a_max - b_point_proj);
                        var current_depth;

                        if (invert) {
                            current_depth = (b_point_proj - a_min);
                        } else {
                            current_depth = (a_max - b_point_proj);
                        }

                        if(Math.abs(current_depth) < Math.abs(depth)) {
                            collision_axis[index] = (invert) ? normal.getInverse() : normal;
                            return current_depth;
                        } else {
                            if(depth === Number.MAX_VALUE) {
                                return undefined;
                            } else {
                                return depth;
                            }
                        }
                    } else {
                        return undefined;
                    }
                } else {
                    return undefined;
                }
            });
            return _.some(collision_depth);
        });

        if(contact) {
            if(debug)
                alert('collision_depth = ' + collision_depth);

            var max_depth_pos = -1;
            var max_depth = Number.NEGATIVE_INFINITY;
            _.each(collision_depth, function(depth, index) {
                if(depth > max_depth) {
                    max_depth = depth;
                    max_depth_pos = index;
                }
            });
            
            var penetration = collision_depth[max_depth_pos];
            var collision_point_at_b = B.getEdge(max_depth_pos);
            var collision_normal = collision_axis[max_depth_pos];
            
            var collision = new collision_description_2d(A, B, collision_point_at_b, collision_normal, penetration);
            return collision;
        }
        
        return false;
    }
});

return collision_system_2d;