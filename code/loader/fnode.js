//fnode
var Transform = Class.extend({
    init: function (args) {
        args = args || {};
        this.x = args.x || 0;
        this.y = args.y || 0;
        this.z = args.z || 0;
        this.rotation = args.rotation || 0;
        this.scale_x = args.scale_x || args.scale || 1;
        this.scale_y = args.scale_y || args.scale || 1;
        this.scale_z = args.scale_z || args.scale || 1;
    },
    apply: function () {
        enviroment.context.translate(this.x, this.y);
        enviroment.context.rotate(this.rotation);
        enviroment.context.scale(this.scale_x, this.scale_y);
    },
    applyPerspective: function (camera) {
        enviroment.context.translate(camera.x, camera.y);
        var rel_depth = this.z - camera.z;

        enviroment.context.translate((this.x - camera.x)/rel_depth, (this.y - camera.y)/rel_depth);
        enviroment.context.rotate(this.rotation);
        enviroment.context.scale(this.scale_x/rel_depth, this.scale_y/rel_depth);
    },
    combine: function (transform) {
        this.x += transform.x * this.scale_x;
        this.y += transform.y * this.scale_y;
        this.z += transform.z * this.scale_z;

        this.scale_x = this.scale_x * transform.scale_x;
        this.scale_y = this.scale_y * transform.scale_y;
        this.scale_z = this.scale_z * transform.scale_z;

        this.rotation = this.rotation + transform.rotation;
    },
    transformPoint: function(point) {
        var tpoint = _.clone(point);
        tpoint.x -= this.x;
        tpoint.y -= this.y;
        tpoint.z -= this.z;

        var s = Math.sin(this.rotation), c = Math.cos(this.rotation);
        var x = tpoint.x, y = tpoint.y;
        tpoint.x = x*c - y*s;
        tpoint.y = x*s + y*c;

        tpoint.x *= this.scale_x;
        tpoint.y *= this.scale_y;
        tpoint.z *= this.scale_z;

        return tpoint;
    },
    untransformPoint: function(point) {
        var tpoint = _.clone(point);
        var s = Math.sin(-this.rotation), c = Math.cos(-this.rotation);
        var x = point.x, y = point.y;
        tpoint.x = x*c - y*s;
        tpoint.y = x*s + y*c;

        tpoint.x += this.x;
        tpoint.y += this.y;
        tpoint.z += this.z;

        tpoint.x /= this.scale_x;
        tpoint.y /= this.scale_y;
        tpoint.z /= this.scale_z;

        return tpoint;
    },
    toString: function () {
        return JSON.stringify(this);
    },
    fix: function () {
        this.rotation %= 2*Math.PI;
    }
});
Transform.Combine = function (A, B) {
    var s = Math.sin(A.rotation),
        c = Math.cos(A.rotation);

    c = 1;
    s = 0;

    var x = B.x*c - B.y*s,
        y = B.x*s + B.y*c;

    x *= A.scale_x;
    y *= B.scale_y;

    x += A.x;
    y += A.y;

    return new Transform({
        x: x,
        y: y,
        z: B.z*A.scale_z + A.z,
        rotation: B.rotation + A.rotation,
        scale_x: B.scale_x * A.scale_x,
        scale_y: B.scale_y * A.scale_y,
        scale_z: B.scale_z * A.scale_z
    });
};

var FNode = Class.extend({
    init: function (node_name, enabled, layer, transform) {
        this.enabled = enabled || (typeof enabled === 'undefined');
        this.node_name = node_name;
        this.local_transform = transform || new Transform();
        this.up_transform = new Transform();
        this.transform = this.local_transform;
        this.layer = layer || 0;
        this.components = [];
        this.services = {};
        this.listeners = {};
        this.subnodes = {};
    },
    //attach(eventname, callback)
    //Cuando el evento eventname, callback sera llamado
    attach: function (eventname, callback) {
        if(this.listeners.hasOwnProperty(eventname)) {
            this.listeners.push(callback);
        } else {
            this.listeners[eventname] = [callback];
        }
    },
    //shot(eventname, args, propagate)
    //Hace saltar el evento eventname, llamando a los callbacks pasandoles args
    //y propagando el evento a los subnodos si propagate es verdadero
    shot: function (eventname, args, propagate) {
        if(this.listeners.hasOwnProperty(eventname)) {
            _.each(this.listeners[eventname], function (callback) {
                callback(args);
            });
        }

        if(propagate) {
            _.each(this.subnodes, function (subnode) {
                    subnode.shot(eventname, args, propagate);
                }
            );
        }
    },
    //get(path)
    //path - Array contienendo una ruta en el arbol
    //Devuelve el nodo en path o undefined
    get: function (path) {
        if (path && typeof path === "string") {
            path = path.split('/');
        }

        if (!path || path.length === 0) {
            return this;
        }

        var next = path.shift();
        if (!this.subnodes.hasOwnProperty(next)) {
            return undefined;
        } else {
            return this.subnodes[next].get(path);
        }
    },
    list: function () {
        return _.keys(this.subnodes);
    },
    tree: function () {
        var ret = {};
        _.each(this.subnodes, function (subnode, subnode_name) {
            ret[subnode_name] = subnode.tree();
        });
        return ret;
    },
    //addComponent(component)
    //component - instancia de Component
    //Añade un componente
    addComponent: function (component) {
        if(!this.enabled)
            throw 'Este nodo no esta inicializado';

        component.prepare(this);
        for(var i=0, len=this.components.length; i<len; ++i) {
            if(!this.components[i]) {
                this.components[i] = component;
                return i + 1;
            }
        }
        return this.components.push(component);
    },
    //deleteComponent(ref)
    //Borra el componente número ref
    deleteComponent: function (ref) {
        if(this.components[ref - 1]) {
            this.components[ref - 1].destroy();
            return delete this.components[ref - 1];
        } else {
            throw 'ref no es una referencia valida';
        }
    },
    //appendChild(subnode)
    //subnode - Instancia de Node
    //Añade un subnodo
    appendChild: function (subnode) {
        subnode.setUpTransform(this.transform);
        subnode.parent = this;
        this.subnodes[subnode.node_name] = subnode;
        subnode.rebuildTransform();
    },
    //deleteChild(node_name)
    //Borra el subnode de nombre node_name
    deleteChild: function (node_name) {
        if(this.subnodes[node_name]) {
            var subnode = this.subnodes[node_name];
            delete this.subnodes[node_name];
            subnode.destroy();
        } else {
            throw 'node_name no alude a ningun subnodo';
        }
    },
    //destroy()
    //Destruye este nodo y sus subnodos
    destroy: function () {
        if(!this.parent || !this.parent.deleteChild(this.node_name)) {
            _.each(this.components, function (component) {
                if(component.load) {
                    component.destroy();
                }
            });

            _.each(this.subnodes, function (subnode, subnode_name) {
                this.deleteChild(subnode_name);
            });

            this.parent = undefined;
            this.subnodes = undefined;
            this.components = undefined;
            this.services = undefined;
        }
    },
    //addService(servicename, service)
    //Añade service ofreciendo servicename
    addService: function (servicename, service) {
        this.services[servicename] = service;
    },
    //getService(servicename)
    //Devuelve el servicio servicename
    getService: function (servicename) {
        if(this.services.hasOwnProperty(servicename)) {
            return this.services[servicename];
        }

        if(this.parent) {
            return this.parent.getService(servicename);
        } else {
            return undefined;
        }
    },
    setUpTransform: function(transform) {
        this.up_transform = transform;
        this.transform = Transform.Combine(this.up_transform, this.local_transform);

        _.each(this.subnodes, function (subnode) {
            subnode.setUpTransform(this.transform);
        }, this);
    },
    rebuildTransform: function () {
        this.transform = Transform.Combine(this.up_transform, this.local_transform);

        _.each(this.subnodes, function (subnode) {
            subnode.setUpTransform(this.transform);
        }, this);
    },
    translate: function (x, y, z) {
        this.local_transform.x += x || 0;
        this.local_transform.y += y || 0;
        this.local_transform.z += z || 0;

        this.rebuildTransform();
    },
    rotate: function (angle) {
        this.local_transform.rotation += angle;

        this.rebuildTransform();
    },
    moveTo: function (x, y, z) {
        var rx = x - this.transform.x || 0,
            ry = y - this.transform.y || 0,
            rz = z - this.transform.z || 0;
        
        this.translate(rx, ry, rz);
    },
    setRotation: function (angle) {
        var rangle = angle - this.transform.rotation;

        this.rotate(rangle);
    },
    load: function () {
        _.each(this.subnodes, function (subnode){
                subnode.load();
            }
        );

        _.each(this.components, function (component) {
            component.load();
        });
    },
    unload: function () {
        _.each(this.subnodes, function (subnode) {
                subnode.unload();
            }
        );

        _.each(this.components, function (component) {
            component.unload();
        });
    },
    draw: function (layer_mask) {
        if(!this.enabled)
            return [];

        var draw_list = [];

        if((layer_mask>>this.layer) % 2) {
            _.each(this.components, function (component) {
                if (component.draw) {
                    draw_list.push({
                        gameobject: this.node_name,
                        transform: this.transform,
                        draw: component.draw.bind(component)
                    });
                    //component.draw();
                }
            }, this);
        }

        _.each(this.subnodes, function (subnode) {
            draw_list = draw_list.concat(subnode.draw(layer_mask));
        }, this);

        return draw_list;
    },
    update: function (dt) {
        if(!this.enabled)
            return;

        _.each(this.subnodes, function (subnode) {
            subnode.update(dt);
        }, this);

        _.each(this.components, function (component) {
            if (component.update) {
                if(!component.loaded)
                    component.load();

                component.update(dt);
            }
        });
        
        this.transform.fix();
    }
});

return function fnode_loader(args, callback) {
    var root = new FNode(args.name, args.enabled, args.layer, new Transform(args.transform));

    enviroment.moduleManager.use(args.components, function add_components_and_load_subnodes(components) {
        _.each(components, function add_subnode(component) {
            root.addComponent(component);
        });

        var subnodes = [];
        if(args.subnodes) {
            _.each(_.keys(args.subnodes), function prepare_subnode(subnode_name) {
                var subnode = args.subnodes[subnode_name];

                subnode.name = subnode_name;

                subnodes.push({
                    type: 'fnode',
                    args: subnode
                });
            });
        }

        enviroment.moduleManager.use(subnodes, function load_subnodes(subnodes) {
            _.each(subnodes, function add_subnode(subnode) {
                root.appendChild(subnode);
            });

            callback(root);
        });
    });
};
