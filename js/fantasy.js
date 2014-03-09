(function (){
    "use strict";

    function error(msg) {
        console.error('ERROR:'+msg);
        throw 'ERROR:'+msg;
    }

    function warning(msg) {
        console.warn('WARNING:'+msg);
    }
    
    var global_object = window || this;

    var fantasy;
    global_object.fantasy = fantasy = {};

    var debug = true;

    var canvasname, canvas, context;
    //canvas - Canvas HTML5 element
    //context - canvas.getContext('2d')

    var enviroment;

    var tick_interval = false;

    //getXMLHttpRequestObject()
    //Metodo multiplataforma para obtener un xhr

    function getXMLHttpRequestObject() {
        var ref = null;
        if (window.XMLHttpRequest) {
            ref = new XMLHttpRequest();
        } else if (window.ActiveXObject) { // Older IE.
            ref = new ActiveXObject("MSXML2.XMLHTTP.3.0");
        }
        return ref;
    }

    function async_download(url, callback) {
        var xhr = getXMLHttpRequestObject();
        xhr.addEventListener('readystatechange', function() {
            switch(xhr.readyState) {
                case 4:
                    if(xhr.status == 200) {
                        callback(null, xhr.responseText);
                    } else {
                        callback(xhr.status, xhr.responseText);
                    }
                    break;
            }
        });
        xhr.open('GET', url, true);
        xhr.send(null);
    }

    //moduleManager
    //Descarga dinamicamente mediante xhr el codigo necesitado para cada modulo
    //y sus dependencias. Automáticamente evalua ese código

    var moduleManager = (function moduleManager() {
        var modules = {};
        var subs = {};
        var base_directory = 'code/';

        function get(modulename) {
            var module = modules[modulename];
            if(module) {
                return module;
            } else {
                error('moduleManager:'+modulename+' not loaded');
            }
        }

        function set(modulename, module) {
            if(modules[modulename]) {
                warning('moduleManager:'+modulename+'being overwritten');
            }
            modules[modulename] = module;
        }

        function use(args, callback) {
            callback = callback || function(){};

            if(!args) {
                warn('moduleManager:use:No args');
                callback();
                return;
            }

            //Array-case
            if(typeof args === 'object' && Array.isArray(args)) {
                if(args.length > 0) {
                    var left = args.length;
                    var rets = [];

                    _.each(args, function(arg) {
                        use(arg, function wrapper(ret) {
                            rets[args] = ret;
                            if(!--left) {
                                callback.apply(callback, rets);
                            }
                        });
                    });
                } else {
                    warn('moduleManager:use:No args');
                    callback();
                }
                return;
            } else if(typeof args === 'string') {
                var modulename = args;
                if(modules[modulename]) {
                    return modules[modulename];
                }

                var filename = base_directory+modulename+'.js';
                async_download(filename, function (err, code){
                    if(err) {
                        error('moduleManager:Couldn\'t download '+filename);
                        return;
                    }

                    var f = new Function('set', 'use', 'get', 'enviroment', 'retrn', code);
                    var ret = f(set, use, get, enviroment, callback);
                });
            } else {
                error('moduleManager:args has unknown type');
                return;
            }
        }

        return {
            use: use,
            get: get,
            set: set
        };
    })();
    moduleManager.set('async_download', async_download);

    var Display = Class.extend({
        init: function (x, y, width, height, depth, handler) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.depth = depth;
            this.handler = handler;
            this.update_size();
        },
        update_size: function () {
            if(typeof this.x === 'string') {
                this.pixel_x = this.x.substring(0, this.x.length - 1) * canvas.width / 100;
            } else {
                this.pixel_x = this.x;
            }
            if(typeof this.y === 'string') {
                this.pixel_y = this.y.substring(0, this.y.length - 1) * canvas.height / 100;
            } else {
                this.pixel_y = this.y;
            }
            if(typeof this.width === 'string') {
                this.pixel_width = this.width.substring(0, this.width.length - 1) * canvas.width / 100;
            } else {
                this.pixel_width = this.width;
            }
            if(typeof this.height === 'string') {
                this.pixel_height = this.height.substring(0, this.height.length - 1) * canvas.height / 100;
            } else {
                this.pixel_height = this.height;
            }
            this.handler.resize(this.pixel_width, this.pixel_height);
        },
        draw: function () {
            var frame_buffer = this.handler.getFrameBuffer();
            enviroment.context.drawImage(frame_buffer, this.pixel_x, this.pixel_y, this.pixel_width, this.pixel_height);
        },
        onclick: function (event) {
            var at = {
                x: event.clientX - this.pixel_x,
                y: event.clientY - this.pixel_y
            };
            return this.handler.onclick(at);
        }
    });
    Display.displays = [];
    Display.Add = function display_add(x, y, width, height, depth, handler) {
        var disp = displays.push(new Display(x, y, width, height, depth, handler));
        Display.displays.sort(function depth_order(a, b) {
            if(a.depth < b.depth) {
                return 1;
            } else if(a.depth > b.depth) {
                return -1;
            } else {
                return 0;
            }
        });
        return disp;
    };
    Display.DrawAll = function display_draw_all() {
        _.each(Display.displays, function draw_display(d){
            d.draw();
        });
    };
    Display.UpdateSizeAll = function display_update_size_all() {
        _.each(Display.displays, function update_display_size(d) {
            d.update_size();
        });
    };
    window.addEventListener('resize', Display.UpdateSizeAll);
    Display.OnClick = function display_onclick(event) {
        var x = event.clientX,
            y = event.clientY;

        for(var i=Display.displays.length; i--;) {
            var display = Display.displays[i];
            if(display.pixel_x < x && x < (display.pixel_x + display.pixel_width) && display.pixel_y < y && y < (display.pixel_y + display.pixel_height)) {
                if(display.onclick(event))
                    break;
            }
        }
    };

    var Level = Class.extend({
        init: function(tree) {
            this.tree = tree;
        },
        load: function() {
            this.tree.load();
        },
        draw: function(layer_mask) {
            return this.tree.draw(layer_mask);
        },
        update: function(dt) {
            this.tree.update(dt);
        },
        start: function() {
            this.stop();

            enviroment.root = this.tree;
            enviroment.root.load();

            window.addEventListener('click', onclick.bind(this));

            Level.current = this;
            Level.last_t = Date.now();
            requestAnimationFrame(Level.tick);
            loaded = true;
        },
        stop: function() {
            loaded = false;
            if(Level.current === this) {
                Level.current = false;
                Level.current.unload();
            }
        }
    });
    Level.last_t = Date.now();
    Level.tick = function tick() {
        if(Level.current) {
            var t = Date.now();
            var dt = (t - last_t)/1000;
            last_t = t;

            Level.current.update(dt);
            enviroment.context.save();

            enviroment.context.fillStyle = "#000000";
            enviroment.context.fillRect(0, 0, canvas.width, canvas.height);

            Display.DrawAll();

            enviroment.context.restore();
            requestAnimationFrame(tick);
        }
    };
    Level.current = false;

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
        //Borraloader/ el subnode de nombre node_name
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

    fantasy.init = function (cnvname) {
        console.log('Initializing...');
        if (cnvname) {
            canvasname = cnvname;
            canvas = document.getElementById(canvasname);
        } else {
            canvas = document.createElement('canvas');
            canvas.id = 'canvas';
            canvasname = 'canvas';
            document.appendchild(canvas);
        }

        function resize_canvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        document.body.style.scroll = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.margin= '0px';
        document.body.style.padding = '0px';
        canvas.style.margin = '0px';
        canvas.style.padding = '0px';
        resize_canvas();
        window.addEventListener('resize', resize_canvas);

        context = canvas.getContext('2d');

        enviroment = {
            canvasname: cnvname,
            canvas: canvas,
            context: context,
            get_xhr: getXMLHttpRequestObject,
            async_download: async_download,
            moduleManager: moduleManager
        };
    };
    fantasy.load = function (levelfile, callback) {
        console.log('Loading level from ' + levelfile);
        async_download(levelfile, function (err,res) {
            if(err) {
                error('load:Couldn\'t load level');
                return;
            }
            var level = JSON.parse(res);

            enviroment.level = level;

            //TODO
            moduleManager.use('loader/level', function(level_loader) {
                var lvl = level_loader(level);
                callback(lvl);
            });
        });
    };
})();
